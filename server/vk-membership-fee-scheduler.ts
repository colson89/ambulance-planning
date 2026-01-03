import { db } from "./db";
import { vkMembershipFeeCycles, vkMembershipFeeInvitations, vkMembers } from "../shared/schema";
import { eq, and, sql, isNull, lte, gte } from "drizzle-orm";
import nodemailer from "nodemailer";

class VkMembershipFeeScheduler {
  private checkInterval: ReturnType<typeof setInterval> | null = null;
  private isRunning: boolean = false;
  private lastCheck: Date | null = null;

  constructor() {
    this.startScheduler();
  }

  startScheduler() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval as any);
    }
    
    this.checkInterval = setInterval(() => {
      this.runDailyCheck();
    }, 60 * 60 * 1000);
    
    setTimeout(() => {
      this.runDailyCheck();
    }, 60000);
    
    console.log('[VK] Membership fee reminder scheduler started - checking hourly');
  }

  async runDailyCheck() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.lastCheck = new Date();
    
    try {
      await this.checkAndSendReminders();
      await this.checkAndMarkOverdue();
    } catch (error) {
      console.error('[VK] Error in membership fee scheduler:', error);
    } finally {
      this.isRunning = false;
    }
  }

  async checkAndSendReminders() {
    const gmailUser = process.env.VK_GMAIL_USER;
    const gmailPassword = process.env.VK_GMAIL_APP_PASSWORD;
    
    if (!gmailUser || !gmailPassword) {
      return;
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: gmailUser,
        pass: gmailPassword,
      },
    });

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const activeCycles = await db
      .select()
      .from(vkMembershipFeeCycles)
      .where(eq(vkMembershipFeeCycles.isActive, true));

    for (const cycle of activeCycles) {
      const dueDate = new Date(cycle.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      
      const daysUntilDue = Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (daysUntilDue === 7) {
        await this.sendReminderBatch(cycle, transporter, 'oneWeek', gmailUser);
      } else if (daysUntilDue === 3) {
        await this.sendReminderBatch(cycle, transporter, 'threeDays', gmailUser);
      } else if (daysUntilDue === 1) {
        await this.sendReminderBatch(cycle, transporter, 'oneDay', gmailUser);
      }
    }
  }

  async sendReminderBatch(
    cycle: typeof vkMembershipFeeCycles.$inferSelect,
    transporter: nodemailer.Transporter,
    reminderType: 'oneWeek' | 'threeDays' | 'oneDay',
    gmailUser: string
  ) {
    const reminderField = {
      oneWeek: vkMembershipFeeInvitations.reminderOneWeekSentAt,
      threeDays: vkMembershipFeeInvitations.reminderThreeDaysSentAt,
      oneDay: vkMembershipFeeInvitations.reminderOneDaySentAt,
    }[reminderType];

    const reminderLabels = {
      oneWeek: 'nog 1 week',
      threeDays: 'nog 3 dagen',
      oneDay: 'morgen',
    };

    const pendingInvitations = await db
      .select({
        invitation: vkMembershipFeeInvitations,
        member: vkMembers,
      })
      .from(vkMembershipFeeInvitations)
      .leftJoin(vkMembers, eq(vkMembershipFeeInvitations.memberId, vkMembers.id))
      .where(and(
        eq(vkMembershipFeeInvitations.cycleId, cycle.id),
        eq(vkMembershipFeeInvitations.status, "pending"),
        isNull(reminderField)
      ));

    let sentCount = 0;

    for (const { invitation, member } of pendingInvitations) {
      if (!member) continue;

      try {
        const baseUrl = process.env.REPL_SLUG 
          ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`
          : 'https://localhost:5000';
        const paymentUrl = `${baseUrl}/VriendenkringMol/lidgeld/${invitation.token}`;
        const dueDateFormatted = new Date(cycle.dueDate).toLocaleDateString("nl-BE");
        const amountFormatted = `€${(invitation.amountDueCents / 100).toFixed(2)}`;

        const htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background-color: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; }
              .button { display: inline-block; background-color: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
              .amount { font-size: 24px; font-weight: bold; color: #2563eb; }
              .deadline { color: #dc2626; font-weight: bold; }
              .warning { background-color: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 8px; margin: 15px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Herinnering Lidgeld</h1>
              </div>
              <div class="content">
                <p>Beste ${member.firstName},</p>
                <div class="warning">
                  <strong>Let op:</strong> Je hebt ${reminderLabels[reminderType]} om je lidgeld te betalen!
                </div>
                <p>We hebben nog geen betaling ontvangen voor het ${cycle.label}. Gelieve zo snel mogelijk te betalen om een boete van €${(cycle.penaltyAmountCents / 100).toFixed(2)} te vermijden.</p>
                <p style="text-align: center;">
                  <span class="amount">${amountFormatted}</span><br>
                  <span class="deadline">Deadline: ${dueDateFormatted}</span>
                </p>
                <p style="text-align: center;">
                  <a href="${paymentUrl}" class="button">Nu betalen</a>
                </p>
              </div>
            </div>
          </body>
          </html>
        `;

        await transporter.sendMail({
          from: `"Vriendenkring Brandweer Mol" <${gmailUser}>`,
          to: member.email,
          subject: `Herinnering: ${cycle.label} - ${reminderLabels[reminderType]}`,
          html: htmlContent,
        });

        const updateData: Record<string, Date> = { updatedAt: new Date() };
        if (reminderType === 'oneWeek') {
          updateData.reminderOneWeekSentAt = new Date();
        } else if (reminderType === 'threeDays') {
          updateData.reminderThreeDaysSentAt = new Date();
        } else if (reminderType === 'oneDay') {
          updateData.reminderOneDaySentAt = new Date();
        }

        await db
          .update(vkMembershipFeeInvitations)
          .set(updateData as any)
          .where(eq(vkMembershipFeeInvitations.id, invitation.id));

        sentCount++;
      } catch (error) {
        console.error(`[VK] Failed to send reminder to ${member.email}:`, error);
      }
    }

    if (sentCount > 0) {
      console.log(`[VK] Sent ${sentCount} ${reminderType} reminders for cycle ${cycle.label}`);
    }
  }

  async checkAndMarkOverdue() {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const overdueCycles = await db
      .select()
      .from(vkMembershipFeeCycles)
      .where(and(
        eq(vkMembershipFeeCycles.isActive, true),
        lte(vkMembershipFeeCycles.dueDate, now.toISOString().split('T')[0])
      ));

    for (const cycle of overdueCycles) {
      const result = await db
        .update(vkMembershipFeeInvitations)
        .set({ 
          status: "overdue",
          amountDueCents: cycle.baseAmountCents + cycle.penaltyAmountCents,
          penaltyApplied: true,
          updatedAt: new Date()
        })
        .where(and(
          eq(vkMembershipFeeInvitations.cycleId, cycle.id),
          eq(vkMembershipFeeInvitations.status, "pending")
        ));
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      lastCheck: this.lastCheck,
    };
  }
}

export const vkMembershipFeeScheduler = new VkMembershipFeeScheduler();

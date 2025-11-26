import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  fromAddress: string;
  fromName: string;
}

interface EmailOptions {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType?: string;
  }>;
}

class EmailService {
  private transporter: Transporter | null = null;
  private config: EmailConfig | null = null;

  constructor() {
    this.initializeFromEnv();
  }

  private initializeFromEnv() {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587');
    const user = process.env.SMTP_USER;
    const password = process.env.SMTP_PASSWORD;
    const fromAddress = process.env.SMTP_FROM_ADDRESS || user;
    const fromName = process.env.SMTP_FROM_NAME || 'Planning BWZK';

    if (host && user && password) {
      this.config = {
        host,
        port,
        secure: port === 465,
        user,
        password,
        fromAddress: fromAddress || user,
        fromName
      };
      this.createTransporter();
    }
  }

  private createTransporter() {
    if (!this.config) return;

    this.transporter = nodemailer.createTransport({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      auth: {
        user: this.config.user,
        pass: this.config.password
      },
      tls: {
        rejectUnauthorized: false
      }
    });
  }

  isConfigured(): boolean {
    return this.transporter !== null && this.config !== null;
  }

  getConfigStatus(): { configured: boolean; host?: string; user?: string } {
    if (!this.config) {
      return { configured: false };
    }
    return {
      configured: true,
      host: this.config.host,
      user: this.config.user
    };
  }

  async verifyConnection(): Promise<{ success: boolean; error?: string }> {
    if (!this.transporter) {
      return { success: false, error: 'Email service is not configured' };
    }

    try {
      await this.transporter.verify();
      return { success: true };
    } catch (error: any) {
      console.error('SMTP verification failed:', error);
      return { success: false, error: error.message };
    }
  }

  async sendEmail(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.transporter || !this.config) {
      return { success: false, error: 'Email service is not configured' };
    }

    try {
      const recipients = Array.isArray(options.to) ? options.to.join(', ') : options.to;
      
      const mailOptions = {
        from: `"${this.config.fromName}" <${this.config.fromAddress}>`,
        to: recipients,
        subject: options.subject,
        text: options.text,
        html: options.html,
        attachments: options.attachments
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`Email sent successfully to ${recipients}, messageId: ${result.messageId}`);
      return { success: true, messageId: result.messageId };
    } catch (error: any) {
      console.error('Failed to send email:', error);
      return { success: false, error: error.message };
    }
  }

  async sendTestEmail(toAddress: string): Promise<{ success: boolean; error?: string }> {
    const result = await this.sendEmail({
      to: toAddress,
      subject: 'Test Email - Planning BWZK',
      text: 'Dit is een test email van het Planning BWZK systeem.\n\nAls u deze email ontvangt, is de SMTP configuratie correct ingesteld.',
      html: `
        <h2>Test Email - Planning BWZK</h2>
        <p>Dit is een test email van het Planning BWZK systeem.</p>
        <p>Als u deze email ontvangt, is de SMTP configuratie correct ingesteld.</p>
        <hr>
        <p style="color: #666; font-size: 12px;">Planning BWZK - Ambulance Shift Planning System</p>
      `
    });

    return result;
  }

  refreshConfig() {
    this.initializeFromEnv();
  }
}

export const emailService = new EmailService();

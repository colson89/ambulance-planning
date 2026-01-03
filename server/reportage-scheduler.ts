import { storage } from './storage';
import { emailService } from './email-service';
import ExcelJS from 'exceljs';
import { format, subMonths } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { nl } from 'date-fns/locale';

const BRUSSELS_TIMEZONE = 'Europe/Brussels';

interface SendResult {
  success: boolean;
  message: string;
  recipientCount?: number;
  error?: string;
}

class ReportageScheduler {
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
      this.checkAndSendReportage();
    }, 60 * 60 * 1000);
    
    setTimeout(() => {
      this.checkAndSendReportage();
    }, 30000);
    
    console.log('Reportage scheduler started - checking hourly');
  }

  async checkAndSendReportage() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.lastCheck = new Date();
    
    try {
      const config = await storage.getReportageConfig();
      
      if (!config || !config.enabled) {
        return;
      }
      
      if (!emailService.isConfigured()) {
        console.log('Reportage scheduler: Email not configured, skipping');
        return;
      }
      
      const now = new Date();
      const currentDay = now.getDate();
      const daysAfterMonthEnd = config.daysAfterMonthEnd;
      
      if (currentDay !== daysAfterMonthEnd) {
        return;
      }
      
      const previousMonth = subMonths(now, 1);
      const targetMonth = previousMonth.getMonth() + 1;
      const targetYear = previousMonth.getFullYear();
      
      if (config.lastSentMonth === targetMonth && config.lastSentYear === targetYear) {
        console.log(`Reportage for ${targetMonth}/${targetYear} already sent`);
        return;
      }
      
      console.log(`Sending reportage for ${targetMonth}/${targetYear}...`);
      await this.sendMonthlyReportage(targetMonth, targetYear);
      
    } catch (error) {
      console.error('Error in reportage scheduler:', error);
    } finally {
      this.isRunning = false;
    }
  }

  async sendMonthlyReportage(month: number, year: number): Promise<SendResult> {
    try {
      if (!emailService.isConfigured()) {
        return { success: false, message: 'Email service niet geconfigureerd' };
      }
      
      const recipients = await storage.getActiveReportageRecipients();
      
      if (recipients.length === 0) {
        return { success: false, message: 'Geen ontvangers geconfigureerd' };
      }
      
      const config = await storage.getReportageConfig();
      
      const excelBuffer = await this.generateExcelReport(month, year);
      
      const monthName = format(new Date(year, month - 1, 1), 'MMMM', { locale: nl });
      const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
      
      let subject = config?.emailSubject || 'Maandelijkse Shift Rapportage - {maand} {jaar}';
      subject = subject.replace('{maand}', capitalizedMonth).replace('{jaar}', year.toString());
      
      let body = config?.emailBody || 'Beste,\n\nIn bijlage vindt u de maandelijkse shift rapportage voor alle stations.\n\nMet vriendelijke groeten,\nPlanning BWZK';
      body = body.replace('{maand}', capitalizedMonth).replace('{jaar}', year.toString());
      
      const emailAddresses = recipients.map(r => r.email);
      
      const result = await emailService.sendEmail({
        to: emailAddresses,
        subject,
        text: body,
        html: `<p>${body.replace(/\n/g, '<br>')}</p>`,
        attachments: [{
          filename: `Shift_Rapportage_${capitalizedMonth}_${year}.xlsx`,
          content: excelBuffer,
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }]
      });
      
      if (result.success) {
        await storage.updateReportageLastSent(month, year);
        await storage.createReportageLog({
          month,
          year,
          recipientCount: recipients.length,
          status: 'success'
        });
        
        return { 
          success: true, 
          message: `Rapportage verstuurd naar ${recipients.length} ontvanger(s)`,
          recipientCount: recipients.length
        };
      } else {
        await storage.createReportageLog({
          month,
          year,
          recipientCount: recipients.length,
          status: 'failed',
          errorMessage: result.error
        });
        
        return { success: false, message: 'Versturen mislukt', error: result.error };
      }
      
    } catch (error: any) {
      console.error('Error sending monthly reportage:', error);
      
      await storage.createReportageLog({
        month,
        year,
        recipientCount: 0,
        status: 'failed',
        errorMessage: error.message
      });
      
      return { success: false, message: 'Er is een fout opgetreden', error: error.message };
    }
  }

  async generateExcelReport(month: number, year: number): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Planning BWZK';
    workbook.created = new Date();
    
    const stations = await storage.getAllStations();
    const shifts = await storage.getShiftsByMonth(month, year);
    const allUsers = await storage.getAllUsers();
    const allOvertime = await storage.getAllOvertimeByMonth(month, year);
    
    const summarySheet = workbook.addWorksheet('Samenvatting');
    
    summarySheet.columns = [
      { header: 'Station', key: 'station', width: 20 },
      { header: 'Totaal Shifts', key: 'totalShifts', width: 15 },
      { header: 'Dagdiensten', key: 'dayShifts', width: 15 },
      { header: 'Nachtdiensten', key: 'nightShifts', width: 15 },
      { header: 'Split Diensten', key: 'splitShifts', width: 15 },
      { header: 'Unieke Medewerkers', key: 'uniqueUsers', width: 20 },
      { header: 'Overuren (min)', key: 'overtimeMinutes', width: 15 },
      { header: 'Overuren (uur)', key: 'overtimeHours', width: 15 }
    ];
    
    summarySheet.getRow(1).font = { bold: true };
    summarySheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
    summarySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    
    for (const station of stations) {
      if (station.id === 8) continue;
      
      const stationShifts = shifts.filter(s => s.stationId === station.id);
      const dayShifts = stationShifts.filter(s => s.type === 'day');
      const nightShifts = stationShifts.filter(s => s.type === 'night');
      const splitShifts = stationShifts.filter(s => s.isSplitShift);
      const uniqueUserIds = new Set(stationShifts.map(s => s.userId));
      
      const stationOvertime = allOvertime.filter(o => o.stationId === station.id);
      const totalOvertimeMinutes = stationOvertime.reduce((sum, o) => sum + o.durationMinutes, 0);
      const totalOvertimeHours = (totalOvertimeMinutes / 60).toFixed(1);
      
      summarySheet.addRow({
        station: station.displayName,
        totalShifts: stationShifts.length,
        dayShifts: dayShifts.length,
        nightShifts: nightShifts.length,
        splitShifts: splitShifts.length,
        uniqueUsers: uniqueUserIds.size,
        overtimeMinutes: totalOvertimeMinutes,
        overtimeHours: totalOvertimeHours
      });
    }
    
    for (const station of stations) {
      if (station.id === 8) continue;
      
      const sheet = workbook.addWorksheet(station.displayName.substring(0, 31));
      
      sheet.columns = [
        { header: 'Datum', key: 'date', width: 15 },
        { header: 'Medewerker', key: 'user', width: 25 },
        { header: 'Type', key: 'type', width: 12 },
        { header: 'Start', key: 'start', width: 10 },
        { header: 'Einde', key: 'end', width: 10 },
        { header: 'Split', key: 'split', width: 8 },
        { header: 'Status', key: 'status', width: 12 },
        { header: 'Noodinplanning', key: 'emergency', width: 15 },
        { header: 'Nood Reden', key: 'emergencyReason', width: 40 }
      ];
      
      sheet.getRow(1).font = { bold: true };
      sheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' }
      };
      sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      
      const stationShifts = shifts.filter(s => s.stationId === station.id)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      for (const shift of stationShifts) {
        const user = allUsers.find(u => u.id === shift.userId);
        
        const row = sheet.addRow({
          date: format(new Date(shift.date), 'dd-MM-yyyy'),
          user: user ? `${user.firstName} ${user.lastName}` : 'Onbekend',
          type: shift.type === 'day' ? 'Dag' : 'Nacht',
          start: formatInTimeZone(new Date(shift.startTime), BRUSSELS_TIMEZONE, 'HH:mm'),
          end: formatInTimeZone(new Date(shift.endTime), BRUSSELS_TIMEZONE, 'HH:mm'),
          split: shift.isSplitShift ? 'Ja' : 'Nee',
          status: shift.status === 'planned' ? 'Gepland' : 'Open',
          emergency: shift.isEmergencyScheduling ? 'Ja' : 'Nee',
          emergencyReason: shift.emergencyReason || ''
        });
        
        // Highlight emergency scheduling rows with red background
        if (shift.isEmergencyScheduling) {
          row.eachCell((cell) => {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFFFC7CE' } // Light red background
            };
            cell.font = {
              color: { argb: 'FF9C0006' } // Dark red text
            };
          });
        }
      }
    }
    
    if (allOvertime.length > 0) {
      const overtimeSheet = workbook.addWorksheet('Overuren');
      
      overtimeSheet.columns = [
        { header: 'Datum', key: 'date', width: 15 },
        { header: 'Station', key: 'station', width: 20 },
        { header: 'Medewerker', key: 'user', width: 25 },
        { header: 'Starttijd', key: 'startTime', width: 12 },
        { header: 'Duur (min)', key: 'duration', width: 12 },
        { header: 'Duur (uur)', key: 'durationHours', width: 12 },
        { header: 'Reden', key: 'reason', width: 40 }
      ];
      
      overtimeSheet.getRow(1).font = { bold: true };
      overtimeSheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF70AD47' }
      };
      overtimeSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      
      const sortedOvertime = allOvertime.sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      
      for (const overtime of sortedOvertime) {
        const user = allUsers.find(u => u.id === overtime.userId);
        const station = stations.find(s => s.id === overtime.stationId);
        
        overtimeSheet.addRow({
          date: format(new Date(overtime.date), 'dd-MM-yyyy'),
          station: station?.displayName || 'Onbekend',
          user: user ? `${user.firstName} ${user.lastName}` : 'Onbekend',
          startTime: formatInTimeZone(new Date(overtime.startTime), BRUSSELS_TIMEZONE, 'HH:mm'),
          duration: overtime.durationMinutes,
          durationHours: (overtime.durationMinutes / 60).toFixed(1),
          reason: overtime.reason
        });
      }
      
      const totalMinutes = allOvertime.reduce((sum, o) => sum + o.durationMinutes, 0);
      overtimeSheet.addRow({});
      overtimeSheet.addRow({
        date: 'TOTAAL',
        station: '',
        user: '',
        startTime: '',
        duration: totalMinutes,
        durationHours: (totalMinutes / 60).toFixed(1),
        reason: ''
      });
      
      const lastRow = overtimeSheet.lastRow;
      if (lastRow) {
        lastRow.font = { bold: true };
      }
    }
    
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  getStatus() {
    return {
      running: this.checkInterval !== null,
      lastCheck: this.lastCheck,
      emailConfigured: emailService.isConfigured()
    };
  }

  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval as any);
      this.checkInterval = null;
    }
  }
}

export const reportageScheduler = new ReportageScheduler();

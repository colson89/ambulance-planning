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

interface SmtpDbConfig {
  smtpHost: string | null;
  smtpPort: number | null;
  smtpUser: string | null;
  smtpPassword: string | null;
  smtpFromAddress: string | null;
  smtpFromName: string | null;
  smtpSecure: boolean | null;
}

class EmailService {
  private transporter: Transporter | null = null;
  private config: EmailConfig | null = null;

  constructor() {
  }

  configureFromDatabase(dbConfig: SmtpDbConfig): boolean {
    const host = dbConfig.smtpHost;
    const port = dbConfig.smtpPort || 587;
    const user = dbConfig.smtpUser;
    const password = dbConfig.smtpPassword;
    const fromAddress = dbConfig.smtpFromAddress || user;
    const fromName = dbConfig.smtpFromName || 'Planning BWZK';
    const secure = dbConfig.smtpSecure ?? (port === 465);

    if (host && user && password) {
      this.config = {
        host,
        port,
        secure,
        user,
        password,
        fromAddress: fromAddress || user,
        fromName
      };
      this.createTransporter();
      return true;
    }
    
    this.config = null;
    this.transporter = null;
    return false;
  }

  private createTransporter() {
    if (!this.config) return;

    const isPort587 = this.config.port === 587;
    const isPort465 = this.config.port === 465;
    
    this.transporter = nodemailer.createTransport({
      host: this.config.host,
      port: this.config.port,
      secure: isPort465,
      requireTLS: isPort587,
      auth: {
        user: this.config.user,
        pass: this.config.password
      },
      tls: {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: false,
        ciphers: 'SSLv3'
      },
      connectionTimeout: 30000,
      greetingTimeout: 30000,
      socketTimeout: 60000
    });
  }

  isConfigured(): boolean {
    return this.transporter !== null && this.config !== null;
  }

  getConfigStatus(): { configured: boolean; host?: string; user?: string; fromAddress?: string; fromName?: string; port?: number; secure?: boolean } {
    if (!this.config) {
      return { configured: false };
    }
    return {
      configured: true,
      host: this.config.host,
      user: this.config.user,
      fromAddress: this.config.fromAddress,
      fromName: this.config.fromName,
      port: this.config.port,
      secure: this.config.secure
    };
  }

  async verifyConnection(): Promise<{ success: boolean; error?: string }> {
    if (!this.transporter) {
      return { success: false, error: 'Email service is niet geconfigureerd. Configureer eerst de SMTP instellingen.' };
    }

    try {
      await this.transporter.verify();
      return { success: true };
    } catch (error: any) {
      console.error('SMTP verification failed:', error);
      
      let friendlyError = error.message;
      
      if (error.code === 'ETIMEDOUT') {
        friendlyError = `Verbinding timeout naar ${this.config?.host}:${this.config?.port}. Controleer of de firewall uitgaande verbindingen toestaat.`;
      } else if (error.code === 'ECONNRESET') {
        friendlyError = `Verbinding afgesloten door server. Controleer of de poort (${this.config?.port}) en TLS instellingen correct zijn.`;
      } else if (error.code === 'ECONNREFUSED') {
        friendlyError = `Verbinding geweigerd door ${this.config?.host}:${this.config?.port}. Controleer of de server en poort correct zijn.`;
      } else if (error.code === 'EAUTH' || error.responseCode === 535) {
        friendlyError = 'Authenticatie mislukt. Controleer gebruikersnaam en wachtwoord. Voor Office 365 kan een App-wachtwoord nodig zijn.';
      } else if (error.code === 'ESOCKET') {
        friendlyError = `Socket error naar ${this.config?.host}. Mogelijk een TLS/SSL probleem.`;
      }
      
      return { success: false, error: friendlyError };
    }
  }

  async sendEmail(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.transporter || !this.config) {
      return { success: false, error: 'Email service is niet geconfigureerd. Configureer eerst de SMTP instellingen.' };
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
}

export const emailService = new EmailService();

import nodemailer, { type Transporter } from 'nodemailer';
import type { Mailer, OutgoingEmail } from './mailer.js';

export class SmtpMailer implements Mailer {
  readonly driver = 'smtp';
  private readonly transporter: Transporter;

  constructor(
    config: { host: string; port: number; user: string; password: string },
    private readonly from: string,
  ) {
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465,
      auth: { user: config.user, pass: config.password },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
      pool: true,
      maxConnections: 2,
    });
  }

  async send(email: OutgoingEmail): Promise<void> {
    await this.transporter.sendMail({ from: this.from, ...email });
  }
}

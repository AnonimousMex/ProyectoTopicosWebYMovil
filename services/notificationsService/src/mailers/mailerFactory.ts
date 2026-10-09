import { env } from '../config/env.js';
import { logger } from '../lib/infrastructure.js';
import type { Mailer, OutgoingEmail } from './mailer.js';
import { RelayMailer } from './relayMailer.js';
import { SmtpMailer } from './smtpMailer.js';

class ConsoleMailer implements Mailer {
  readonly driver = 'console';
  async send(email: OutgoingEmail): Promise<void> {
    logger.info({ to: email.to, subject: email.subject }, `[correo simulado]\n${email.text}`);
  }
}

/** Factory: elige el adaptador según configuración y degrada a consola si falta algo. */
export function createMailer(): Mailer {
  const { mail } = env;
  const from = `${mail.fromName} <${mail.fromAddress}>`;

  if (mail.driver === 'smtp' && mail.smtpHost && mail.smtpUser && mail.smtpPassword) {
    return new SmtpMailer(
      { host: mail.smtpHost, port: mail.smtpPort, user: mail.smtpUser, password: mail.smtpPassword },
      from,
    );
  }
  if (mail.driver === 'relay' && mail.relayUrl) {
    return new RelayMailer(mail.relayUrl, mail.relaySecret, mail.fromName);
  }
  if (mail.driver !== 'console') {
    logger.warn(`MAIL_DRIVER=${mail.driver} sin credenciales completas; los correos se mostrarán en consola`);
  }
  return new ConsoleMailer();
}

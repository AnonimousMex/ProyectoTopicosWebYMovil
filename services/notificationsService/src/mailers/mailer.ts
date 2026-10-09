export interface OutgoingEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Puerto de salida para correo (Adapter). El resto del servicio no sabe si
 * el correo sale por SMTP de Gmail, por el relay HTTPS de Apps Script o a la
 * consola: se cambia con MAIL_DRIVER sin tocar plantillas ni suscriptores.
 */
export interface Mailer {
  readonly driver: string;
  send(email: OutgoingEmail): Promise<void>;
}

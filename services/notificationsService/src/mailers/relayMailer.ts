import type { Mailer, OutgoingEmail } from './mailer.js';

/** Envía por HTTPS a un Google Apps Script que reenvía desde appprueba695@gmail.com. */
export class RelayMailer implements Mailer {
  readonly driver = 'relay';

  constructor(
    private readonly url: string,
    private readonly secret: string,
    private readonly fromName: string,
  ) {}

  async send(email: OutgoingEmail): Promise<void> {
    const response = await fetch(this.url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ secret: this.secret, to: email.to, subject: email.subject, html: email.html, name: this.fromName }),
      redirect: 'follow',
      signal: AbortSignal.timeout(15_000),
    });
    const text = await response.text();
    let data: { ok?: boolean; error?: string };
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`El relay respondió algo inesperado (${response.status})`);
    }
    if (!data.ok) throw new Error(data.error ?? 'El relay rechazó el correo');
  }
}

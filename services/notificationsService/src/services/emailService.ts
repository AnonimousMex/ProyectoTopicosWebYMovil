import { env } from '../config/env.js';
import { logger, prisma } from '../lib/infrastructure.js';
import { createMailer } from '../mailers/mailerFactory.js';
import { renderEmail } from '../templates/emailTemplates.js';
import type { EmailLog } from '../generated/prisma/index.js';

const mailer = createMailer();
logger.info(`Correo saliente vía: ${mailer.driver}`);

export interface EmailRequest {
  to: string;
  template: string;
  data: Record<string, unknown>;
  eventId?: string;
  folio?: string | null;
}

const backoffMs = (attempt: number) => Math.min(30_000 * 2 ** (attempt - 1), 15 * 60_000);

async function deliver(log: EmailLog): Promise<EmailLog> {
  const rendered = renderEmail(log.template, log.data as Record<string, unknown>);
  try {
    await mailer.send({ to: log.to, subject: rendered.subject, html: rendered.html, text: rendered.text });
    return prisma.emailLog.update({
      where: { id: log.id },
      data: { status: 'ENVIADO', sentAt: new Date(), attempts: { increment: 1 }, lastError: null, driver: mailer.driver },
    });
  } catch (error) {
    const attempts = log.attempts + 1;
    logger.warn({ err: error, to: log.to, intento: attempts }, 'Falló el envío de correo; se reintentará');
    return prisma.emailLog.update({
      where: { id: log.id },
      data: {
        status: 'FALLIDO',
        attempts,
        lastError: String((error as Error).message).slice(0, 400),
        nextRetryAt: attempts < env.maxEmailAttempts ? new Date(Date.now() + backoffMs(attempts)) : null,
        driver: mailer.driver,
      },
    });
  }
}

export const emailService = {
  driver: mailer.driver,

  /** Envía en segundo plano un correo ya registrado en la cola. */
  dispatch(log: EmailLog): void {
    void deliver(log);
  },

  subjectFor: (template: string, data: Record<string, unknown>) => renderEmail(template, data).subject,

  /** Registra el correo en la cola y lo intenta enviar sin bloquear al llamador. */
  async enqueue(request: EmailRequest): Promise<EmailLog> {
    const subject = renderEmail(request.template, request.data).subject;
    const log = await prisma.emailLog.create({
      data: {
        to: request.to,
        subject,
        template: request.template,
        data: request.data as object,
        eventId: request.eventId,
        folio: request.folio ?? undefined,
      },
    });
    void deliver(log);
    return log;
  },

  /** Envío inmediato (códigos de verificación): el llamador quiere saber si salió. */
  async sendNow(request: EmailRequest): Promise<EmailLog> {
    const subject = renderEmail(request.template, request.data).subject;
    const log = await prisma.emailLog.create({
      data: { to: request.to, subject, template: request.template, data: request.data as object },
    });
    return deliver(log);
  },

  async retry(id: string): Promise<EmailLog | null> {
    const log = await prisma.emailLog.findUnique({ where: { id } });
    if (!log || log.status === 'ENVIADO') return log;
    return deliver(log);
  },

  /** Worker de reintentos con backoff exponencial. */
  startRetryWorker(): () => void {
    const timer = setInterval(async () => {
      try {
        const due = await prisma.emailLog.findMany({
          where: { status: 'FALLIDO', nextRetryAt: { lte: new Date() } },
          take: 10,
        });
        for (const log of due) await deliver(log);
      } catch (error) {
        logger.error({ err: error }, 'Error en el worker de reintentos de correo');
      }
    }, 15_000);
    return () => clearInterval(timer);
  },

  list: (filters: { status?: 'PENDIENTE' | 'ENVIADO' | 'FALLIDO' }) =>
    prisma.emailLog.findMany({
      where: { status: filters.status },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        to: true,
        subject: true,
        template: true,
        status: true,
        attempts: true,
        lastError: true,
        sentAt: true,
        driver: true,
        folio: true,
        createdAt: true,
      },
    }),
};

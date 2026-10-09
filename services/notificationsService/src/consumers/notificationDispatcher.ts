import type { DomainEvent, EventHandler } from '@rumbo/shared';
import { channels, logger, prisma, realtime } from '../lib/infrastructure.js';
import { emailService } from '../services/emailService.js';
import { adminSubscriber } from '../subscribers/adminSubscriber.js';
import { clienteSubscriber } from '../subscribers/clienteSubscriber.js';
import { repartidorSubscriber } from '../subscribers/repartidorSubscriber.js';
import type { Notice, NotificationSubscriber } from '../subscribers/subscriberTypes.js';

const CONSUMER = 'notificaciones';

/** Lista de interesados. Agregar uno nuevo es agregarlo aquí. */
const subscribers: NotificationSubscriber[] = [clienteSubscriber, repartidorSubscriber, adminSubscriber];

async function dispatch(event: DomainEvent): Promise<void> {
  const notices: Notice[] = [];
  for (const subscriber of subscribers) {
    const build = subscriber.handlers[event.type];
    if (build) notices.push(...(await build(event)));
  }
  if (notices.length === 0) return;

  // Idempotencia + persistencia atómica: si el evento llega dos veces, no se duplica nada.
  const saved = await prisma.$transaction(async (tx) => {
    const already = await tx.processedEvent.findUnique({
      where: { eventId_consumer: { eventId: event.id, consumer: CONSUMER } },
    });
    if (already) return null;
    await tx.processedEvent.create({ data: { eventId: event.id, consumer: CONSUMER } });

    const notifications = [];
    const emails = [];
    for (const notice of notices) {
      if (notice.inApp) {
        notifications.push(
          await tx.notification.create({
            data: {
              audience: notice.inApp.userId ? 'USUARIO' : 'ADMINS',
              userId: notice.inApp.userId,
              titulo: notice.inApp.titulo,
              mensaje: notice.inApp.mensaje,
              tipo: notice.inApp.tipo,
              folio: notice.inApp.folio ?? null,
            },
          }),
        );
      }
      if (notice.email) {
        emails.push(
          await tx.emailLog.create({
            data: {
              to: notice.email.to,
              template: notice.email.template,
              subject: emailService.subjectFor(notice.email.template, notice.email.data),
              data: notice.email.data as object,
              eventId: event.id,
              folio: notice.email.folio ?? null,
            },
          }),
        );
      }
    }
    return { notifications, emails };
  });

  if (!saved) return;

  // Después del commit: tiempo real y correo. Si el correo falla, queda en
  // cola para reintento; el pedido y la notificación ya existen.
  for (const notification of saved.notifications) {
    await realtime.publish(notification.userId ? channels.user(notification.userId) : channels.admins, notification);
  }
  saved.emails.forEach((log) => emailService.dispatch(log));
  logger.debug({ evento: event.type, avisos: saved.notifications.length, correos: saved.emails.length }, 'Avisos enviados');
}

export function buildEventHandlers(): Record<string, EventHandler> {
  const types = new Set(subscribers.flatMap((subscriber) => Object.keys(subscriber.handlers)));
  return Object.fromEntries([...types].map((type) => [type, dispatch]));
}

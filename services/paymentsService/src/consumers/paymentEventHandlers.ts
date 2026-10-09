import { EventTypes, type DomainEvent, type EventHandler, type PedidoEstadoCambiadoPayload } from '@rumbo/shared';
import { prisma } from '../lib/infrastructure.js';
import { paymentService } from '../services/paymentService.js';

const CONSUMER = 'pagos';

export const paymentEventHandlers: Record<string, EventHandler<any>> = {
  /** Si se cancela un pedido ya pagado, se reembolsa automáticamente. */
  [EventTypes.PEDIDO_ESTADO_CAMBIADO]: async (event: DomainEvent<PedidoEstadoCambiadoPayload>) => {
    if (event.payload.nuevo !== 'CANCELADO') return;
    await prisma.$transaction(async (tx) => {
      const done = await tx.processedEvent.findUnique({
        where: { eventId_consumer: { eventId: event.id, consumer: CONSUMER } },
      });
      if (done) return;
      await paymentService.refundForCancelledOrder(event.payload.pedido, tx);
      await tx.processedEvent.create({ data: { eventId: event.id, consumer: CONSUMER } });
    });
  },
};

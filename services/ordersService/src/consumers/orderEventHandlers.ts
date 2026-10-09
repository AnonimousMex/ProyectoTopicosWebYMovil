import {
  EventTypes,
  type DomainEvent,
  type EnvioAsignadoPayload,
  type EventHandler,
  type PagoAcreditadoPayload,
} from '@rumbo/shared';
import { logger, prisma } from '../lib/infrastructure.js';
import { applyStatusChange } from '../services/orderService.js';

const CONSUMER = 'pedidos';
const SYSTEM = { id: 'sistema', rol: 'SERVICE' as const };

/** Ejecuta una sola vez por evento: la marca de procesado va en la misma transacción. */
async function once(event: DomainEvent, work: (tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]) => Promise<void>) {
  await prisma.$transaction(async (tx) => {
    const done = await tx.processedEvent.findUnique({
      where: { eventId_consumer: { eventId: event.id, consumer: CONSUMER } },
    });
    if (done) return;
    await work(tx);
    await tx.processedEvent.create({ data: { eventId: event.id, consumer: CONSUMER } });
  });
}

export const orderEventHandlers: Record<string, EventHandler<any>> = {
  /** Pago acreditado → el pedido pasa a PAGADO (y entra al pool de despacho). */
  [EventTypes.PAGO_ACREDITADO]: async (event: DomainEvent<PagoAcreditadoPayload>) => {
    await once(event, async (tx) => {
      const order = await tx.order.findUnique({ where: { id: event.payload.orderId } });
      if (!order || order.status !== 'PENDIENTE_PAGO') return;
      await applyStatusChange(tx, order, { to: 'PAGADO', actor: SYSTEM, motivo: `Pago •••• ${event.payload.ultimos4}` });
    });
  },

  /** El algoritmo genético asignó repartidor → el pedido pasa a ASIGNADO. */
  [EventTypes.ENVIO_ASIGNADO]: async (event: DomainEvent<EnvioAsignadoPayload>) => {
    await once(event, async (tx) => {
      const order = await tx.order.findUnique({ where: { id: event.payload.orderId } });
      if (!order || order.status !== 'PAGADO') {
        logger.warn({ folio: event.payload.folio, status: order?.status }, 'Asignación ignorada: el pedido ya no está pagado');
        return;
      }
      await applyStatusChange(tx, order, {
        to: 'ASIGNADO',
        actor: SYSTEM,
        motivo: `Algoritmo genético → ${event.payload.repartidorNombre} (${event.payload.medioId})`,
        data: {
          repartidorId: event.payload.repartidorId,
          repartidorNombre: event.payload.repartidorNombre,
          medioId: event.payload.medioId,
          etaMinutos: event.payload.etaMinutos,
        },
      });
    });
  },
};

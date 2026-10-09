import {
  EventTypes,
  type DomainEvent,
  type EventHandler,
  type PedidoEstadoCambiadoPayload,
  type UsuarioRegistradoPayload,
} from '@rumbo/shared';
import { logger, prisma } from '../lib/infrastructure.js';
import { fleetService } from '../services/fleetService.js';

const CONSUMER = 'despacho';

/** Ejecuta el manejador una sola vez por evento (consumidor idempotente). */
async function once(event: DomainEvent, work: (tx: typeof prisma) => Promise<void>) {
  await prisma.$transaction(async (tx) => {
    const done = await tx.processedEvent.findUnique({
      where: { eventId_consumer: { eventId: event.id, consumer: CONSUMER } },
    });
    if (done) return;
    await work(tx as unknown as typeof prisma);
    await tx.processedEvent.create({ data: { eventId: event.id, consumer: CONSUMER } });
  });
}

async function onOrderStatusChanged(event: DomainEvent<PedidoEstadoCambiadoPayload>) {
  const { pedido, nuevo } = event.payload;

  await once(event, async (tx) => {
    switch (nuevo) {
      case 'PAGADO':
        // Entra al pool para que el algoritmo genético lo asigne.
        await tx.envio.upsert({
          where: { orderId: pedido.orderId },
          update: {},
          create: {
            orderId: pedido.orderId,
            folio: pedido.folio,
            clienteId: pedido.clienteId,
            origenDireccion: pedido.origen.direccion,
            origenLat: pedido.origen.lat,
            origenLng: pedido.origen.lng,
            destinoDireccion: pedido.destino.direccion,
            destinoLat: pedido.destino.lat,
            destinoLng: pedido.destino.lng,
            pesoKg: pedido.pesoKg,
            volumenL: pedido.volumenL,
            fragil: pedido.fragil,
            urgencia: pedido.urgencia,
            fechaLimite: new Date(pedido.fechaLimite),
            medioPreferido: pedido.medioPreferido,
            extras: pedido.extras,
            sugerenciaMedio: pedido.sugerencia?.medio ?? null,
            sugerenciaMotivo: pedido.sugerencia?.motivo ?? null,
            sugerenciaProveedor: pedido.sugerencia?.proveedor ?? null,
          },
        });
        break;
      case 'EN_CAMINO':
        await tx.envio.updateMany({ where: { orderId: pedido.orderId }, data: { status: 'EN_RUTA' } });
        break;
      case 'ENTREGADO': {
        const envio = await tx.envio.findUnique({ where: { orderId: pedido.orderId } });
        if (!envio) break;
        await tx.envio.update({ where: { id: envio.id }, data: { status: 'COMPLETADO', completedAt: new Date() } });
        if (envio.repartidorId) {
          await tx.repartidor.updateMany({
            where: { id: envio.repartidorId },
            data: { entregasCompletadas: { increment: 1 } },
          });
        }
        // Retroalimentación para la IA interna: ¿el medio cumplió la fecha límite?
        if (envio.medioId) {
          const aTiempo = new Date() <= envio.fechaLimite;
          await tx.medioDesempeno.upsert({
            where: { medioId: envio.medioId },
            create: { medioId: envio.medioId, entregas: 1, aTiempo: aTiempo ? 1 : 0, tardias: aTiempo ? 0 : 1 },
            update: {
              entregas: { increment: 1 },
              aTiempo: { increment: aTiempo ? 1 : 0 },
              tardias: { increment: aTiempo ? 0 : 1 },
            },
          });
        }
        break;
      }
      case 'CANCELADO':
      case 'FALLIDO':
        await tx.envio.updateMany({ where: { orderId: pedido.orderId }, data: { status: 'CANCELADO' } });
        break;
      default:
        break;
    }
  });
}

async function onUserRegistered(event: DomainEvent<UsuarioRegistradoPayload>) {
  if (event.payload.rol !== 'REPARTIDOR') return;
  await fleetService.ensureFromUser({ userId: event.payload.userId, nombre: event.payload.nombre, email: event.payload.email });
  logger.info({ userId: event.payload.userId }, 'Repartidor agregado a la flota');
}

export const dispatchEventHandlers: Record<string, EventHandler<any>> = {
  [EventTypes.PEDIDO_ESTADO_CAMBIADO]: onOrderStatusChanged,
  [EventTypes.USUARIO_REGISTRADO]: onUserRegistered,
};

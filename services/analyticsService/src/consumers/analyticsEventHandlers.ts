import {
  EventTypes,
  type AuditoriaPayload,
  type DomainEvent,
  type EventHandler,
  type OptimizacionCompletadaPayload,
  type PedidoCreadoPayload,
  type PedidoEstadoCambiadoPayload,
  type PedidoSnapshot,
} from '@rumbo/shared';
import { prisma } from '../lib/infrastructure.js';
import { Prisma } from '../generated/prisma/index.js';

/** Guarda el evento en el log; devuelve false si ya se había procesado (idempotencia). */
async function logEvent(event: DomainEvent<any>): Promise<boolean> {
  try {
    await prisma.eventLog.create({
      data: {
        id: event.id,
        type: event.type,
        source: event.source,
        folio: event.payload?.folio ?? event.payload?.pedido?.folio ?? null,
        payload: event.payload,
        occurredAt: new Date(event.occurredAt),
      },
    });
    return true;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return false;
    throw error;
  }
}

async function upsertFact(pedido: PedidoSnapshot, occurredAt: Date) {
  const base = {
    folio: pedido.folio,
    clienteId: pedido.clienteId,
    status: pedido.status,
    medioId: pedido.medioId ?? pedido.medioPreferido ?? pedido.sugerencia?.medio ?? null,
    urgencia: pedido.urgencia,
    total: pedido.total,
    distanciaKm: pedido.distanciaKm,
    fechaLimite: new Date(pedido.fechaLimite),
  };
  const timestamps: Prisma.OrderFactUpdateInput = {};
  if (pedido.status === 'PAGADO') timestamps.paidAt = occurredAt;
  if (pedido.status === 'ASIGNADO') timestamps.assignedAt = occurredAt;
  if (pedido.status === 'ENTREGADO') {
    const fact = await prisma.orderFact.findUnique({ where: { orderId: pedido.orderId } });
    timestamps.deliveredAt = occurredAt;
    timestamps.aTiempo = occurredAt <= new Date(pedido.fechaLimite);
    const desde = fact?.paidAt ?? new Date(pedido.createdAt);
    timestamps.minutosEntrega = Math.round((occurredAt.getTime() - desde.getTime()) / 60_000);
  }
  await prisma.orderFact.upsert({
    where: { orderId: pedido.orderId },
    create: { orderId: pedido.orderId, ...base, createdAt: new Date(pedido.createdAt), ...(timestamps as object) },
    update: { ...base, ...timestamps },
  });
}

const handlers: Record<string, (event: DomainEvent<any>) => Promise<void>> = {
  [EventTypes.PEDIDO_CREADO]: (event: DomainEvent<PedidoCreadoPayload>) =>
    upsertFact(event.payload.pedido, new Date(event.occurredAt)),
  [EventTypes.PEDIDO_ESTADO_CAMBIADO]: (event: DomainEvent<PedidoEstadoCambiadoPayload>) =>
    upsertFact(event.payload.pedido, new Date(event.occurredAt)),
  [EventTypes.OPTIMIZACION_COMPLETADA]: async (event: DomainEvent<OptimizacionCompletadaPayload>) => {
    await prisma.optimizationFact.upsert({
      where: { runId: event.payload.runId },
      create: {
        runId: event.payload.runId,
        tipo: event.payload.tipo,
        asignados: event.payload.asignados,
        costoTotal: event.payload.costoTotal,
        mejoraPct: event.payload.mejoraVsGreedyPct,
      },
      update: {},
    });
  },
};

/** Observer "estadísticas": escucha TODOS los eventos del sistema. */
export function buildAnalyticsHandlers(): Record<string, EventHandler> {
  const all: Record<string, EventHandler> = {};
  for (const type of Object.values(EventTypes)) {
    if (type === EventTypes.AUDITORIA_REGISTRADA) continue;
    all[type] = async (event) => {
      if (!(await logEvent(event))) return;
      await handlers[type]?.(event);
    };
  }
  // La bitácora va a su propia tabla (mucho volumen, no ensucia el log de negocio).
  all[EventTypes.AUDITORIA_REGISTRADA] = async (event: DomainEvent<any>) => {
    const audit = event.payload as AuditoriaPayload;
    await prisma.auditLog.create({
      data: {
        requestId: audit.requestId,
        userId: audit.userId,
        rol: audit.rol,
        metodo: audit.metodo,
        ruta: audit.ruta.slice(0, 300),
        status: audit.status,
        ip: audit.ip,
        userAgent: audit.userAgent?.slice(0, 250),
        duracionMs: audit.duracionMs,
        createdAt: new Date(event.occurredAt),
      },
    });
  };
  return all;
}

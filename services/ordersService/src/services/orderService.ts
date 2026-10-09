import {
  ConflictError,
  EventTypes,
  ValidationError,
  type AuthContext,
  type OrderStatus,
  type PedidoEstadoCambiadoPayload,
  type Role,
} from '@rumbo/shared';
import { stateOf } from '../domain/orderStates.js';
import { dispatchClient, prisma } from '../lib/infrastructure.js';
import { orderPresenters } from '../presenters/orderPresenters.js';
import { orderRepository } from '../repositories/orderRepository.js';
import type { CreateOrderInput } from '../schemas/orderSchemas.js';
import type { Order, Prisma } from '../generated/prisma/index.js';

type Tx = Prisma.TransactionClient;

interface QuoteOption {
  medioId: string;
  nombre: string;
  factible: boolean;
  motivos: string[];
  distanciaKm: number;
  minutos: number;
  precio: { lineas: unknown[]; subtotal: number; iva: number; total: number };
}

interface QuoteResponse {
  paquete: { volumenL: number };
  ruta: { distanciaKm: number; polilinea: [number, number][]; estimada: boolean };
  opciones: QuoteOption[];
  sugerencia: { medio: string; motivo: string; proveedor: string; confianza: number } | null;
}

async function nextFolio(tx: Tx): Promise<string> {
  const year = new Date().getFullYear();
  const counter = await tx.folioCounter.upsert({
    where: { year },
    create: { year, last: 1 },
    update: { last: { increment: 1 } },
  });
  return `RB-${year}-${String(counter.last).padStart(6, '0')}`;
}

export interface StatusChange {
  to: OrderStatus;
  actor: { id: string; rol: Role };
  motivo?: string | null;
  /** Datos extra a guardar en la misma transacción (p. ej. repartidor asignado). */
  data?: Prisma.OrderUpdateInput;
}

/**
 * Cambia el estado dentro de una transacción: valida con el patrón State,
 * guarda historial y deja el evento en el outbox. Nada de enviar correos aquí.
 */
export async function applyStatusChange(tx: Tx, order: Order, change: StatusChange): Promise<Order> {
  stateOf(order.status).assertTransition(change.to, change.actor.rol);
  const field = stateOf(change.to).timestampField;

  const updated = await tx.order.update({
    where: { id: order.id, status: order.status }, // bloqueo optimista: nadie cambió el estado en medio
    data: { ...change.data, status: change.to, ...(field ? { [field]: new Date() } : {}) },
  });
  await tx.orderStatusHistory.create({
    data: {
      orderId: order.id,
      from: order.status,
      to: change.to,
      actorId: change.actor.id,
      actorRol: change.actor.rol,
      motivo: change.motivo ?? null,
    },
  });
  const payload: PedidoEstadoCambiadoPayload = {
    pedido: orderPresenters.snapshot(updated),
    anterior: order.status,
    nuevo: change.to,
    actor: change.actor,
    motivo: change.motivo ?? null,
  };
  await tx.outboxEvent.create({ data: { type: EventTypes.PEDIDO_ESTADO_CAMBIADO, payload: payload as object } });
  return updated;
}

export const orderService = {
  async create(input: CreateOrderInput, auth: AuthContext, idempotencyKey?: string) {
    if (idempotencyKey) {
      const existing = await prisma.order.findUnique({ where: { idempotencyKey: `${auth.userId}:${idempotencyKey}` } });
      if (existing) return { order: existing, repetido: true };
    }

    // El precio NUNCA viene del navegador: se vuelve a cotizar en el servidor.
    const quote = await dispatchClient.post<QuoteResponse>('/internal/cotizar', {
      origen: input.origen,
      destino: input.destino,
      pesoKg: input.pesoKg,
      largoCm: input.largoCm,
      anchoCm: input.anchoCm,
      altoCm: input.altoCm,
      fragil: input.fragil,
      urgencia: input.urgencia,
      fechaLimite: input.fechaLimite,
      extras: input.extras,
      valorDeclarado: input.valorDeclarado,
    });

    const medioCotizado = input.medioPreferido ?? quote.sugerencia?.medio;
    const opcion = quote.opciones.find((item) => item.medioId === medioCotizado);
    if (!opcion) throw new ValidationError('El medio elegido no está disponible');
    if (!opcion.factible) throw new ValidationError(`No se puede enviar en ${opcion.nombre}: ${opcion.motivos.join(', ')}`);

    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          folio: await nextFolio(tx),
          idempotencyKey: idempotencyKey ? `${auth.userId}:${idempotencyKey}` : null,
          clienteId: auth.userId,
          clienteNombre: auth.name,
          clienteEmail: auth.email,
          origenDireccion: input.origen.direccion,
          origenLat: input.origen.lat,
          origenLng: input.origen.lng,
          origenLugarId: input.origen.lugarId ?? null,
          destinoDireccion: input.destino.direccion,
          destinoLat: input.destino.lat,
          destinoLng: input.destino.lng,
          destinoLugarId: input.destino.lugarId ?? null,
          destinatarioNombre: input.destinatarioNombre,
          destinatarioTelefono: input.destinatarioTelefono,
          pesoKg: input.pesoKg,
          largoCm: input.largoCm,
          anchoCm: input.anchoCm,
          altoCm: input.altoCm,
          volumenL: quote.paquete.volumenL,
          fragil: input.fragil,
          urgencia: input.urgencia,
          fechaLimite: new Date(input.fechaLimite),
          extras: input.extras,
          valorDeclarado: input.valorDeclarado,
          notas: input.notas,
          medioPreferido: input.medioPreferido,
          sugerenciaMedio: quote.sugerencia?.medio,
          sugerenciaMotivo: quote.sugerencia?.motivo,
          sugerenciaProveedor: quote.sugerencia?.proveedor,
          sugerenciaConfianza: quote.sugerencia?.confianza,
          distanciaKm: opcion.distanciaKm,
          minutosEstimados: opcion.minutos,
          polilinea: quote.ruta.polilinea,
          rutaEstimada: quote.ruta.estimada,
          precio: { medio: opcion.medioId, ...opcion.precio } as Prisma.InputJsonValue,
          total: opcion.precio.total,
        },
      });
      await tx.orderStatusHistory.create({
        data: { orderId: created.id, to: 'PENDIENTE_PAGO', actorId: auth.userId, actorRol: auth.role },
      });
      await tx.outboxEvent.create({
        data: { type: EventTypes.PEDIDO_CREADO, payload: { pedido: orderPresenters.snapshot(created) } as object },
      });
      return created;
    });
    return { order, repetido: false };
  },

  async changeStatus(folio: string, to: OrderStatus, auth: AuthContext, motivo?: string) {
    const order = await orderRepository.findByFolio(folio, auth);
    if (auth.role === 'REPARTIDOR' && order.repartidorId !== auth.userId) {
      throw new ConflictError('Este pedido no está en tu ruta', 'NO_ES_TU_ENTREGA');
    }
    return prisma.$transaction((tx) =>
      applyStatusChange(tx, order, { to, actor: { id: auth.userId, rol: auth.role }, motivo }),
    );
  },

  cancel(folio: string, auth: AuthContext, motivo?: string) {
    return this.changeStatus(folio, 'CANCELADO', auth, motivo ?? `Cancelado por ${auth.role.toLowerCase()}`);
  },
};

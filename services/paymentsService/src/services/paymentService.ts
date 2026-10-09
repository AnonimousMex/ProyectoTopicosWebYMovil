import { createHash } from 'node:crypto';
import {
  AppError,
  ConflictError,
  EventTypes,
  ForbiddenError,
  type AuthContext,
  type PagoAcreditadoPayload,
  type PagoRechazadoPayload,
  type PedidoSnapshot,
} from '@rumbo/shared';
import { SimulatedCardGateway, type PaymentGateway } from '../gateways/paymentGateway.js';
import { logger, ordersClient, prisma } from '../lib/infrastructure.js';
import type { ChargeInput } from '../schemas/paymentSchemas.js';
import { Prisma } from '../generated/prisma/index.js';

const gateway: PaymentGateway = new SimulatedCardGateway();

export interface ChargeResponse {
  status: number;
  body: Record<string, unknown>;
  replayed: boolean;
}

const publicPayment = (payment: { id: string; folio: string; monto: number; status: string; marca: string; ultimos4: string; createdAt: Date; motivoRechazo: string | null }) => ({
  id: payment.id,
  folio: payment.folio,
  monto: payment.monto,
  status: payment.status,
  marca: payment.marca,
  ultimos4: payment.ultimos4,
  motivoRechazo: payment.motivoRechazo,
  fecha: payment.createdAt,
});

/**
 * Cobro con idempotencia en dos capas:
 *  1) Idempotency-Key: el mismo clic repetido (o un reintento de red)
 *     devuelve la respuesta guardada, sin volver a cobrar.
 *  2) UNIQUE(acreditadoOrderId): aunque llegaran dos llaves distintas al
 *     mismo tiempo, la base de datos impide dos cargos acreditados.
 * El cobro NO envía correos ni crea el envío: deja un evento en el outbox.
 */
export const paymentService = {
  async charge(input: ChargeInput, auth: AuthContext, rawKey: string): Promise<ChargeResponse> {
    const key = `${auth.userId}:${rawKey}`;
    const requestHash = createHash('sha256').update(`${input.folio}|${input.tarjeta.numero.slice(-4)}`).digest('hex');

    try {
      await prisma.idempotencyKey.create({ data: { key, requestHash, estado: 'EN_PROCESO' } });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')) throw error;
      const existing = await prisma.idempotencyKey.findUniqueOrThrow({ where: { key } });
      if (existing.requestHash !== requestHash) {
        throw new AppError(422, 'LLAVE_REUTILIZADA', 'Esta llave de idempotencia ya se usó con otra petición');
      }
      if (existing.estado === 'EN_PROCESO') {
        throw new ConflictError('Tu pago se está procesando, espera un momento', 'PAGO_EN_PROCESO');
      }
      return { status: existing.responseStatus ?? 200, body: existing.responseBody as Record<string, unknown>, replayed: true };
    }

    try {
      const response = await this.processCharge(input, auth, key);
      await prisma.idempotencyKey.update({
        where: { key },
        data: { estado: 'COMPLETADA', responseStatus: response.status, responseBody: response.body as Prisma.InputJsonValue },
      });
      return { ...response, replayed: false };
    } catch (error) {
      // Error inesperado: se libera la llave para permitir reintentar.
      await prisma.idempotencyKey.delete({ where: { key } }).catch(() => undefined);
      throw error;
    }
  },

  async processCharge(input: ChargeInput, auth: AuthContext, key: string): Promise<Omit<ChargeResponse, 'replayed'>> {
    const pedido = await ordersClient.get<PedidoSnapshot>(`/internal/pedidos/${input.folio}`);
    if (pedido.clienteId !== auth.userId) throw new ForbiddenError('Este pedido no es tuyo');
    if (pedido.status !== 'PENDIENTE_PAGO') {
      throw new ConflictError('Este pedido ya fue pagado o no admite pagos', 'PEDIDO_YA_PAGADO');
    }

    const result = await gateway.charge(input.tarjeta, pedido.total);
    const base = {
      orderId: pedido.orderId,
      folio: pedido.folio,
      clienteId: pedido.clienteId,
      monto: pedido.total,
      marca: result.marca,
      ultimos4: result.ultimos4,
      titular: input.tarjeta.titular,
      idempotencyKey: key,
    };

    if (!result.aprobado) {
      const payment = await prisma.$transaction(async (tx) => {
        const created = await tx.payment.create({ data: { ...base, status: 'RECHAZADO', motivoRechazo: result.motivo } });
        const payload: PagoRechazadoPayload = {
          orderId: pedido.orderId,
          folio: pedido.folio,
          clienteId: pedido.clienteId,
          monto: pedido.total,
          motivo: result.motivo,
        };
        await tx.outboxEvent.create({ data: { type: EventTypes.PAGO_RECHAZADO, payload: payload as object } });
        return created;
      });
      return {
        status: 402,
        body: { error: { code: 'PAGO_RECHAZADO', message: result.motivo }, pago: publicPayment(payment) },
      };
    }

    try {
      const payment = await prisma.$transaction(async (tx) => {
        const created = await tx.payment.create({
          data: { ...base, status: 'ACREDITADO', referencia: result.referencia, acreditadoOrderId: pedido.orderId },
        });
        const payload: PagoAcreditadoPayload = {
          paymentId: created.id,
          orderId: pedido.orderId,
          folio: pedido.folio,
          clienteId: pedido.clienteId,
          monto: pedido.total,
          ultimos4: result.ultimos4,
          marca: result.marca,
        };
        await tx.outboxEvent.create({ data: { type: EventTypes.PAGO_ACREDITADO, payload: payload as object } });
        return created;
      });
      return { status: 201, body: { pago: publicPayment(payment) } };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        logger.warn({ folio: pedido.folio }, 'Intento de doble cargo bloqueado por la base de datos');
        await gateway.refund(result.referencia, pedido.total);
        throw new ConflictError('Este pedido ya fue pagado', 'PEDIDO_YA_PAGADO');
      }
      throw error;
    }
  },

  async listForOrder(folio: string, auth: AuthContext) {
    const payments = await prisma.payment.findMany({ where: { folio }, orderBy: { createdAt: 'desc' } });
    if (auth.role === 'CLIENTE' && payments.some((payment) => payment.clienteId !== auth.userId)) {
      throw new ForbiddenError('Este pedido no es tuyo');
    }
    return payments.map(publicPayment);
  },

  async listAll() {
    const payments = await prisma.payment.findMany({ orderBy: { createdAt: 'desc' }, take: 200 });
    return payments.map(publicPayment);
  },

  async refundForCancelledOrder(pedido: PedidoSnapshot, tx: Prisma.TransactionClient) {
    const payment = await tx.payment.findUnique({ where: { acreditadoOrderId: pedido.orderId } });
    if (!payment) return;
    await gateway.refund(payment.referencia ?? '', payment.monto);
    await tx.payment.update({
      where: { id: payment.id },
      data: { status: 'REEMBOLSADO', refundedAt: new Date(), acreditadoOrderId: null },
    });
    await tx.outboxEvent.create({
      data: {
        type: EventTypes.PAGO_REEMBOLSADO,
        payload: {
          paymentId: payment.id,
          orderId: pedido.orderId,
          folio: pedido.folio,
          clienteId: pedido.clienteId,
          clienteEmail: pedido.clienteEmail,
          clienteNombre: pedido.clienteNombre,
          monto: payment.monto,
        },
      },
    });
  },
};

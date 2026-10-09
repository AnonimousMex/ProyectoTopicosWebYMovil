import { ForbiddenError, NotFoundError, type AuthContext } from '@rumbo/shared';
import { prisma } from '../lib/infrastructure.js';
import type { ListOrdersQuery, ReportQuery } from '../schemas/orderSchemas.js';
import type { Order, OrderStatus, Prisma } from '../generated/prisma/index.js';

const ACTIVE: OrderStatus[] = ['PENDIENTE_PAGO', 'PAGADO', 'ASIGNADO', 'RECOLECTADO', 'EN_CAMINO'];

/** Filtro de visibilidad por rol: un cliente ve sólo lo suyo, un repartidor lo que lleva. */
function scopeFor(auth: AuthContext): Prisma.OrderWhereInput {
  if (auth.role === 'CLIENTE') return { clienteId: auth.userId };
  if (auth.role === 'REPARTIDOR') return { repartidorId: auth.userId };
  return {};
}

/**
 * Repositorio = ÚNICO lugar con consultas de pedidos. La vista de
 * seguimiento, la app, el panel y el reporte de gerencia usan estas mismas
 * funciones; cada uno sólo cambia el presentador. La vista ya no conoce la bodega.
 */
export const orderRepository = {
  async findByFolio(folio: string, auth?: AuthContext): Promise<Order & { history: Prisma.OrderStatusHistoryGetPayload<object>[] }> {
    const order = await prisma.order.findUnique({
      where: { folio },
      include: { history: { orderBy: { createdAt: 'asc' } } },
    });
    if (!order) throw new NotFoundError(`No existe el pedido ${folio}`);
    if (auth && auth.role !== 'ADMIN' && auth.role !== 'SERVICE') {
      const owns = auth.role === 'CLIENTE' ? order.clienteId === auth.userId : order.repartidorId === auth.userId;
      if (!owns) throw new ForbiddenError('Este pedido no es tuyo');
    }
    return order;
  },

  async list(query: ListOrdersQuery, auth: AuthContext) {
    const where: Prisma.OrderWhereInput = {
      ...scopeFor(auth),
      ...(query.status ? { status: query.status } : {}),
      ...(query.activos ? { status: { in: ACTIVE } } : {}),
      ...(query.q
        ? {
            OR: [
              { folio: { contains: query.q.toUpperCase() } },
              { destinatarioNombre: { contains: query.q, mode: 'insensitive' } },
              { clienteNombre: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.order.count({ where }),
    ]);
    return { items, total, page: query.page, pageSize: query.pageSize };
  },

  countByStatus: (auth: AuthContext) =>
    prisma.order.groupBy({ by: ['status'], where: scopeFor(auth), _count: true }),

  forReport: (query: ReportQuery) =>
    prisma.order.findMany({
      where: {
        status: query.status,
        createdAt: {
          gte: query.desde ? new Date(query.desde) : undefined,
          lte: query.hasta ? new Date(query.hasta) : undefined,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 5000,
    }),

  activeStatuses: ACTIVE,
};

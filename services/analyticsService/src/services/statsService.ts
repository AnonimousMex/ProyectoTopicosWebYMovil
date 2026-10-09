import { prisma } from '../lib/infrastructure.js';
import type { Prisma } from '../generated/prisma/index.js';

const round = (value: number, digits = 2) => Number(value.toFixed(digits));

function startOfDayMx(date: Date): Date {
  const local = new Date(date.toLocaleString('en-US', { timeZone: 'America/Mexico_City' }));
  const offset = date.getTime() - local.getTime();
  local.setHours(0, 0, 0, 0);
  return new Date(local.getTime() + offset);
}

const dayKey = (date: Date) => date.toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' });

const PAGADOS = ['PAGADO', 'ASIGNADO', 'RECOLECTADO', 'EN_CAMINO', 'ENTREGADO'];

export const statsService = {
  async summary(dias: number) {
    const now = new Date();
    const desde = startOfDayMx(new Date(now.getTime() - (dias - 1) * 86_400_000));
    const hoy = startOfDayMx(now);
    const facts = await prisma.orderFact.findMany({ where: { createdAt: { gte: desde } } });

    const pagados = facts.filter((fact) => PAGADOS.includes(fact.status));
    const entregados = facts.filter((fact) => fact.status === 'ENTREGADO');
    const hoyFacts = facts.filter((fact) => fact.createdAt >= hoy);
    const ingresos = pagados.reduce((sum, fact) => sum + fact.total, 0);
    const conTiempo = entregados.filter((fact) => fact.aTiempo !== null);

    const serie = new Map<string, { fecha: string; pedidos: number; ingresos: number; entregados: number }>();
    for (let i = 0; i < dias; i += 1) {
      const key = dayKey(new Date(desde.getTime() + i * 86_400_000 + 3_600_000 * 6));
      serie.set(key, { fecha: key, pedidos: 0, ingresos: 0, entregados: 0 });
    }
    for (const fact of facts) {
      const row = serie.get(dayKey(fact.createdAt));
      if (!row) continue;
      row.pedidos += 1;
      if (PAGADOS.includes(fact.status)) row.ingresos = round(row.ingresos + fact.total);
      if (fact.status === 'ENTREGADO') row.entregados += 1;
    }

    const porMedio = new Map<string, { medio: string; pedidos: number; ingresos: number; entregados: number; aTiempo: number }>();
    for (const fact of pagados) {
      const key = fact.medioId ?? 'sin asignar';
      const row = porMedio.get(key) ?? { medio: key, pedidos: 0, ingresos: 0, entregados: 0, aTiempo: 0 };
      row.pedidos += 1;
      row.ingresos = round(row.ingresos + fact.total);
      if (fact.status === 'ENTREGADO') {
        row.entregados += 1;
        if (fact.aTiempo) row.aTiempo += 1;
      }
      porMedio.set(key, row);
    }

    const porEstado: Record<string, number> = {};
    const porUrgencia: Record<string, number> = {};
    const porHora = new Array(24).fill(0);
    for (const fact of facts) {
      porEstado[fact.status] = (porEstado[fact.status] ?? 0) + 1;
      porUrgencia[fact.urgencia] = (porUrgencia[fact.urgencia] ?? 0) + 1;
      porHora[Number(fact.createdAt.toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: 'America/Mexico_City' })) % 24] += 1;
    }

    const optimizaciones = await prisma.optimizationFact.aggregate({
      where: { tipo: 'REAL', createdAt: { gte: desde } },
      _count: true,
      _avg: { mejoraPct: true },
      _sum: { asignados: true },
    });

    return {
      periodoDias: dias,
      kpis: {
        pedidosHoy: hoyFacts.length,
        ingresosHoy: round(hoyFacts.filter((fact) => PAGADOS.includes(fact.status)).reduce((sum, fact) => sum + fact.total, 0)),
        pedidosPeriodo: facts.length,
        ingresosPeriodo: round(ingresos),
        ticketPromedio: pagados.length ? round(ingresos / pagados.length) : 0,
        entregados: entregados.length,
        aTiempoPct: conTiempo.length ? round((conTiempo.filter((fact) => fact.aTiempo).length / conTiempo.length) * 100, 1) : 0,
        minutosPromedioEntrega: entregados.length
          ? round(entregados.reduce((sum, fact) => sum + (fact.minutosEntrega ?? 0), 0) / entregados.length, 1)
          : 0,
        canceladosPct: facts.length ? round(((porEstado.CANCELADO ?? 0) / facts.length) * 100, 1) : 0,
        kmTotales: round(pagados.reduce((sum, fact) => sum + fact.distanciaKm, 0), 1),
      },
      serie: [...serie.values()],
      porMedio: [...porMedio.values()].sort((a, b) => b.pedidos - a.pedidos),
      porEstado,
      porUrgencia,
      porHora,
      optimizaciones: {
        corridas: optimizaciones._count,
        mejoraPromedioPct: round(optimizaciones._avg.mejoraPct ?? 0, 1),
        enviosAsignados: optimizaciones._sum.asignados ?? 0,
      },
    };
  },

  recentEvents: (limit: number, type?: string) =>
    prisma.eventLog.findMany({
      where: type ? { type } : undefined,
      orderBy: { occurredAt: 'desc' },
      take: limit,
      select: { id: true, type: true, source: true, folio: true, occurredAt: true },
    }),

  async auditLog(query: { page: number; pageSize: number; userId?: string; metodo?: string; soloErrores?: boolean }) {
    const where: Prisma.AuditLogWhereInput = {
      userId: query.userId,
      metodo: query.metodo,
      ...(query.soloErrores ? { status: { gte: 400 } } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.auditLog.count({ where }),
    ]);
    return { items, total, page: query.page, pageSize: query.pageSize };
  },
};

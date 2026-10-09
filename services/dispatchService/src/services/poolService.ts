import { prisma } from '../lib/infrastructure.js';

export const poolService = {
  async overview() {
    const [pool, activos, resumen] = await Promise.all([
      prisma.envio.findMany({ where: { status: 'EN_POOL' }, orderBy: { fechaLimite: 'asc' } }),
      prisma.envio.findMany({
        where: { status: { in: ['ASIGNADO', 'EN_RUTA'] } },
        orderBy: [{ repartidorId: 'asc' }, { secuencia: 'asc' }],
      }),
      prisma.envio.groupBy({ by: ['status'], _count: true }),
    ]);
    return {
      pool,
      activos,
      conteo: Object.fromEntries(resumen.map((row) => [row.status, row._count])),
    };
  },
};

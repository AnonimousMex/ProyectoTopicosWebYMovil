import { NotFoundError } from '@rumbo/shared';
import type { PerfilMedio } from '../domain/dispatchTypes.js';
import { prisma } from '../lib/infrastructure.js';
import type { ExtraConfig } from '../pricing/extraDecorators.js';
import { hasCustomStrategy } from '../strategies/medios/medioRegistry.js';
import type { Prisma } from '../generated/prisma/index.js';

let mediosCache: { value: PerfilMedio[]; at: number } | null = null;
let extrasCache: { value: ExtraConfig[]; at: number } | null = null;
const TTL = 10_000;

export const catalogService = {
  async activeMedios(): Promise<PerfilMedio[]> {
    if (mediosCache && Date.now() - mediosCache.at < TTL) return mediosCache.value;
    const value = await prisma.medio.findMany({ where: { activo: true }, orderBy: { orden: 'asc' } });
    mediosCache = { value, at: Date.now() };
    return value;
  },

  async activeExtras(): Promise<ExtraConfig[]> {
    if (extrasCache && Date.now() - extrasCache.at < TTL) return extrasCache.value;
    const value = await prisma.extra.findMany({ where: { activo: true }, orderBy: { orden: 'asc' } });
    extrasCache = { value, at: Date.now() };
    return value;
  },

  async listMedios() {
    const medios = await prisma.medio.findMany({
      orderBy: { orden: 'asc' },
      include: { _count: { select: { repartidores: true } } },
    });
    return medios.map(({ _count, ...medio }) => ({
      ...medio,
      repartidores: _count.repartidores,
      estrategiaPropia: hasCustomStrategy(medio.id),
    }));
  },

  async createMedio(data: Prisma.MedioCreateInput) {
    const medio = await prisma.medio.create({ data });
    mediosCache = null;
    return medio;
  },

  async updateMedio(id: string, data: Prisma.MedioUpdateInput) {
    if (!(await prisma.medio.findUnique({ where: { id } }))) throw new NotFoundError('Medio no encontrado');
    const medio = await prisma.medio.update({ where: { id }, data });
    mediosCache = null;
    return medio;
  },

  listExtras: () => prisma.extra.findMany({ orderBy: { orden: 'asc' } }),

  async upsertExtra(id: string, data: Omit<Prisma.ExtraCreateInput, 'id'>) {
    const extra = await prisma.extra.upsert({ where: { id }, create: { id, ...data }, update: data });
    extrasCache = null;
    return extra;
  },
};

import { runStore } from '../geneticAlgorithm/runStore.js';
import { logger, prisma } from '../lib/infrastructure.js';
import { gaParamsSchema } from '../schemas/simulationSchemas.js';
import { optimizationService } from './optimizationService.js';

const KEY = 'autoAsignacion';

export interface AutoAssignSettings {
  activo: boolean;
  intervaloSeg: number;
  ultimaEjecucion: string | null;
}

const defaults: AutoAssignSettings = { activo: false, intervaloSeg: 120, ultimaEjecucion: null };

export const autoAssignService = {
  async get(): Promise<AutoAssignSettings> {
    const setting = await prisma.setting.findUnique({ where: { key: KEY } });
    return { ...defaults, ...((setting?.value as Partial<AutoAssignSettings>) ?? {}) };
  },

  async update(changes: Partial<AutoAssignSettings>): Promise<AutoAssignSettings> {
    const value = { ...(await this.get()), ...changes };
    await prisma.setting.upsert({ where: { key: KEY }, create: { key: KEY, value }, update: { value } });
    return value;
  },

  /** Revisa periódicamente si toca correr la asignación automática con el algoritmo genético. */
  start(): () => void {
    const timer = setInterval(async () => {
      try {
        const settings = await this.get();
        if (!settings.activo || runStore.hasActiveReal()) return;
        const last = settings.ultimaEjecucion ? new Date(settings.ultimaEjecucion).getTime() : 0;
        if (Date.now() - last < settings.intervaloSeg * 1000) return;
        const pending = await prisma.envio.count({ where: { status: 'EN_POOL' } });
        await this.update({ ultimaEjecucion: new Date().toISOString() });
        if (pending === 0) return;
        logger.info({ pendientes: pending }, 'Asignación automática: ejecutando algoritmo genético');
        await optimizationService.startRealOptimization(
          { parametros: gaParamsSchema.parse({ generaciones: 120, paciencia: 40 }), velocidadMs: 0 },
          'auto-asignacion',
        );
      } catch (error) {
        logger.warn({ err: (error as Error).message }, 'Asignación automática omitida');
      }
    }, 15_000);
    return () => clearInterval(timer);
  },
};

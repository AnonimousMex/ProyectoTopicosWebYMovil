import type { RequestHandler } from 'express';
import { prisma } from '../lib/infrastructure.js';

export const CHAOS_ID = 'mapas';
let cache: { value: { caido: boolean; tasaFallo: number; latenciaMs: number }; at: number } | null = null;

export async function getChaos() {
  if (cache && Date.now() - cache.at < 1500) return cache.value;
  const config = (await prisma.chaosConfig.findUnique({ where: { id: CHAOS_ID } })) ?? {
    caido: false,
    tasaFallo: 0,
    latenciaMs: 0,
  };
  cache = { value: { caido: config.caido, tasaFallo: config.tasaFallo, latenciaMs: config.latenciaMs }, at: Date.now() };
  return cache.value;
}

export function invalidateChaosCache() {
  cache = null;
}

/**
 * Simula a un proveedor externo poco confiable: latencia, errores aleatorios
 * o caída total. Sirve para demostrar que el resto del sistema no se cae.
 */
export function chaosMiddleware(): RequestHandler {
  return async (_req, res, next) => {
    try {
      const chaos = await getChaos();
      if (chaos.latenciaMs > 0) await new Promise((resolve) => setTimeout(resolve, chaos.latenciaMs));
      if (chaos.caido) {
        res.status(503).json({ error: { code: 'PROVEEDOR_CAIDO', message: 'El proveedor de mapas no está disponible' } });
        return;
      }
      if (chaos.tasaFallo > 0 && Math.random() < chaos.tasaFallo) {
        res.status(500).json({ error: { code: 'FALLA_ALEATORIA', message: 'Falla intermitente del proveedor de mapas' } });
        return;
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}

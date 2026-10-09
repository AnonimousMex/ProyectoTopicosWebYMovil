import type { Request, Response } from 'express';
import { requireAuth } from '@rumbo/shared';
import { bffService } from '../bff/bffService.js';
import { env, type ServiceKey } from '../config/env.js';
import { routeTable } from '../config/routeTable.js';
import { serviceNames } from '../lib/infrastructure.js';

export const bffController = {
  async cliente(req: Request, res: Response) {
    res.json(await bffService.clienteInicio(requireAuth(req)));
  },
  async repartidor(req: Request, res: Response) {
    res.json(await bffService.repartidorInicio(requireAuth(req)));
  },
  async panel(req: Request, res: Response) {
    res.json(await bffService.panelInicio(requireAuth(req)));
  },
};

export const systemController = {
  /** Estado de cada microservicio y de sus circuitos (panel "Sistema"). */
  async health(_req: Request, res: Response) {
    const servicios = await Promise.all(
      (Object.keys(env.services) as ServiceKey[]).map(async (key) => {
        const started = performance.now();
        try {
          const response = await fetch(`${env.services[key]}/health`, { signal: AbortSignal.timeout(1500) });
          const data = (await response.json()) as Record<string, unknown>;
          return {
            id: key,
            nombre: serviceNames[key],
            url: env.services[key],
            estado: response.ok ? 'ok' : 'degradado',
            latenciaMs: Math.round(performance.now() - started),
            ...data,
          };
        } catch {
          return {
            id: key,
            nombre: serviceNames[key],
            url: env.services[key],
            estado: 'caido',
            latenciaMs: Math.round(performance.now() - started),
          };
        }
      }),
    );
    res.json({ gateway: { estado: 'ok', uptimeSeg: Math.round(process.uptime()) }, servicios, rutas: routeTable });
  },
};

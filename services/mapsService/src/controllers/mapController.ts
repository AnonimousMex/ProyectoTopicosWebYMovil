import type { Request, Response } from 'express';
import { CHAOS_ID, getChaos, invalidateChaosCache } from '../middleware/chaosMiddleware.js';
import { prisma } from '../lib/infrastructure.js';
import { mapService } from '../services/mapService.js';

export const mapController = {
  async catalog(_req: Request, res: Response) {
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.json(await mapService.catalog());
  },

  async route(req: Request, res: Response) {
    res.json(await mapService.route(req.body.origen, req.body.destino, req.body.hora));
  },

  async matrix(req: Request, res: Response) {
    res.json(await mapService.matrix(req.body.puntos, req.body.hora));
  },

  async traffic(req: Request, res: Response) {
    res.json(await mapService.traffic((req.query as { hora?: number }).hora));
  },

  async getChaos(_req: Request, res: Response) {
    res.json(await getChaos());
  },

  async updateChaos(req: Request, res: Response) {
    await prisma.chaosConfig.upsert({
      where: { id: CHAOS_ID },
      create: { id: CHAOS_ID, ...req.body },
      update: req.body,
    });
    invalidateChaosCache();
    res.json(await getChaos());
  },
};

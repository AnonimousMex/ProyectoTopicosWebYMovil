import type { Request, Response } from 'express';
import { NotFoundError, openSse, requireAuth } from '@rumbo/shared';
import { runStore } from '../geneticAlgorithm/runStore.js';
import { autoAssignService } from '../services/autoAssignService.js';
import { optimizationService } from '../services/optimizationService.js';
import { poolService } from '../services/poolService.js';

export const optimizationController = {
  async simulate(req: Request, res: Response) {
    res.status(201).json(await optimizationService.startSimulation(req.body, requireAuth(req).userId));
  },

  async optimizeReal(req: Request, res: Response) {
    res.status(201).json(await optimizationService.startRealOptimization(req.body, requireAuth(req).userId));
  },

  async stream(req: Request, res: Response) {
    // Se valida antes de abrir el stream para poder responder 404 con JSON normal.
    if (!runStore.get(req.params.runId)) throw new NotFoundError('La corrida ya no está disponible');
    optimizationService.stream(req.params.runId, openSse(req, res));
  },

  async history(req: Request, res: Response) {
    res.json(await optimizationService.history(req.query.tipo as string | undefined));
  },

  async pool(_req: Request, res: Response) {
    res.json(await poolService.overview());
  },

  async getAutoAssign(_req: Request, res: Response) {
    res.json(await autoAssignService.get());
  },

  async updateAutoAssign(req: Request, res: Response) {
    res.json(await autoAssignService.update(req.body));
  },
};

import type { Request, Response } from 'express';
import { requireAuth } from '@rumbo/shared';
import { fleetService } from '../services/fleetService.js';

export const fleetController = {
  async list(_req: Request, res: Response) {
    res.json(await fleetService.list());
  },

  async update(req: Request, res: Response) {
    res.json(await fleetService.update(req.params.id, req.body));
  },

  async me(req: Request, res: Response) {
    res.json(await fleetService.get(requireAuth(req).userId));
  },

  async setMyAvailability(req: Request, res: Response) {
    res.json(await fleetService.update(requireAuth(req).userId, { disponible: req.body.disponible }));
  },

  async myRoute(req: Request, res: Response) {
    res.json(await fleetService.myRoute(requireAuth(req).userId));
  },
};

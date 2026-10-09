import type { Request, Response } from 'express';
import { catalogService } from '../services/catalogService.js';

export const catalogController = {
  async listMedios(_req: Request, res: Response) {
    res.json(await catalogService.listMedios());
  },

  async createMedio(req: Request, res: Response) {
    res.status(201).json(await catalogService.createMedio(req.body));
  },

  async updateMedio(req: Request, res: Response) {
    res.json(await catalogService.updateMedio(req.params.id, req.body));
  },

  async listExtras(_req: Request, res: Response) {
    res.json(await catalogService.listExtras());
  },

  async upsertExtra(req: Request, res: Response) {
    res.json(await catalogService.upsertExtra(req.params.id.toUpperCase(), req.body));
  },
};

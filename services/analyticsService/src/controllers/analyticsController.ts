import type { Request, Response } from 'express';
import { statsService } from '../services/statsService.js';

export const analyticsController = {
  async summary(req: Request, res: Response) {
    res.json(await statsService.summary(Number(req.query.dias)));
  },

  async events(req: Request, res: Response) {
    const query = req.query as unknown as { limit: number; type?: string };
    res.json(await statsService.recentEvents(query.limit, query.type));
  },

  async audit(req: Request, res: Response) {
    res.json(await statsService.auditLog(req.query as never));
  },
};

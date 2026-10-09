import type { Request, Response } from 'express';
import { quoteService } from '../services/quoteService.js';

export const quoteController = {
  async quote(req: Request, res: Response) {
    res.json(await quoteService.quote(req.body));
  },
};

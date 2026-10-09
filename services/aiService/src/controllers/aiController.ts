import type { Request, Response } from 'express';
import { recommendRoute } from '../providers/routeAiProvider.js';
import { suggestXml } from '../providers/xmlBrainProvider.js';
import { chaosService, type ProviderId } from '../services/chaosService.js';

export const aiController = {
  routeAiRecommend(req: Request, res: Response) {
    res.json(recommendRoute(req.body));
  },

  xmlBrainSuggest(req: Request, res: Response) {
    try {
      res.type('application/xml').send(suggestXml(String(req.body ?? '')));
    } catch (error) {
      res
        .status(400)
        .type('application/xml')
        .send(`<?xml version="1.0"?><error><message>${(error as Error).message}</message></error>`);
    }
  },

  async overview(_req: Request, res: Response) {
    res.json(await chaosService.overview());
  },

  async updateChaos(req: Request, res: Response) {
    res.json(await chaosService.update(req.params.proveedor as ProviderId, req.body));
  },
};

import type { Request, Response } from 'express';
import { aiSuggestionService } from '../services/aiSuggestionService.js';
import { quoteService } from '../services/quoteService.js';

export const aiController = {
  async listProviders(_req: Request, res: Response) {
    res.json(await aiSuggestionService.listProviders());
  },

  async updateProvider(req: Request, res: Response) {
    res.json(await aiSuggestionService.updateProvider(req.params.id, req.body));
  },

  async resetBreaker(req: Request, res: Response) {
    aiSuggestionService.resetBreaker(req.params.id);
    res.status(204).end();
  },

  /** Prueba en vivo: cotiza un envío de ejemplo y devuelve la traza de proveedores. */
  async test(req: Request, res: Response) {
    const quote = await quoteService.quote(req.body);
    res.json({ sugerencia: quote.sugerencia, ruta: quote.ruta, opciones: quote.opciones });
  },
};

import type { RequestHandler } from 'express';
import { chaosService, type ProviderId } from '../services/chaosService.js';

/** Hace que cada proveedor simulado se comporte como un servicio externo real: lento y a veces caído. */
export function providerChaos(provider: ProviderId, responseFormat: 'json' | 'xml'): RequestHandler {
  return async (_req, res, next) => {
    try {
      const chaos = await chaosService.get(provider);
      const jitter = Math.round(chaos.latenciaMs * (0.6 + Math.random() * 0.8));
      await new Promise((resolve) => setTimeout(resolve, jitter));

      const fail = (status: number, message: string, outcome: 'falla' | 'caido') => {
        void chaosService.record(provider, outcome);
        if (responseFormat === 'xml') {
          res.status(status).type('application/xml').send(`<?xml version="1.0"?><error><message>${message}</message></error>`);
        } else {
          res.status(status).json({ error: { code: status, message } });
        }
      };

      if (chaos.caido) return fail(503, 'Service temporarily unavailable', 'caido');
      if (Math.random() < chaos.tasaFallo) return fail(500, 'Internal inference error', 'falla');
      void chaosService.record(provider, 'ok');
      next();
    } catch (error) {
      next(error);
    }
  };
}

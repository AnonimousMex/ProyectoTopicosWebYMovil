import type { Request, Response } from 'express';
import { requireAuth } from '@rumbo/shared';
import { TARJETAS_PRUEBA } from '../gateways/paymentGateway.js';
import { idempotencyKeySchema } from '../schemas/paymentSchemas.js';
import { paymentService } from '../services/paymentService.js';

export const paymentController = {
  async charge(req: Request, res: Response) {
    const key = idempotencyKeySchema.parse(req.header('idempotency-key'));
    const result = await paymentService.charge(req.body, requireAuth(req), key);
    if (result.replayed) res.setHeader('Idempotent-Replayed', 'true');
    res.status(result.status).json(result.body);
  },

  async listForOrder(req: Request, res: Response) {
    res.json(await paymentService.listForOrder(req.params.folio, requireAuth(req)));
  },

  async listAll(_req: Request, res: Response) {
    res.json(await paymentService.listAll());
  },

  testCards(_req: Request, res: Response) {
    res.json(
      Object.entries(TARJETAS_PRUEBA).map(([numero, rechazo]) => ({
        numero,
        resultado: rechazo ?? 'Aprobada',
        aprobada: rechazo === null,
      })),
    );
  },
};

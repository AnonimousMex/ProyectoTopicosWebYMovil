import { Router } from 'express';
import { asyncHandler, requireRole, requireService, validateRequest } from '@rumbo/shared';
import { aiController } from '../controllers/aiController.js';
import { providerChaos } from '../middleware/providerChaos.js';
import { chaosBodySchema, providerParamsSchema, routeAiRequestSchema } from '../schemas/aiSchemas.js';

/** Endpoints que imitan a los proveedores externos (cada uno con su formato). */
export const providerRoutes = Router();
providerRoutes.use(requireService());
providerRoutes.post(
  '/routeai/v1/recommend',
  providerChaos('routeai', 'json'),
  validateRequest({ body: routeAiRequestSchema }),
  aiController.routeAiRecommend,
);
providerRoutes.post('/xmlbrain/suggest', providerChaos('xmlbrain', 'xml'), aiController.xmlBrainSuggest);

/** Administración del simulador de fallas. */
export const adminRoutes = Router();
adminRoutes.use(requireRole('ADMIN'));
adminRoutes.get('/', asyncHandler(aiController.overview));
adminRoutes.patch(
  '/:proveedor',
  validateRequest({ params: providerParamsSchema, body: chaosBodySchema }),
  asyncHandler(aiController.updateChaos),
);

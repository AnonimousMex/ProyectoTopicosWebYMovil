import { Router } from 'express';
import { asyncHandler, requireRole, validateRequest } from '@rumbo/shared';
import { analyticsController } from '../controllers/analyticsController.js';
import { auditQuerySchema, eventsQuerySchema, summaryQuerySchema } from '../schemas/analyticsSchemas.js';

export const statsRoutes = Router();
statsRoutes.use(requireRole('ADMIN'));
statsRoutes.get('/resumen', validateRequest({ query: summaryQuerySchema }), asyncHandler(analyticsController.summary));
statsRoutes.get('/eventos', validateRequest({ query: eventsQuerySchema }), asyncHandler(analyticsController.events));

export const auditRoutes = Router();
auditRoutes.use(requireRole('ADMIN'));
auditRoutes.get('/', validateRequest({ query: auditQuerySchema }), asyncHandler(analyticsController.audit));

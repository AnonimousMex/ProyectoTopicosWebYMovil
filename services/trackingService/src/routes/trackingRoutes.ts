import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, requireRole, validateRequest } from '@rumbo/shared';
import { trackingController } from '../controllers/trackingController.js';

const folioParams = z.object({
  folio: z.string().trim().toUpperCase().regex(/^RB-\d{4}-\d{6}$/, 'Folio inválido'),
});

export const trackingRoutes = Router();

trackingRoutes.get('/', requireRole('ADMIN'), asyncHandler(trackingController.listActive));
trackingRoutes.get('/en-vivo/todos', requireRole('ADMIN'), asyncHandler(trackingController.streamAll));
trackingRoutes.get('/:folio', validateRequest({ params: folioParams }), asyncHandler(trackingController.get));
trackingRoutes.get('/:folio/stream', validateRequest({ params: folioParams }), asyncHandler(trackingController.stream));

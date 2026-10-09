import { Router } from 'express';
import { asyncHandler, requireRole, validateRequest } from '@rumbo/shared';
import { paymentController } from '../controllers/paymentController.js';
import { chargeSchema, folioParamsSchema } from '../schemas/paymentSchemas.js';

export const paymentRoutes = Router();

paymentRoutes.post('/', requireRole('CLIENTE'), validateRequest({ body: chargeSchema }), asyncHandler(paymentController.charge));
paymentRoutes.get('/tarjetas-prueba', paymentController.testCards);
paymentRoutes.get('/pedido/:folio', validateRequest({ params: folioParamsSchema }), asyncHandler(paymentController.listForOrder));
paymentRoutes.get('/', requireRole('ADMIN'), asyncHandler(paymentController.listAll));

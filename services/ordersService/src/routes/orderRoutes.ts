import { Router } from 'express';
import { asyncHandler, requireRole, requireService, validateRequest } from '@rumbo/shared';
import { orderController } from '../controllers/orderController.js';
import {
  cancelSchema,
  changeStatusSchema,
  createOrderSchema,
  folioParamsSchema,
  listOrdersQuerySchema,
  orderViewQuerySchema,
  reportQuerySchema,
} from '../schemas/orderSchemas.js';

export const orderRoutes = Router();

orderRoutes.post('/', requireRole('CLIENTE'), validateRequest({ body: createOrderSchema }), asyncHandler(orderController.create));
orderRoutes.get('/', validateRequest({ query: listOrdersQuerySchema }), asyncHandler(orderController.list));
orderRoutes.get('/resumen', asyncHandler(orderController.summary));
orderRoutes.get(
  '/:folio',
  validateRequest({ params: folioParamsSchema, query: orderViewQuerySchema }),
  asyncHandler(orderController.detail),
);
orderRoutes.get('/:folio/guia.pdf', validateRequest({ params: folioParamsSchema }), asyncHandler(orderController.label));
orderRoutes.post(
  '/:folio/cancelar',
  requireRole('CLIENTE', 'ADMIN'),
  validateRequest({ params: folioParamsSchema, body: cancelSchema }),
  asyncHandler(orderController.cancel),
);
orderRoutes.patch(
  '/:folio/estado',
  requireRole('REPARTIDOR', 'ADMIN'),
  validateRequest({ params: folioParamsSchema, body: changeStatusSchema }),
  asyncHandler(orderController.changeStatus),
);

export const reportRoutes = Router();
reportRoutes.get('/pedidos', requireRole('ADMIN'), validateRequest({ query: reportQuerySchema }), asyncHandler(orderController.report));

export const internalOrderRoutes = Router();
internalOrderRoutes.use(requireService());
internalOrderRoutes.get('/:folio', validateRequest({ params: folioParamsSchema }), asyncHandler(orderController.internalDetail));

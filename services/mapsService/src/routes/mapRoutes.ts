import { Router } from 'express';
import { asyncHandler, requireRole, validateRequest } from '@rumbo/shared';
import { mapController } from '../controllers/mapController.js';
import { chaosMiddleware } from '../middleware/chaosMiddleware.js';
import { chaosBodySchema, matrixBodySchema, routeBodySchema, trafficQuerySchema } from '../schemas/mapSchemas.js';

/** Catálogo estático: se sirve aunque el "proveedor" esté caído (como los tiles en caché). */
export const catalogRoutes = Router();
catalogRoutes.get('/catalogo', asyncHandler(mapController.catalog));

/** Endpoints del proveedor: sujetos al simulador de fallas. */
export const providerRoutes = Router();
providerRoutes.use(chaosMiddleware());
providerRoutes.post('/ruta', validateRequest({ body: routeBodySchema }), asyncHandler(mapController.route));
providerRoutes.get('/trafico', validateRequest({ query: trafficQuerySchema }), asyncHandler(mapController.traffic));

export const internalProviderRoutes = Router();
internalProviderRoutes.use(chaosMiddleware());
internalProviderRoutes.post('/matriz', validateRequest({ body: matrixBodySchema }), asyncHandler(mapController.matrix));
internalProviderRoutes.post('/ruta', validateRequest({ body: routeBodySchema }), asyncHandler(mapController.route));

export const chaosRoutes = Router();
chaosRoutes.use(requireRole('ADMIN'));
chaosRoutes.get('/', asyncHandler(mapController.getChaos));
chaosRoutes.patch('/', validateRequest({ body: chaosBodySchema }), asyncHandler(mapController.updateChaos));

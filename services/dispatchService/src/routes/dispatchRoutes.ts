import { Router } from 'express';
import { asyncHandler, requireRole, requireService, validateRequest } from '@rumbo/shared';
import { aiController } from '../controllers/aiController.js';
import { catalogController } from '../controllers/catalogController.js';
import { fleetController } from '../controllers/fleetController.js';
import { optimizationController } from '../controllers/optimizationController.js';
import { quoteController } from '../controllers/quoteController.js';
import {
  createMedioSchema,
  idParamsSchema,
  myAvailabilitySchema,
  updateAiProviderSchema,
  updateMedioSchema,
  updateRepartidorSchema,
  upsertExtraSchema,
} from '../schemas/catalogSchemas.js';
import { quoteSchema } from '../schemas/quoteSchemas.js';
import {
  autoAssignSchema,
  optimizeBodySchema,
  runIdParamsSchema,
  simulationBodySchema,
} from '../schemas/simulationSchemas.js';

/** POST /api/cotizaciones — cualquier usuario con sesión. */
export const quoteRoutes = Router();
quoteRoutes.post('/', validateRequest({ body: quoteSchema }), asyncHandler(quoteController.quote));

/** /api/medios y /api/extras — lectura para todos, edición sólo admin. */
export const catalogRoutes = Router();
catalogRoutes.get('/medios', asyncHandler(catalogController.listMedios));
catalogRoutes.post('/medios', requireRole('ADMIN'), validateRequest({ body: createMedioSchema }), asyncHandler(catalogController.createMedio));
catalogRoutes.patch(
  '/medios/:id',
  requireRole('ADMIN'),
  validateRequest({ params: idParamsSchema, body: updateMedioSchema }),
  asyncHandler(catalogController.updateMedio),
);
catalogRoutes.get('/extras', asyncHandler(catalogController.listExtras));
catalogRoutes.put(
  '/extras/:id',
  requireRole('ADMIN'),
  validateRequest({ params: idParamsSchema, body: upsertExtraSchema }),
  asyncHandler(catalogController.upsertExtra),
);

/** /api/flota — administración de repartidores y autoservicio del repartidor. */
export const fleetRoutes = Router();
fleetRoutes.get('/yo', requireRole('REPARTIDOR'), asyncHandler(fleetController.me));
fleetRoutes.patch('/yo', requireRole('REPARTIDOR'), validateRequest({ body: myAvailabilitySchema }), asyncHandler(fleetController.setMyAvailability));
fleetRoutes.get('/yo/ruta', requireRole('REPARTIDOR'), asyncHandler(fleetController.myRoute));
fleetRoutes.get('/', requireRole('ADMIN'), asyncHandler(fleetController.list));
fleetRoutes.patch(
  '/:id',
  requireRole('ADMIN'),
  validateRequest({ params: idParamsSchema, body: updateRepartidorSchema }),
  asyncHandler(fleetController.update),
);

/** /api/asignacion — pool real y optimización con el algoritmo genético. */
export const assignmentRoutes = Router();
assignmentRoutes.use(requireRole('ADMIN'));
assignmentRoutes.get('/pool', asyncHandler(optimizationController.pool));
assignmentRoutes.post('/optimizar', validateRequest({ body: optimizeBodySchema }), asyncHandler(optimizationController.optimizeReal));
assignmentRoutes.get('/auto', asyncHandler(optimizationController.getAutoAssign));
assignmentRoutes.put('/auto', validateRequest({ body: autoAssignSchema }), asyncHandler(optimizationController.updateAutoAssign));

/** /api/simulacion — laboratorio del algoritmo genético. */
export const simulationRoutes = Router();
simulationRoutes.use(requireRole('ADMIN'));
simulationRoutes.post('/', validateRequest({ body: simulationBodySchema }), asyncHandler(optimizationController.simulate));
simulationRoutes.get('/historial', asyncHandler(optimizationController.history));
simulationRoutes.get('/:runId/stream', validateRequest({ params: runIdParamsSchema }), asyncHandler(optimizationController.stream));

/** /api/ia — proveedores de IA, prioridades y circuitos. */
export const aiRoutes = Router();
aiRoutes.use(requireRole('ADMIN'));
aiRoutes.get('/proveedores', asyncHandler(aiController.listProviders));
aiRoutes.patch(
  '/proveedores/:id',
  validateRequest({ params: idParamsSchema, body: updateAiProviderSchema }),
  asyncHandler(aiController.updateProvider),
);
aiRoutes.post('/proveedores/:id/reiniciar-circuito', validateRequest({ params: idParamsSchema }), asyncHandler(aiController.resetBreaker));
aiRoutes.post('/probar', validateRequest({ body: quoteSchema }), asyncHandler(aiController.test));

/** /internal — sólo otros microservicios. */
export const internalRoutes = Router();
internalRoutes.use(requireService());
internalRoutes.post('/cotizar', validateRequest({ body: quoteSchema }), asyncHandler(quoteController.quote));

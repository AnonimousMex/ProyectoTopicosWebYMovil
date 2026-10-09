import { Router } from 'express';
import { asyncHandler, requireRole } from '@rumbo/shared';
import { bffController, systemController } from '../controllers/systemController.js';
import { authenticate } from '../middleware/authenticate.js';

export const bffRoutes = Router();
bffRoutes.use(authenticate('sesion'));
bffRoutes.get('/app/inicio', requireRole('CLIENTE'), asyncHandler(bffController.cliente));
bffRoutes.get('/repartidor/inicio', requireRole('REPARTIDOR'), asyncHandler(bffController.repartidor));
bffRoutes.get('/panel/inicio', requireRole('ADMIN'), asyncHandler(bffController.panel));

export const systemRoutes = Router();
systemRoutes.use(authenticate('sesion'), requireRole('ADMIN'));
systemRoutes.get('/salud', asyncHandler(systemController.health));

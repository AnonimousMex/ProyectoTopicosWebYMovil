import { Router } from 'express';
import { asyncHandler, requireRole, requireService, validateRequest } from '@rumbo/shared';
import { userController } from '../controllers/userController.js';
import {
  createUserSchema,
  listUsersQuerySchema,
  updateUserSchema,
  userIdParamsSchema,
  userIdsBodySchema,
} from '../schemas/userSchemas.js';

export const userRoutes = Router();

userRoutes.use(requireRole('ADMIN'));
userRoutes.get('/', validateRequest({ query: listUsersQuerySchema }), asyncHandler(userController.list));
userRoutes.post('/', validateRequest({ body: createUserSchema }), asyncHandler(userController.create));
userRoutes.patch(
  '/:id',
  validateRequest({ params: userIdParamsSchema, body: updateUserSchema }),
  asyncHandler(userController.update),
);

export const internalUserRoutes = Router();

internalUserRoutes.use(requireService());
internalUserRoutes.get('/:id', validateRequest({ params: userIdParamsSchema }), asyncHandler(userController.getInternal));
internalUserRoutes.post('/lote', validateRequest({ body: userIdsBodySchema }), asyncHandler(userController.getManyInternal));

import { Router } from 'express';
import { asyncHandler, requireRole, requireService, validateRequest } from '@rumbo/shared';
import { emailController } from '../controllers/emailController.js';
import { notificationController } from '../controllers/notificationController.js';
import {
  idParamsSchema,
  internalEmailSchema,
  listEmailsQuerySchema,
  listNotificationsQuerySchema,
  testEmailSchema,
} from '../schemas/notificationSchemas.js';

export const notificationRoutes = Router();

notificationRoutes.get('/', validateRequest({ query: listNotificationsQuerySchema }), asyncHandler(notificationController.list));
notificationRoutes.get('/conteo', asyncHandler(notificationController.unreadCount));
notificationRoutes.get('/stream', asyncHandler(notificationController.stream));
notificationRoutes.post('/leer-todas', asyncHandler(notificationController.markAllRead));
notificationRoutes.patch('/:id/leida', validateRequest({ params: idParamsSchema }), asyncHandler(notificationController.markRead));

export const emailRoutes = Router();

emailRoutes.use(requireRole('ADMIN'));
emailRoutes.get('/', validateRequest({ query: listEmailsQuerySchema }), asyncHandler(emailController.list));
emailRoutes.post('/prueba', validateRequest({ body: testEmailSchema }), asyncHandler(emailController.sendTest));
emailRoutes.post('/:id/reintentar', validateRequest({ params: idParamsSchema }), asyncHandler(emailController.retry));

export const internalEmailRoutes = Router();

internalEmailRoutes.use(requireService());
internalEmailRoutes.post('/', validateRequest({ body: internalEmailSchema }), asyncHandler(emailController.sendInternal));

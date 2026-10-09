import { Router } from 'express';
import { asyncHandler, validateRequest } from '@rumbo/shared';
import { authController } from '../controllers/authController.js';
import {
  emailOnlySchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from '../schemas/authSchemas.js';

export const authRoutes = Router();

authRoutes.post('/registro', validateRequest({ body: registerSchema }), asyncHandler(authController.register));
authRoutes.post('/verificar-correo', validateRequest({ body: verifyEmailSchema }), asyncHandler(authController.verifyEmail));
authRoutes.post('/reenviar-codigo', validateRequest({ body: emailOnlySchema }), asyncHandler(authController.resendVerification));
authRoutes.post('/login', validateRequest({ body: loginSchema }), asyncHandler(authController.login));
authRoutes.post('/refresh', asyncHandler(authController.refresh));
authRoutes.post('/logout', asyncHandler(authController.logout));
authRoutes.post('/olvide-contrasena', validateRequest({ body: emailOnlySchema }), asyncHandler(authController.forgotPassword));
authRoutes.post(
  '/restablecer-contrasena',
  validateRequest({ body: resetPasswordSchema }),
  asyncHandler(authController.resetPassword),
);
authRoutes.get('/me', asyncHandler(authController.me));

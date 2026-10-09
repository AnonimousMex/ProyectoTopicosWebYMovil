import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { AppError, UnauthorizedError, type AuthContext, type Role } from '@rumbo/shared';
import { env } from '../config/env.js';
import type { Access } from '../config/routeTable.js';

interface AccessTokenPayload {
  sub: string;
  role: Role;
  email: string;
  name: string;
}

/**
 * ÚNICO lugar del sistema donde se valida la sesión. Los microservicios
 * reciben la identidad ya verificada y firmada; si mañana cambia la
 * caducidad del token o el algoritmo, se toca este archivo y nada más.
 */
export function authenticate(access: Access): RequestHandler {
  return (req, _res, next) => {
    const header = req.header('authorization');
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;

    if (!token) {
      if (access === 'sesion') return next(new UnauthorizedError());
      return next();
    }

    try {
      const payload = jwt.verify(token, env.jwtAccessSecret, {
        issuer: 'rumbo-auth',
        audience: 'rumbo',
        algorithms: ['HS256'],
      }) as AccessTokenPayload;
      const auth: AuthContext = {
        userId: payload.sub,
        role: payload.role,
        email: payload.email,
        name: payload.name,
        requestId: req.requestId ?? 'sin-id',
        issuedAt: Date.now(),
      };
      req.auth = auth;
      next();
    } catch (error) {
      if (access !== 'sesion') return next();
      if ((error as Error).name === 'TokenExpiredError') {
        return next(new AppError(401, 'TOKEN_EXPIRADO', 'Tu sesión expiró'));
      }
      next(new UnauthorizedError('Sesión inválida'));
    }
  };
}

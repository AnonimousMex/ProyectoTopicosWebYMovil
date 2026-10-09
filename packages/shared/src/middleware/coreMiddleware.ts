import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ZodError, type ZodTypeAny, type z } from 'zod';
import type { Role } from '../contracts/roles.js';
import { AppError, ForbiddenError, NotFoundError, UnauthorizedError } from '../errors/appErrors.js';
import type { Logger } from '../logger/logger.js';
import { CONTEXT_HEADER, SIGNATURE_HEADER, verifyContext, type AuthContext } from '../security/internalAuth.js';
import './expressTypes.js';

export function asyncHandler<R extends Request = Request>(
  fn: (req: R, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    fn(req as R, res, next).catch(next);
  };
}

export function requestId(): RequestHandler {
  return (req, res, next) => {
    const incoming = req.header('x-request-id');
    req.requestId = incoming && incoming.length <= 64 ? incoming : randomUUID();
    res.setHeader('x-request-id', req.requestId);
    next();
  };
}

/**
 * Verifica la identidad firmada por el gateway (o por otro servicio).
 * Sin firma válida, ningún endpoint de negocio responde: los servicios no
 * quedan expuestos aunque alguien encuentre su puerto.
 */
export function gatewayContext(publicPaths: string[] = []): RequestHandler {
  return (req, _res, next) => {
    const context = verifyContext(req.header(CONTEXT_HEADER), req.header(SIGNATURE_HEADER));
    if (context) {
      req.auth = context;
      return next();
    }
    if (publicPaths.some((path) => req.path === path || req.path.startsWith(`${path}/`))) return next();
    next(new UnauthorizedError('Petición sin identidad válida'));
  };
}

export function requireAuth(req: Request): AuthContext {
  if (!req.auth) throw new UnauthorizedError();
  return req.auth;
}

export function requireRole(...roles: Role[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.auth) return next(new UnauthorizedError());
    if (req.auth.role !== 'SERVICE' && !roles.includes(req.auth.role)) return next(new ForbiddenError());
    next();
  };
}

/** Sólo llamadas firmadas por otro microservicio. */
export function requireService(): RequestHandler {
  return (req, _res, next) => {
    if (req.auth?.role !== 'SERVICE') return next(new ForbiddenError('Endpoint interno'));
    next();
  };
}

interface RequestSchemas {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

export function validateRequest(schemas: RequestSchemas): RequestHandler {
  return (req, _res, next) => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body);
      if (schemas.query) req.query = schemas.query.parse(req.query);
      if (schemas.params) req.params = schemas.params.parse(req.params);
      next();
    } catch (error) {
      next(error);
    }
  };
}

export type Infer<T extends ZodTypeAny> = z.infer<T>;

export function notFoundHandler(): RequestHandler {
  return (req, _res, next) => next(new NotFoundError(`Ruta no encontrada: ${req.method} ${req.path}`));
}

export function errorHandler(logger: Logger) {
  return (error: unknown, req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof ZodError) {
      return res.status(400).json({
        error: {
          code: 'VALIDACION',
          message: error.issues[0]?.message ?? 'Datos inválidos',
          details: error.issues.map((issue) => ({ campo: issue.path.join('.'), mensaje: issue.message })),
        },
      });
    }
    if (error instanceof AppError) {
      if (error.status >= 500) logger.warn({ err: error, requestId: req.requestId }, error.message);
      return res.status(error.status).json({ error: { code: error.code, message: error.message, details: error.details } });
    }
    if ((error as { type?: string }).type === 'entity.parse.failed') {
      return res.status(400).json({ error: { code: 'JSON_INVALIDO', message: 'El cuerpo no es JSON válido' } });
    }
    logger.error({ err: error, requestId: req.requestId }, 'Error no controlado');
    res.status(500).json({ error: { code: 'ERROR_INTERNO', message: 'Ocurrió un error inesperado' } });
  };
}

export function requestLogger(logger: Logger): RequestHandler {
  return (req, res, next) => {
    const started = performance.now();
    res.on('finish', () => {
      if (req.path === '/health') return;
      const ms = Math.round(performance.now() - started);
      const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'debug';
      logger[level]({ requestId: req.requestId, ms, status: res.statusCode }, `${req.method} ${req.originalUrl}`);
    });
    next();
  };
}

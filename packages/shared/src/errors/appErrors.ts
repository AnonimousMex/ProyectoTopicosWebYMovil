/**
 * Errores de aplicación con código HTTP y código estable para el frontend.
 * El errorHandler los traduce a { error: { code, message, details } }.
 */
export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Datos inválidos', details?: unknown) {
    super(400, 'VALIDACION', message, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Necesitas iniciar sesión') {
    super(401, 'NO_AUTENTICADO', message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'No tienes permiso para esta acción') {
    super(403, 'SIN_PERMISO', message);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Recurso no encontrado') {
    super(404, 'NO_ENCONTRADO', message);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, code = 'CONFLICTO', details?: unknown) {
    super(409, code, message, details);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = 'Demasiados intentos, espera un momento') {
    super(429, 'DEMASIADOS_INTENTOS', message);
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message: string, details?: unknown) {
    super(503, 'SERVICIO_NO_DISPONIBLE', message, details);
  }
}

export class PaymentDeclinedError extends AppError {
  constructor(message: string) {
    super(402, 'PAGO_RECHAZADO', message);
  }
}

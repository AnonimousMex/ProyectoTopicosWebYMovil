import rateLimit from 'express-rate-limit';

const message = (text: string) => ({ error: { code: 'DEMASIADOS_INTENTOS', message: text } });

/** Límite general por IP. */
export const globalLimiter = rateLimit({
  windowMs: 60_000,
  limit: 900,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: message('Demasiadas peticiones, espera un momento'),
});

/** Endpoints sensibles a fuerza bruta (login, registro, códigos). */
export const authLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: message('Demasiados intentos, espera unos minutos'),
});

/** Cobros: evita ráfagas de intentos con tarjetas. */
export const paymentLimiter = rateLimit({
  windowMs: 60_000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: message('Demasiados intentos de pago, espera un minuto'),
});

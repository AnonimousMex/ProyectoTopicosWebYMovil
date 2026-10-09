import type { RequestHandler } from 'express';
import { EventTypes, type AuditoriaPayload } from '@rumbo/shared';
import { eventBus, logger } from '../lib/infrastructure.js';

const SENSITIVE_GET = [/^\/api\/pedidos\/[^/]+\/guia\.pdf/, /^\/api\/reportes/, /^\/api\/bitacora/];

/**
 * Bitácora centralizada: antes cada trámite escribía la suya. Ahora el
 * gateway registra (vía evento) toda escritura, todo error y las lecturas
 * sensibles; el servicio de estadísticas la guarda.
 */
export function auditTrail(): RequestHandler {
  return (req, res, next) => {
    const started = performance.now();
    res.on('finish', () => {
      const path = req.originalUrl.split('?')[0];
      if (path.endsWith('/stream') || path.includes('/en-vivo/')) return;
      const worthy =
        req.method !== 'GET' || res.statusCode >= 400 || SENSITIVE_GET.some((pattern) => pattern.test(path));
      if (!worthy) return;

      const payload: AuditoriaPayload = {
        requestId: req.requestId ?? 'sin-id',
        userId: req.auth?.userId ?? null,
        rol: req.auth?.role ?? null,
        metodo: req.method,
        ruta: path,
        status: res.statusCode,
        ip: req.ip ?? null,
        userAgent: req.header('user-agent') ?? null,
        duracionMs: Math.round(performance.now() - started),
      };
      eventBus.publish(EventTypes.AUDITORIA_REGISTRADA, payload).catch((error) => {
        logger.warn({ err: error }, 'No se pudo registrar en bitácora');
      });
    });
    next();
  };
}

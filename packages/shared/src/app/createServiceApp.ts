import type { Server } from 'node:http';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { listBreakers } from '../http/circuitBreaker.js';
import type { Logger } from '../logger/logger.js';
import {
  errorHandler,
  gatewayContext,
  notFoundHandler,
  requestId,
  requestLogger,
} from '../middleware/coreMiddleware.js';

export interface ServiceAppOptions {
  name: string;
  logger: Logger;
  /** Registra las rutas propias del servicio. */
  registerRoutes: (app: Express) => void;
  /** Rutas que no requieren identidad firmada (ej. proveedores externos simulados). */
  publicPaths?: string[];
  /** Información extra para /health. */
  healthDetails?: () => Promise<Record<string, unknown>> | Record<string, unknown>;
}

/**
 * Plantilla (Template Method) de TODOS los microservicios.
 * Seguridad, logging, identidad, salud y manejo de errores se escriben una
 * sola vez aquí; cada servicio sólo aporta sus rutas. Cambiar una política
 * transversal = tocar un archivo, no cuarenta.
 */
export function createServiceApp(options: ServiceAppOptions): Express {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(requestId());
  app.use(requestLogger(options.logger));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.text({ type: ['application/xml', 'text/xml'], limit: '256kb' }));

  app.get('/health', async (_req, res) => {
    const details = options.healthDetails ? await options.healthDetails() : {};
    res.json({
      servicio: options.name,
      estado: 'ok',
      uptimeSeg: Math.round(process.uptime()),
      memoriaMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
      circuitos: listBreakers(),
      ...details,
    });
  });

  app.use(gatewayContext(options.publicPaths));
  options.registerRoutes(app);
  app.use(notFoundHandler());
  app.use(errorHandler(options.logger));
  return app;
}

export function startService(
  app: Express,
  port: number,
  logger: Logger,
  onShutdown: () => Promise<void> = async () => {},
): Server {
  const server = app.listen(port, () => logger.info(`Escuchando en http://localhost:${port}`));

  const shutdown = async (signal: string) => {
    logger.info(`${signal} recibido, cerrando…`);
    server.close();
    await onShutdown().catch((error) => logger.error({ err: error }, 'Error al cerrar'));
    process.exit(0);
  };
  process.once('SIGINT', () => void shutdown('SIGINT'));
  process.once('SIGTERM', () => void shutdown('SIGTERM'));
  return server;
}

import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { errorHandler, notFoundHandler, requestId, requestLogger, startService } from '@rumbo/shared';
import { env } from './config/env.js';
import { routeTable } from './config/routeTable.js';
import { eventBus, logger } from './lib/infrastructure.js';
import { auditTrail } from './middleware/auditTrail.js';
import { authenticate } from './middleware/authenticate.js';
import { authLimiter, globalLimiter, paymentLimiter } from './middleware/rateLimiters.js';
import { serviceProxy } from './proxy/serviceProxy.js';
import { bffRoutes, systemRoutes } from './routes/gatewayRoutes.js';

/**
 * API Gateway: cadena de responsabilidad de middlewares que se aplica a
 * TODA petición — id de petición, cabeceras de seguridad, CORS, límites,
 * sesión y bitácora — antes de llegar a cualquier microservicio.
 */
const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(requestId());
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false, // la API no sirve HTML; la CSP vive en el frontend
  }),
);
app.use(
  cors({
    origin: (origin, callback) => callback(null, !origin || env.corsOrigins.includes(origin)),
    credentials: true,
    exposedHeaders: ['x-request-id', 'idempotent-replayed', 'content-disposition'],
  }),
);
app.use(requestLogger(logger));
app.use(globalLimiter);
app.use(auditTrail());

app.get('/health', (_req, res) => res.json({ servicio: env.serviceName, estado: 'ok' }));

app.use(['/api/auth/login', '/api/auth/registro', '/api/auth/olvide-contrasena', '/api/auth/restablecer-contrasena', '/api/auth/verificar-correo', '/api/auth/reenviar-codigo'], authLimiter);
app.use('/api/pagos', paymentLimiter);

app.use('/api/bff', bffRoutes);
app.use('/api/sistema', systemRoutes);

for (const route of routeTable) {
  const proxy = serviceProxy(route.prefix, env.services[route.service]);
  const guard = authenticate(route.access);
  app.use((req, res, next) => {
    if (req.path !== route.prefix && !req.path.startsWith(`${route.prefix}/`)) return next();
    guard(req, res, (error?: unknown) => (error ? next(error) : proxy(req, res, next)));
  });
}

app.use(notFoundHandler());
app.use(errorHandler(logger));

startService(app, env.port, logger, () => eventBus.close());

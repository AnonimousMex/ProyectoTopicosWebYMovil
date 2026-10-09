import cookieParser from 'cookie-parser';
import { createServiceApp, prismaOutboxStore, startOutboxRelay, startService } from '@rumbo/shared';
import { env } from './config/env.js';
import { eventBus, logger, prisma } from './lib/infrastructure.js';
import { authRoutes } from './routes/authRoutes.js';
import { internalUserRoutes, userRoutes } from './routes/userRoutes.js';

const app = createServiceApp({
  name: env.serviceName,
  logger,
  // Las rutas de /api/auth (salvo /me) se usan antes de tener sesión.
  publicPaths: [
    '/api/auth/registro',
    '/api/auth/verificar-correo',
    '/api/auth/reenviar-codigo',
    '/api/auth/login',
    '/api/auth/refresh',
    '/api/auth/logout',
    '/api/auth/olvide-contrasena',
    '/api/auth/restablecer-contrasena',
  ],
  registerRoutes: (app) => {
    app.use(cookieParser());
    app.use('/api/auth', authRoutes);
    app.use('/api/usuarios', userRoutes);
    app.use('/internal/usuarios', internalUserRoutes);
  },
});

const stopRelay = startOutboxRelay(prismaOutboxStore(prisma.outboxEvent), eventBus, logger);

startService(app, env.port, logger, async () => {
  stopRelay();
  await eventBus.close();
  await prisma.$disconnect();
});

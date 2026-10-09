import { createServiceApp, startService } from '@rumbo/shared';
import { env } from './config/env.js';
import { logger, prisma } from './lib/infrastructure.js';
import { getChaos } from './middleware/chaosMiddleware.js';
import { catalogRoutes, chaosRoutes, internalProviderRoutes, providerRoutes } from './routes/mapRoutes.js';

const app = createServiceApp({
  name: env.serviceName,
  logger,
  healthDetails: async () => ({ caos: await getChaos() }),
  registerRoutes: (app) => {
    app.use('/api/mapas/caos', chaosRoutes);
    app.use('/api/mapas', catalogRoutes);
    app.use('/api/mapas', providerRoutes);
    app.use('/internal/mapas', internalProviderRoutes);
  },
});

startService(app, env.port, logger, () => prisma.$disconnect());

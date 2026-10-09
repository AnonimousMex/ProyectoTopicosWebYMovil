import { createServiceApp, startService } from '@rumbo/shared';
import { buildAnalyticsHandlers } from './consumers/analyticsEventHandlers.js';
import { env, eventBus, logger, prisma } from './lib/infrastructure.js';
import { auditRoutes, statsRoutes } from './routes/analyticsRoutes.js';

const app = createServiceApp({
  name: env.serviceName,
  logger,
  registerRoutes: (app) => {
    app.use('/api/estadisticas', statsRoutes);
    app.use('/api/bitacora', auditRoutes);
  },
});

await eventBus.subscribe('estadisticas', buildAnalyticsHandlers());

startService(app, env.port, logger, async () => {
  await eventBus.close();
  await prisma.$disconnect();
});

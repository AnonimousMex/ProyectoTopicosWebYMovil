import { createServiceApp, startService } from '@rumbo/shared';
import { env, logger, redis } from './lib/infrastructure.js';
import { adminRoutes, providerRoutes } from './routes/aiRoutes.js';

const app = createServiceApp({
  name: env.serviceName,
  logger,
  registerRoutes: (app) => {
    app.use('/proveedores', providerRoutes);
    app.use('/api/ia/proveedores-externos', adminRoutes);
  },
});

startService(app, env.port, logger, async () => {
  await redis.quit();
});

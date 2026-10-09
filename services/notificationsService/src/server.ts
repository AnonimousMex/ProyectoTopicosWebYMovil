import { createServiceApp, startService } from '@rumbo/shared';
import { env } from './config/env.js';
import { buildEventHandlers } from './consumers/notificationDispatcher.js';
import { eventBus, logger, prisma, realtime } from './lib/infrastructure.js';
import { emailRoutes, internalEmailRoutes, notificationRoutes } from './routes/notificationRoutes.js';
import { emailService } from './services/emailService.js';

const app = createServiceApp({
  name: env.serviceName,
  logger,
  healthDetails: () => ({ correo: emailService.driver }),
  registerRoutes: (app) => {
    app.use('/api/notificaciones', notificationRoutes);
    app.use('/api/correos', emailRoutes);
    app.use('/internal/correos', internalEmailRoutes);
  },
});

await eventBus.subscribe('notificaciones', buildEventHandlers());
const stopRetries = emailService.startRetryWorker();

startService(app, env.port, logger, async () => {
  stopRetries();
  await eventBus.close();
  await realtime.close();
  await prisma.$disconnect();
});

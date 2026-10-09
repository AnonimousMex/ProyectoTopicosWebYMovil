import { createServiceApp, prismaOutboxStore, startOutboxRelay, startService } from '@rumbo/shared';
import { paymentEventHandlers } from './consumers/paymentEventHandlers.js';
import { env, eventBus, logger, prisma } from './lib/infrastructure.js';
import { paymentRoutes } from './routes/paymentRoutes.js';

const app = createServiceApp({
  name: env.serviceName,
  logger,
  registerRoutes: (app) => {
    app.use('/api/pagos', paymentRoutes);
  },
});

await eventBus.subscribe('pagos', paymentEventHandlers);
const stopRelay = startOutboxRelay(prismaOutboxStore(prisma.outboxEvent), eventBus, logger);

startService(app, env.port, logger, async () => {
  stopRelay();
  await eventBus.close();
  await prisma.$disconnect();
});

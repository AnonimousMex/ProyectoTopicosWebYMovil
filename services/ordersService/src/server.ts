import { createServiceApp, prismaOutboxStore, startOutboxRelay, startService } from '@rumbo/shared';
import { env } from './config/env.js';
import { orderEventHandlers } from './consumers/orderEventHandlers.js';
import { eventBus, logger, prisma } from './lib/infrastructure.js';
import { internalOrderRoutes, orderRoutes, reportRoutes } from './routes/orderRoutes.js';

const app = createServiceApp({
  name: env.serviceName,
  logger,
  registerRoutes: (app) => {
    app.use('/api/pedidos', orderRoutes);
    app.use('/api/reportes', reportRoutes);
    app.use('/internal/pedidos', internalOrderRoutes);
  },
});

await eventBus.subscribe('pedidos', orderEventHandlers);
const stopRelay = startOutboxRelay(prismaOutboxStore(prisma.outboxEvent), eventBus, logger);

startService(app, env.port, logger, async () => {
  stopRelay();
  await eventBus.close();
  await prisma.$disconnect();
});

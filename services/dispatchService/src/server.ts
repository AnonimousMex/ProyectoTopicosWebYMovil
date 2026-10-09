import { createServiceApp, prismaOutboxStore, startOutboxRelay, startService } from '@rumbo/shared';
import { env } from './config/env.js';
import { dispatchEventHandlers } from './consumers/dispatchEventHandlers.js';
import { eventBus, logger, prisma } from './lib/infrastructure.js';
import {
  aiRoutes,
  assignmentRoutes,
  catalogRoutes,
  fleetRoutes,
  internalRoutes,
  quoteRoutes,
  simulationRoutes,
} from './routes/dispatchRoutes.js';
import { autoAssignService } from './services/autoAssignService.js';

const app = createServiceApp({
  name: env.serviceName,
  logger,
  registerRoutes: (app) => {
    app.use('/api/cotizaciones', quoteRoutes);
    app.use('/api', catalogRoutes);
    app.use('/api/flota', fleetRoutes);
    app.use('/api/asignacion', assignmentRoutes);
    app.use('/api/simulacion', simulationRoutes);
    app.use('/api/ia', aiRoutes);
    app.use('/internal', internalRoutes);
  },
});

await eventBus.subscribe('despacho', dispatchEventHandlers);
const stopRelay = startOutboxRelay(prismaOutboxStore(prisma.outboxEvent), eventBus, logger);
const stopAutoAssign = autoAssignService.start();

startService(app, env.port, logger, async () => {
  stopRelay();
  stopAutoAssign();
  await eventBus.close();
  await prisma.$disconnect();
});

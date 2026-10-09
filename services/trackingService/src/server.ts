import {
  EventTypes,
  createServiceApp,
  startService,
  type DomainEvent,
  type PedidoEstadoCambiadoPayload,
} from '@rumbo/shared';
import { env, eventBus, logger, realtime } from './lib/infrastructure.js';
import { trackingRoutes } from './routes/trackingRoutes.js';
import { trackingService } from './services/trackingService.js';

const app = createServiceApp({
  name: env.serviceName,
  logger,
  registerRoutes: (app) => {
    app.use('/api/seguimiento', trackingRoutes);
  },
});

await eventBus.subscribe('seguimiento', {
  [EventTypes.PEDIDO_ESTADO_CAMBIADO]: (event: DomainEvent<PedidoEstadoCambiadoPayload>) =>
    trackingService.onStatusChanged(event.payload.pedido),
});
await trackingService.resumeActive();

startService(app, env.port, logger, async () => {
  await eventBus.close();
  await realtime.close();
});

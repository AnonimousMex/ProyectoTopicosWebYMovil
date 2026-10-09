import {
  CircuitBreaker,
  EventBus,
  RealtimeChannel,
  ServiceClient,
  createLogger,
  numberEnv,
  portFromUrl,
  requireEnv,
} from '@rumbo/shared';

export const env = {
  serviceName: 'trackingService',
  port: portFromUrl(requireEnv('TRACKING_SERVICE_URL')),
  redisUrl: requireEnv('REDIS_URL'),
  mapsUrl: requireEnv('MAPS_SERVICE_URL'),
  /** Duración (acelerada) del trayecto simulado del repartidor. */
  simSeconds: numberEnv('TRACKING_SIM_SECONDS', 90),
};

export const logger = createLogger(env.serviceName);
export const eventBus = new EventBus(env.redisUrl, env.serviceName, logger);
export const realtime = new RealtimeChannel(env.redisUrl);
export const redis = realtime.redis;

export const mapsClient = new ServiceClient({
  caller: env.serviceName,
  target: 'Proveedor de mapas',
  baseUrl: env.mapsUrl,
  timeoutMs: 2500,
  breaker: new CircuitBreaker({ name: 'seguimiento→mapas', failureThreshold: 3, resetTimeoutMs: 15_000 }),
});

export const keys = {
  meta: (folio: string) => `tracking:meta:${folio}`,
  pos: (folio: string) => `tracking:pos:${folio}`,
  activos: 'tracking:activos',
  canal: (folio: string) => `tracking:${folio}`,
  canalTodos: 'tracking:todos',
};

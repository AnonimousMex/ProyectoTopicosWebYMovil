import { CircuitBreaker, EventBus, ServiceClient, createLogger, portFromUrl, requireEnv } from '@rumbo/shared';
import { PrismaClient } from '../generated/prisma/index.js';

export const env = {
  serviceName: 'paymentsService',
  port: portFromUrl(requireEnv('PAYMENTS_SERVICE_URL')),
  redisUrl: requireEnv('REDIS_URL'),
  ordersUrl: requireEnv('ORDERS_SERVICE_URL'),
};

export const logger = createLogger(env.serviceName);
export const prisma = new PrismaClient();
export const eventBus = new EventBus(env.redisUrl, env.serviceName, logger);

export const ordersClient = new ServiceClient({
  caller: env.serviceName,
  target: 'Servicio de pedidos',
  baseUrl: env.ordersUrl,
  timeoutMs: 3000,
  breaker: new CircuitBreaker({ name: 'pagos→pedidos', failureThreshold: 3, resetTimeoutMs: 15_000 }),
});

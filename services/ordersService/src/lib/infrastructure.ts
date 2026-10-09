import { CircuitBreaker, EventBus, ServiceClient, createLogger } from '@rumbo/shared';
import { env } from '../config/env.js';
import { PrismaClient } from '../generated/prisma/index.js';

export const logger = createLogger(env.serviceName);
export const prisma = new PrismaClient();
export const eventBus = new EventBus(env.redisUrl, env.serviceName, logger);

export const dispatchClient = new ServiceClient({
  caller: env.serviceName,
  target: 'Servicio de despacho',
  baseUrl: env.dispatchUrl,
  timeoutMs: 8000,
  breaker: new CircuitBreaker({ name: 'pedidos→despacho', failureThreshold: 3, resetTimeoutMs: 15_000 }),
});

import { CircuitBreaker, EventBus, ServiceClient, createLogger } from '@rumbo/shared';
import { env } from '../config/env.js';
import { PrismaClient } from '../generated/prisma/index.js';

// Instancias únicas (Singleton por proceso) de la infraestructura del servicio.
export const logger = createLogger(env.serviceName);
export const prisma = new PrismaClient();
export const eventBus = new EventBus(env.redisUrl, env.serviceName, logger);

export const notificationsClient = new ServiceClient({
  caller: env.serviceName,
  target: 'Servicio de notificaciones',
  baseUrl: env.notificationsUrl,
  timeoutMs: 5000,
  breaker: new CircuitBreaker({ name: 'auth→notificaciones', failureThreshold: 3, resetTimeoutMs: 20_000 }),
});

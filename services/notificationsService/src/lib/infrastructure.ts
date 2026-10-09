import { CircuitBreaker, EventBus, RealtimeChannel, ServiceClient, createLogger } from '@rumbo/shared';
import { env } from '../config/env.js';
import { PrismaClient } from '../generated/prisma/index.js';

export const logger = createLogger(env.serviceName);
export const prisma = new PrismaClient();
export const eventBus = new EventBus(env.redisUrl, env.serviceName, logger);
export const realtime = new RealtimeChannel(env.redisUrl);

export const authClient = new ServiceClient({
  caller: env.serviceName,
  target: 'Servicio de identidad',
  baseUrl: env.authUrl,
  timeoutMs: 3000,
  breaker: new CircuitBreaker({ name: 'notificaciones→auth', failureThreshold: 3, resetTimeoutMs: 15_000 }),
});

export const channels = {
  user: (userId: string) => `notif:usuario:${userId}`,
  admins: 'notif:admins',
};

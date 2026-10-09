import { EventBus, createLogger, portFromUrl, requireEnv } from '@rumbo/shared';
import { PrismaClient } from '../generated/prisma/index.js';

export const env = {
  serviceName: 'analyticsService',
  port: portFromUrl(requireEnv('ANALYTICS_SERVICE_URL')),
  redisUrl: requireEnv('REDIS_URL'),
};

export const logger = createLogger(env.serviceName);
export const prisma = new PrismaClient();
export const eventBus = new EventBus(env.redisUrl, env.serviceName, logger);

import { Redis } from 'ioredis';
import { createLogger, portFromUrl, requireEnv } from '@rumbo/shared';

export const env = {
  serviceName: 'aiService',
  port: portFromUrl(requireEnv('AI_SERVICE_URL')),
  redisUrl: requireEnv('REDIS_URL'),
};

export const logger = createLogger(env.serviceName);
export const redis = new Redis(env.redisUrl);

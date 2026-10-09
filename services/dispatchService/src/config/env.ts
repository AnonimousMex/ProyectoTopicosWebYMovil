import { portFromUrl, requireEnv } from '@rumbo/shared';

export const env = {
  serviceName: 'dispatchService',
  port: portFromUrl(requireEnv('DISPATCH_SERVICE_URL')),
  redisUrl: requireEnv('REDIS_URL'),
  mapsUrl: requireEnv('MAPS_SERVICE_URL'),
  aiUrl: requireEnv('AI_SERVICE_URL'),
};

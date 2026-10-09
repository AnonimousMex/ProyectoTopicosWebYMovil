import { optionalEnv, portFromUrl, requireEnv } from '@rumbo/shared';

export const env = {
  serviceName: 'ordersService',
  port: portFromUrl(requireEnv('ORDERS_SERVICE_URL')),
  redisUrl: requireEnv('REDIS_URL'),
  dispatchUrl: requireEnv('DISPATCH_SERVICE_URL'),
  webUrl: optionalEnv('WEB_PUBLIC_URL', 'http://localhost:5173'),
};

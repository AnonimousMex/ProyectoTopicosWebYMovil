import { isProduction, numberEnv, optionalEnv, requireEnv } from '@rumbo/shared';

export const env = {
  serviceName: 'apiGateway',
  port: numberEnv('PORT', numberEnv('GATEWAY_PORT', 4000)),
  redisUrl: requireEnv('REDIS_URL'),
  jwtAccessSecret: requireEnv('JWT_ACCESS_SECRET'),
  corsOrigins: optionalEnv('CORS_ORIGINS', 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  isProduction,
  services: {
    auth: requireEnv('AUTH_SERVICE_URL'),
    orders: requireEnv('ORDERS_SERVICE_URL'),
    payments: requireEnv('PAYMENTS_SERVICE_URL'),
    dispatch: requireEnv('DISPATCH_SERVICE_URL'),
    maps: requireEnv('MAPS_SERVICE_URL'),
    ai: requireEnv('AI_SERVICE_URL'),
    notifications: requireEnv('NOTIFICATIONS_SERVICE_URL'),
    analytics: requireEnv('ANALYTICS_SERVICE_URL'),
    tracking: requireEnv('TRACKING_SERVICE_URL'),
  },
};

export type ServiceKey = keyof typeof env.services;

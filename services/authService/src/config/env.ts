import { isProduction, numberEnv, optionalEnv, portFromUrl, requireEnv } from '@rumbo/shared';

export const env = {
  serviceName: 'authService',
  port: portFromUrl(requireEnv('AUTH_SERVICE_URL')),
  redisUrl: requireEnv('REDIS_URL'),
  notificationsUrl: requireEnv('NOTIFICATIONS_SERVICE_URL'),
  jwtAccessSecret: requireEnv('JWT_ACCESS_SECRET'),
  accessTokenTtl: optionalEnv('ACCESS_TOKEN_TTL', '15m'),
  refreshTokenTtlDays: numberEnv('REFRESH_TOKEN_TTL_DAYS', 7),
  refreshCookieName: 'rumbo_rt',
  maxFailedLogins: 5,
  lockMinutes: 15,
  codeTtlMinutes: 15,
  codeMaxAttempts: 5,
  isProduction,
};

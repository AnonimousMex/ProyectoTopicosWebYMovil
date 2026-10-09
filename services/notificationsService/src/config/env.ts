import { numberEnv, optionalEnv, portFromUrl, requireEnv } from '@rumbo/shared';

export const env = {
  serviceName: 'notificationsService',
  port: portFromUrl(requireEnv('NOTIFICATIONS_SERVICE_URL')),
  redisUrl: requireEnv('REDIS_URL'),
  authUrl: requireEnv('AUTH_SERVICE_URL'),
  webUrl: optionalEnv('WEB_PUBLIC_URL', 'http://localhost:5173'),
  mail: {
    driver: optionalEnv('MAIL_DRIVER', 'console') as 'smtp' | 'relay' | 'console',
    fromName: optionalEnv('MAIL_FROM_NAME', 'Rumbo Entregas'),
    fromAddress: optionalEnv('MAIL_FROM_ADDRESS', 'appprueba695@gmail.com'),
    smtpHost: optionalEnv('SMTP_HOST'),
    smtpPort: numberEnv('SMTP_PORT', 465),
    smtpUser: optionalEnv('SMTP_USER'),
    smtpPassword: optionalEnv('SMTP_PASSWORD'),
    relayUrl: optionalEnv('EMAIL_RELAY_URL'),
    relaySecret: optionalEnv('EMAIL_RELAY_SECRET'),
  },
  maxEmailAttempts: 5,
};

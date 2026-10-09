import pino, { type Logger } from 'pino';

export type { Logger };

export function createLogger(serviceName: string): Logger {
  const pretty = process.env.NODE_ENV !== 'production';
  return pino({
    name: serviceName,
    level: process.env.LOG_LEVEL ?? 'info',
    redact: {
      paths: ['req.headers.authorization', 'req.headers.cookie', '*.password', '*.tarjeta', '*.cvv'],
      censor: '[oculto]',
    },
    ...(pretty
      ? {
          transport: {
            target: 'pino-pretty',
            options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
          },
        }
      : {}),
  });
}

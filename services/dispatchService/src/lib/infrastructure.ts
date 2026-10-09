import { CircuitBreaker, EventBus, ServiceClient, createLogger } from '@rumbo/shared';
import { env } from '../config/env.js';
import { PrismaClient } from '../generated/prisma/index.js';

export const logger = createLogger(env.serviceName);
export const prisma = new PrismaClient();
export const eventBus = new EventBus(env.redisUrl, env.serviceName, logger);

/** Cada colaborador externo tiene su propio circuito: si uno cae, los demás siguen. */
export const breakers = {
  mapas: new CircuitBreaker({ name: 'despacho→mapas', failureThreshold: 3, resetTimeoutMs: 15_000 }),
  routeai: new CircuitBreaker({ name: 'despacho→ia:routeai', failureThreshold: 2, resetTimeoutMs: 20_000 }),
  xmlbrain: new CircuitBreaker({ name: 'despacho→ia:xmlbrain', failureThreshold: 2, resetTimeoutMs: 20_000 }),
};

export const mapsClient = new ServiceClient({
  caller: env.serviceName,
  target: 'Proveedor de mapas',
  baseUrl: env.mapsUrl,
  timeoutMs: 2500,
  breaker: breakers.mapas,
});

export const routeAiClient = new ServiceClient({
  caller: env.serviceName,
  target: 'RouteAI',
  baseUrl: env.aiUrl,
  timeoutMs: 1500,
  breaker: breakers.routeai,
});

export const xmlBrainClient = new ServiceClient({
  caller: env.serviceName,
  target: 'XmlBrain',
  baseUrl: env.aiUrl,
  timeoutMs: 1500,
  breaker: breakers.xmlbrain,
});

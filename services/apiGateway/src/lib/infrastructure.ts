import { EventBus, ServiceClient, createLogger } from '@rumbo/shared';
import { env, type ServiceKey } from '../config/env.js';

export const logger = createLogger(env.serviceName);
export const eventBus = new EventBus(env.redisUrl, env.serviceName, logger);

const names: Record<ServiceKey, string> = {
  auth: 'Identidad',
  orders: 'Pedidos',
  payments: 'Pagos',
  dispatch: 'Despacho',
  maps: 'Mapas',
  ai: 'IA externa',
  notifications: 'Notificaciones',
  analytics: 'Estadísticas',
  tracking: 'Seguimiento',
};

/** Clientes del BFF hacia cada servicio (reenvían la identidad del usuario). */
export const clients = Object.fromEntries(
  (Object.keys(env.services) as ServiceKey[]).map((key) => [
    key,
    new ServiceClient({ caller: env.serviceName, target: names[key], baseUrl: env.services[key], timeoutMs: 3500 }),
  ]),
) as Record<ServiceKey, ServiceClient>;

export const serviceNames = names;

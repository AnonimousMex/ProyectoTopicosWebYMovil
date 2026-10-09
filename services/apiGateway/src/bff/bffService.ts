import type { AuthContext } from '@rumbo/shared';
import type { ServiceKey } from '../config/env.js';
import { clients, logger } from '../lib/infrastructure.js';

export interface Section<T> {
  ok: boolean;
  data: T | null;
  error?: string;
}

/**
 * Cada sección se pide en paralelo y falla por separado: si estadísticas
 * está caído, el resto de la pantalla igual se pinta (degradación parcial).
 */
async function section<T>(service: ServiceKey, path: string, context: AuthContext): Promise<Section<T>> {
  try {
    return { ok: true, data: await clients[service].get<T>(path, { context }) };
  } catch (error) {
    logger.debug({ service, path, err: (error as Error).message }, 'Sección del BFF no disponible');
    return { ok: false, data: null, error: (error as Error).message };
  }
}

/**
 * Backend For Frontend: arma en UNA petición lo que cada pantalla de inicio
 * necesita. Antes la app hacía doce peticiones para pintar el inicio.
 */
export const bffService = {
  async clienteInicio(context: AuthContext) {
    const [activos, recientes, resumen, notificaciones] = await Promise.all([
      section('orders', '/api/pedidos?vista=app&activos=true&pageSize=10', context),
      section('orders', '/api/pedidos?vista=app&status=ENTREGADO&pageSize=3', context),
      section('orders', '/api/pedidos/resumen', context),
      section('notifications', '/api/notificaciones/conteo', context),
    ]);
    return { usuario: { id: context.userId, nombre: context.name }, activos, recientes, resumen, notificaciones };
  },

  async repartidorInicio(context: AuthContext) {
    const [perfil, ruta, entregas, notificaciones] = await Promise.all([
      section('dispatch', '/api/flota/yo', context),
      section('dispatch', '/api/flota/yo/ruta', context),
      section('orders', '/api/pedidos?vista=panel&activos=true&pageSize=20', context),
      section('notifications', '/api/notificaciones/conteo', context),
    ]);
    return { usuario: { id: context.userId, nombre: context.name }, perfil, ruta, entregas, notificaciones };
  },

  async panelInicio(context: AuthContext) {
    const [estadisticas, pool, enRuta, resumen, eventos, notificaciones] = await Promise.all([
      section('analytics', '/api/estadisticas/resumen?dias=14', context),
      section('dispatch', '/api/asignacion/pool', context),
      section('tracking', '/api/seguimiento', context),
      section('orders', '/api/pedidos/resumen', context),
      section('analytics', '/api/estadisticas/eventos?limit=12', context),
      section('notifications', '/api/notificaciones/conteo', context),
    ]);
    return { estadisticas, pool, enRuta, resumen, eventos, notificaciones };
  },
};

import type { ServiceKey } from './env.js';

export type Access = 'publica' | 'opcional' | 'sesion';

export interface RouteEntry {
  prefix: string;
  service: ServiceKey;
  access: Access;
  descripcion: string;
}

/**
 * Tabla de enrutamiento del gateway. Agregar un microservicio o un recurso
 * nuevo es agregar UNA línea aquí: la autenticación, la bitácora y los
 * encabezados se aplican solos.
 */
export const routeTable: RouteEntry[] = [
  { prefix: '/api/auth', service: 'auth', access: 'opcional', descripcion: 'Registro, sesión y recuperación' },
  { prefix: '/api/usuarios', service: 'auth', access: 'sesion', descripcion: 'Administración de usuarios' },
  { prefix: '/api/pedidos', service: 'orders', access: 'sesion', descripcion: 'Alta y ciclo de vida de pedidos' },
  { prefix: '/api/reportes', service: 'orders', access: 'sesion', descripcion: 'Reportes de gerencia' },
  { prefix: '/api/pagos', service: 'payments', access: 'sesion', descripcion: 'Cobros idempotentes' },
  { prefix: '/api/cotizaciones', service: 'dispatch', access: 'sesion', descripcion: 'Cotizador por medio' },
  { prefix: '/api/medios', service: 'dispatch', access: 'sesion', descripcion: 'Catálogo de medios' },
  { prefix: '/api/extras', service: 'dispatch', access: 'sesion', descripcion: 'Extras (seguro, urgente…)' },
  { prefix: '/api/flota', service: 'dispatch', access: 'sesion', descripcion: 'Repartidores' },
  { prefix: '/api/asignacion', service: 'dispatch', access: 'sesion', descripcion: 'Pool y algoritmo genético' },
  { prefix: '/api/simulacion', service: 'dispatch', access: 'sesion', descripcion: 'Laboratorio del algoritmo genético' },
  { prefix: '/api/ia/proveedores-externos', service: 'ai', access: 'sesion', descripcion: 'Simulador de proveedores de IA' },
  { prefix: '/api/ia', service: 'dispatch', access: 'sesion', descripcion: 'Proveedores de IA y circuitos' },
  { prefix: '/api/mapas', service: 'maps', access: 'sesion', descripcion: 'Proveedor de mapas simulado' },
  { prefix: '/api/notificaciones', service: 'notifications', access: 'sesion', descripcion: 'Avisos en la app' },
  { prefix: '/api/correos', service: 'notifications', access: 'sesion', descripcion: 'Bitácora de correos' },
  { prefix: '/api/estadisticas', service: 'analytics', access: 'sesion', descripcion: 'KPIs y eventos' },
  { prefix: '/api/bitacora', service: 'analytics', access: 'sesion', descripcion: 'Bitácora de accesos' },
  { prefix: '/api/seguimiento', service: 'tracking', access: 'sesion', descripcion: 'Seguimiento en tiempo real' },
];

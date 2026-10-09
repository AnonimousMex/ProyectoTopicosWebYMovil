import type { OrderStatus, Urgencia } from './orderStatus.js';
import type { Role } from './roles.js';

/**
 * Catálogo de eventos de dominio que viajan por el bus (Redis Streams).
 * Los eventos son "gordos": llevan una foto del pedido para que cada
 * suscriptor (cliente, repartidor, admin, notificaciones, estadísticas, IA)
 * reaccione sin tener que llamar de vuelta al servicio de pedidos.
 */
export const EventTypes = {
  PEDIDO_CREADO: 'pedido.creado',
  PEDIDO_ESTADO_CAMBIADO: 'pedido.estado_cambiado',
  PAGO_ACREDITADO: 'pago.acreditado',
  PAGO_RECHAZADO: 'pago.rechazado',
  PAGO_REEMBOLSADO: 'pago.reembolsado',
  ENVIO_ASIGNADO: 'envio.asignado',
  ENVIO_LLEGO_DESTINO: 'envio.llego_destino',
  USUARIO_REGISTRADO: 'usuario.registrado',
  AUDITORIA_REGISTRADA: 'auditoria.registrada',
  OPTIMIZACION_COMPLETADA: 'optimizacion.completada',
} as const;

export type EventType = (typeof EventTypes)[keyof typeof EventTypes];

export interface DomainEvent<T = unknown> {
  id: string;
  type: EventType | string;
  source: string;
  occurredAt: string;
  correlationId?: string;
  payload: T;
}

export interface Punto {
  direccion: string;
  lat: number;
  lng: number;
  lugarId?: string | null;
}

export interface PedidoSnapshot {
  orderId: string;
  folio: string;
  clienteId: string;
  clienteNombre: string;
  clienteEmail: string;
  repartidorId: string | null;
  repartidorNombre: string | null;
  status: OrderStatus;
  medioId: string | null;
  medioPreferido: string | null;
  total: number;
  origen: Punto;
  destino: Punto;
  pesoKg: number;
  volumenL: number;
  fragil: boolean;
  urgencia: Urgencia;
  fechaLimite: string;
  extras: string[];
  sugerencia: { medio: string; motivo: string; proveedor: string } | null;
  etaMinutos: number | null;
  distanciaKm: number;
  createdAt: string;
}

export interface PedidoCreadoPayload {
  pedido: PedidoSnapshot;
}

export interface PedidoEstadoCambiadoPayload {
  pedido: PedidoSnapshot;
  anterior: OrderStatus | null;
  nuevo: OrderStatus;
  actor: { id: string; rol: Role };
  motivo?: string | null;
}

export interface PagoAcreditadoPayload {
  paymentId: string;
  orderId: string;
  folio: string;
  clienteId: string;
  monto: number;
  ultimos4: string;
  marca: string;
}

export interface PagoRechazadoPayload {
  orderId: string;
  folio: string;
  clienteId: string;
  monto: number;
  motivo: string;
}

export interface PagoReembolsadoPayload {
  paymentId: string;
  orderId: string;
  folio: string;
  clienteId: string;
  clienteEmail: string;
  clienteNombre: string;
  monto: number;
}

export interface EnvioAsignadoPayload {
  orderId: string;
  folio: string;
  repartidorId: string;
  repartidorNombre: string;
  medioId: string;
  etaMinutos: number;
  secuencia: number;
  runId: string | null;
}

export interface EnvioLlegoDestinoPayload {
  orderId: string;
  folio: string;
  clienteId: string;
  repartidorId: string | null;
}

export interface UsuarioRegistradoPayload {
  userId: string;
  email: string;
  nombre: string;
  rol: Role;
}

export interface AuditoriaPayload {
  requestId: string;
  userId: string | null;
  rol: Role | null;
  metodo: string;
  ruta: string;
  status: number;
  ip: string | null;
  userAgent: string | null;
  duracionMs: number;
}

export interface OptimizacionCompletadaPayload {
  runId: string;
  tipo: 'REAL' | 'SIMULACION';
  asignados: number;
  costoTotal: number;
  mejoraVsGreedyPct: number;
}

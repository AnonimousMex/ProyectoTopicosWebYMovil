import type { OrderStatus, UserRole } from '@rumbo/shared/contracts';

export interface User {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: UserRole;
  emailVerified: boolean;
  active: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface PedidoApp {
  folio: string;
  estado: OrderStatus;
  estadoTexto: string;
  eta: string | null;
  destino: string;
  total: number;
  medio: string | null;
  creado: string;
}

export interface PuntoMapa {
  direccion: string;
  lat: number;
  lng: number;
}

export interface PedidoPanel extends PedidoApp {
  id: string;
  cliente: { id: string; nombre: string; email: string };
  destinatario: { nombre: string; telefono: string | null };
  origen: PuntoMapa;
  destinoPunto: PuntoMapa;
  paquete: { pesoKg: number; largoCm: number; anchoCm: number; altoCm: number; volumenL: number; fragil: boolean };
  urgencia: string;
  urgenciaTexto: string;
  fechaLimite: string;
  extras: string[];
  valorDeclarado: number;
  notas: string | null;
  medioPreferido: string | null;
  medioAsignado: string | null;
  repartidor: { id: string; nombre: string | null } | null;
  sugerencia: { medio: string; motivo: string | null; proveedor: string | null; confianza: number | null } | null;
  ruta: { distanciaKm: number; minutosEstimados: number; etaMinutos: number | null; polilinea: [number, number][] | null; estimada: boolean };
  precio: { medio: string; lineas: Array<{ concepto: string; monto: number }>; subtotal: number; iva: number; total: number };
  fechas: Record<string, string | null>;
  historial: Array<{ de: OrderStatus | null; a: OrderStatus; aTexto: string; actorRol: string; motivo: string | null; fecha: string }>;
  accionesDisponibles: OrderStatus[];
}

export interface Lugar {
  id: string;
  nombre: string;
  tipo: string;
  direccion: string;
  colonia: string;
  lat: number;
  lng: number;
  zonaId: string;
}

export interface Zona {
  id: string;
  nombre: string;
  color: string;
  centroLat: number;
  centroLng: number;
  radioKm: number;
}

export interface Medio {
  id: string;
  nombre: string;
  descripcion: string;
  icono: string;
  color: string;
  activo: boolean;
  orden: number;
  velocidadKmh: number;
  sensibilidadTrafico: number;
  costoBase: number;
  costoPorKm: number;
  costoPorKg: number;
  costoOperativoKm: number;
  pesoMaxKg: number;
  volumenMaxL: number;
  distanciaMaxKm: number;
  capacidadPaquetes: number;
  emisionesGCO2Km: number;
  repartidores?: number;
  estrategiaPropia?: boolean;
}

export interface Extra {
  id: string;
  nombre: string;
  descripcion: string;
  tipo: 'PORCENTAJE_VALOR' | 'PORCENTAJE_TOTAL' | 'FIJO';
  valor: number;
  minimo: number;
  activo: boolean;
  orden: number;
}

export interface IntentoIA {
  proveedor: string;
  nombre: string;
  formato: string;
  resultado: 'ok' | 'falla' | 'circuito_abierto' | 'no_factible';
  latenciaMs: number;
  detalle?: string;
  respuestaOriginal?: string;
}

export interface SugerenciaIA {
  medio: string;
  motivo: string;
  confianza: number;
  proveedor: string;
  proveedorNombre: string;
  usoRespaldo: boolean;
  intentos: IntentoIA[];
}

export interface OpcionCotizacion {
  medioId: string;
  nombre: string;
  icono: string;
  color: string;
  factible: boolean;
  motivos: string[];
  distanciaKm: number;
  minutos: number;
  llegadaEstimada: string;
  cumpleLimite: boolean;
  emisionesG: number;
  precio: { lineas: Array<{ concepto: string; monto: number }>; subtotal: number; iva: number; total: number };
}

export interface Cotizacion {
  paquete: { pesoKg: number; volumenL: number };
  ruta: {
    distanciaKm: number;
    lineaRectaKm: number;
    nivelTrafico: number;
    minutosAuto: number;
    zonaOrigen: string;
    zonaDestino: string;
    polilinea: [number, number][];
    estimada: boolean;
  };
  opciones: OpcionCotizacion[];
  sugerencia: SugerenciaIA | null;
}

export interface Repartidor {
  id: string;
  nombre: string;
  email: string;
  medioId: string;
  activo: boolean;
  disponible: boolean;
  baseNombre: string;
  baseLat: number;
  baseLng: number;
  calificacion: number;
  entregasCompletadas: number;
  cargaActual?: number;
  medio: { id: string; nombre: string; color: string; icono: string; capacidadPaquetes: number };
}

export interface Envio {
  id: string;
  orderId: string;
  folio: string;
  origenDireccion: string;
  origenLat: number;
  origenLng: number;
  destinoDireccion: string;
  destinoLat: number;
  destinoLng: number;
  pesoKg: number;
  volumenL: number;
  fragil: boolean;
  urgencia: string;
  fechaLimite: string;
  medioPreferido: string | null;
  status: string;
  repartidorId: string | null;
  medioId: string | null;
  secuencia: number | null;
  etaMinutos: number | null;
  sugerenciaMedio: string | null;
  sugerenciaMotivo: string | null;
  createdAt: string;
}

export interface Posicion {
  folio: string;
  lat: number;
  lng: number;
  progreso: number;
  etaSeg: number;
  rumbo: number;
  status: string;
  medioId: string | null;
  repartidorNombre: string | null;
  ts: number;
}

export interface Notificacion {
  id: string;
  titulo: string;
  mensaje: string;
  tipo: string;
  folio: string | null;
  leida: boolean;
  createdAt: string;
}

export type BffSection<T> = { ok: boolean; data: T | null; error?: string };

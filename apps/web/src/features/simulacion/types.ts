export interface Gene {
  e: number;
  v: number;
}

export interface Parada {
  envio: number;
  llegadaMin: number;
  minutosTarde: number;
}

export interface RutaSolucion {
  vehiculo: number;
  paradas: Parada[];
  km: number;
  minutos: number;
  costo: number;
}

export interface Solucion {
  costo: number;
  costoOperativo: number;
  penalizacion: number;
  violaciones: number;
  tardias: number;
  rutas: RutaSolucion[];
}

export interface GaFrame {
  generacion: number;
  mejorCosto: number;
  costoPromedio: number;
  peorCosto: number;
  diversidad: number;
  factibles: number;
  histograma: number[];
  cruces: number;
  mutaciones: number;
  mejoro: boolean;
  mejor: { genes: Gene[]; solucion: Solucion } | null;
}

export interface Escenario {
  puntos: Array<{ lat: number; lng: number; etiqueta: string }>;
  envios: Array<{
    id: string;
    folio: string;
    origenIdx: number;
    destinoIdx: number;
    pesoKg: number;
    volumenL: number;
    fragil: boolean;
    urgencia: string;
    minutosLimite: number;
    medioPreferido: string | null;
    sugerencia: string | null;
  }>;
  vehiculos: Array<{ id: string; nombre: string; medioId: string; baseIdx: number; capacidad: number }>;
  medios: Record<string, { nombre: string; color: string; icono: string }>;
  matrizEstimada: boolean;
}

export interface GaResultado {
  mejor: { genes: Gene[]; solucion: Solucion };
  greedy: { solucion: Solucion };
  generaciones: number;
  duracionMs: number;
  mejoraVsGreedyPct: number;
  detenidoPorPaciencia: boolean;
  envios: number;
  vehiculos: number;
  compatibles: number[];
  motivosIncompatibilidad: string[][];
  asignados?: number;
  sinAsignar?: number;
  foliosSinAsignar?: Array<{ folio: string; motivo: string }>;
}

export interface GaParams {
  poblacion: number;
  generaciones: number;
  tasaCruce: number;
  tasaMutacion: number;
  elitismo: number;
  torneo: number;
  semilla: number;
  paciencia: number;
}

export interface EscenarioParams {
  envios: number;
  flota: Record<string, number>;
  semilla: number;
  hora?: number;
  porcentajeUrgentes: number;
  porcentajePreferencia: number;
}

/** Paleta para distinguir la ruta de cada vehículo en el mapa. */
export const ROUTE_PALETTE = ['#6366F1', '#F97316', '#10B981', '#06B6D4', '#EC4899', '#EAB308', '#8B5CF6', '#EF4444', '#14B8A6', '#3B82F6', '#84CC16', '#F43F5E', '#0EA5E9', '#A855F7', '#22C55E', '#FB923C'];
export const routeColor = (index: number) => ROUTE_PALETTE[index % ROUTE_PALETTE.length];

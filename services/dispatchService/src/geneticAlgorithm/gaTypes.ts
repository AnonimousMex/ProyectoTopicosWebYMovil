import type { Urgencia } from '@rumbo/shared/contracts';
import type { LatLng, PerfilMedio } from '../domain/dispatchTypes.js';

export interface GaEnvio {
  id: string;
  folio: string;
  pesoKg: number;
  volumenL: number;
  fragil: boolean;
  urgencia: Urgencia;
  urgente: boolean;
  /** Minutos desde "ahora" hasta la fecha límite. */
  minutosLimite: number;
  medioPreferido: string | null;
  sugerencia: string | null;
  origenIdx: number;
  destinoIdx: number;
}

export interface GaVehiculo {
  id: string;
  nombre: string;
  medioId: string;
  baseIdx: number;
  /** Paquetes que todavía puede tomar en esta corrida. */
  capacidad: number;
}

export interface GaMatriz {
  distancias: number[][];
  lineaRecta: number[][];
  trafico: number[][];
  zonas: string[];
}

/** Instancia del problema: datos planos, serializables al worker. */
export interface GaProblem {
  envios: GaEnvio[];
  vehiculos: GaVehiculo[];
  perfiles: Record<string, PerfilMedio>;
  puntos: LatLng[];
  matriz: GaMatriz;
}

export interface GaParams {
  poblacion: number;
  generaciones: number;
  tasaCruce: number;
  tasaMutacion: number;
  elitismo: number;
  torneo: number;
  semilla: number;
  /** Detener si no mejora en N generaciones (0 = nunca). */
  paciencia: number;
}

/** Un gen = (envío, vehículo). El ORDEN de los genes define la secuencia de cada ruta. */
export interface Gene {
  e: number;
  v: number;
}

export type Chromosome = Gene[];

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

export interface Individuo {
  genes: Chromosome;
  solucion: Solucion;
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
  /** Sólo se envía cuando mejora la mejor solución (para aligerar el stream). */
  mejor: { genes: Chromosome; solucion: Solucion } | null;
}

export interface GaResult {
  mejor: Individuo;
  greedy: Individuo;
  generaciones: number;
  duracionMs: number;
  mejoraVsGreedyPct: number;
  detenidoPorPaciencia: boolean;
}

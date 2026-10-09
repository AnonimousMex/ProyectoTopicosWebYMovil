import type { Urgencia } from '@rumbo/shared/contracts';

/** Parámetros de un medio tal como vienen de la base (editables en el panel). */
export interface PerfilMedio {
  id: string;
  nombre: string;
  icono: string;
  color: string;
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
}

export interface Paquete {
  pesoKg: number;
  volumenL: number;
  fragil: boolean;
  urgencia: Urgencia;
}

/** Un tramo entre dos puntos según el proveedor de mapas (o su estimación de respaldo). */
export interface Tramo {
  distanciaKm: number;
  lineaRectaKm: number;
  factorTrafico: number;
  zonaOrigen: string;
  zonaDestino: string;
}

export interface Evaluacion {
  medioId: string;
  factible: boolean;
  motivos: string[];
  distanciaKm: number;
  minutos: number;
  costoOperativo: number;
}

/** Lo único que el dominio entiende de cualquier IA, sin importar su formato. */
export interface Sugerencia {
  medio: string;
  motivo: string;
  confianza: number;
  proveedor: string;
}

export interface LatLng {
  lat: number;
  lng: number;
}

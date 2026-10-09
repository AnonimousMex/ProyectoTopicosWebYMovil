import type { LatLng, Tramo } from '../domain/dispatchTypes.js';
import { logger, mapsClient } from '../lib/infrastructure.js';

export interface RutaDetalle extends Tramo {
  minutosAuto: number;
  nivelTrafico: number;
  polilinea: [number, number][];
  /** true cuando el proveedor de mapas no respondió y se usó la estimación local. */
  estimada: boolean;
}

export interface MatrizRutas {
  distancias: number[][];
  lineaRecta: number[][];
  trafico: number[][];
  zonas: string[];
  estimada: boolean;
}

interface MapsRouteResponse {
  distanciaKm: number;
  lineaRectaKm: number;
  minutosAuto: number;
  nivelTrafico: number;
  factorTrafico: number;
  zonaOrigen: { id: string };
  zonaDestino: { id: string };
  polilinea: [number, number][];
}

const TORTUOSIDAD_RESPALDO = 1.33;
const TRAFICO_RESPALDO = 1.35;

function haversineKm(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/**
 * Fachada sobre el proveedor de mapas con degradación elegante: si el mapa
 * no responde (o su circuito está abierto) se estima con geometría local y
 * se marca `estimada: true`. Cotizar y asignar nunca se quedan en "la rueda".
 */
export const routeMetricsService = {
  haversineKm,

  async route(origen: LatLng, destino: LatLng): Promise<RutaDetalle> {
    try {
      const ruta = await mapsClient.post<MapsRouteResponse>('/internal/mapas/ruta', { origen, destino });
      return {
        distanciaKm: ruta.distanciaKm,
        lineaRectaKm: ruta.lineaRectaKm,
        factorTrafico: ruta.factorTrafico,
        zonaOrigen: ruta.zonaOrigen.id,
        zonaDestino: ruta.zonaDestino.id,
        minutosAuto: ruta.minutosAuto,
        nivelTrafico: ruta.nivelTrafico,
        polilinea: ruta.polilinea,
        estimada: false,
      };
    } catch (error) {
      logger.warn({ err: (error as Error).message }, 'Mapa no disponible: usando estimación local de ruta');
      const lineaRectaKm = haversineKm(origen, destino);
      const distanciaKm = lineaRectaKm * TORTUOSIDAD_RESPALDO;
      return {
        distanciaKm: Number(distanciaKm.toFixed(3)),
        lineaRectaKm: Number(lineaRectaKm.toFixed(3)),
        factorTrafico: TRAFICO_RESPALDO,
        zonaOrigen: 'desconocida',
        zonaDestino: 'desconocida',
        minutosAuto: Number(((distanciaKm / 32) * 60 * TRAFICO_RESPALDO).toFixed(1)),
        nivelTrafico: 0.25,
        polilinea: [
          [origen.lat, origen.lng],
          [destino.lat, destino.lng],
        ],
        estimada: true,
      };
    }
  },

  async matrix(puntos: LatLng[], hora?: number): Promise<MatrizRutas> {
    try {
      const matriz = await mapsClient.post<Omit<MatrizRutas, 'estimada'>>(
        '/internal/mapas/matriz',
        { puntos, hora },
        { timeoutMs: 5000 },
      );
      return { ...matriz, estimada: false };
    } catch (error) {
      logger.warn({ err: (error as Error).message }, 'Mapa no disponible: matriz estimada localmente');
      const n = puntos.length;
      const lineaRecta = Array.from({ length: n }, (_, i) =>
        Array.from({ length: n }, (_, j) => (i === j ? 0 : haversineKm(puntos[i], puntos[j]))),
      );
      return {
        lineaRecta,
        distancias: lineaRecta.map((row) => row.map((km) => km * TORTUOSIDAD_RESPALDO)),
        trafico: lineaRecta.map((row) => row.map(() => TRAFICO_RESPALDO)),
        zonas: puntos.map(() => 'desconocida'),
        estimada: true,
      };
    }
  },
};

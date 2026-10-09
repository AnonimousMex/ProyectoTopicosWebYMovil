import { env } from '../config/env.js';
import { currentLocalHour, haversineKm, simulateStreetPolyline, type LatLng } from '../geo/geoMath.js';
import { prisma } from '../lib/infrastructure.js';
import type { Lugar, Zona } from '../generated/prisma/index.js';

let zonasCache: { zonas: Zona[]; at: number } | null = null;

async function getZonas(): Promise<Zona[]> {
  if (zonasCache && Date.now() - zonasCache.at < 60_000) return zonasCache.zonas;
  const zonas = await prisma.zona.findMany();
  zonasCache = { zonas, at: Date.now() };
  return zonas;
}

function zoneFor(point: LatLng, zonas: Zona[]): Zona {
  const urban = zonas.filter((zona) => zona.id !== 'periferia');
  let best: Zona | null = null;
  let bestRatio = Infinity;
  for (const zona of urban) {
    const ratio = haversineKm(point, { lat: zona.centroLat, lng: zona.centroLng }) / zona.radioKm;
    if (ratio < bestRatio) {
      bestRatio = ratio;
      best = zona;
    }
  }
  if (best && bestRatio <= 1.6) return best;
  return zonas.find((zona) => zona.id === 'periferia') ?? best ?? zonas[0];
}

const congestion = (zona: Zona, hour: number) => zona.perfilTrafico[hour] ?? 0.3;

/** Factor multiplicador del tiempo en auto: 1 = libre, 2.4 = muy congestionado. */
const trafficFactor = (level: number) => Number((1 + level * 1.4).toFixed(3));

function pairMetrics(a: LatLng, b: LatLng, zonas: Zona[], hour: number) {
  const zonaA = zoneFor(a, zonas);
  const zonaB = zoneFor(b, zonas);
  const lineaRectaKm = haversineKm(a, b);
  const tortuosidad = (zonaA.tortuosidad + zonaB.tortuosidad) / 2;
  const nivel = (congestion(zonaA, hour) + congestion(zonaB, hour)) / 2;
  return {
    zonaA,
    zonaB,
    lineaRectaKm,
    distanciaKm: lineaRectaKm * tortuosidad,
    nivelTrafico: nivel,
    factorTrafico: trafficFactor(nivel),
  };
}

const round = (value: number, digits = 3) => Number(value.toFixed(digits));

export const mapService = {
  async catalog() {
    const [lugares, zonas] = await Promise.all([
      prisma.lugar.findMany({ orderBy: { nombre: 'asc' } }),
      getZonas(),
    ]);
    return {
      lugares: lugares.map((lugar: Lugar) => ({
        id: lugar.id,
        nombre: lugar.nombre,
        tipo: lugar.tipo,
        direccion: `${lugar.direccion}, ${lugar.colonia}, ${lugar.cp} Morelia, Mich.`,
        colonia: lugar.colonia,
        lat: lugar.lat,
        lng: lugar.lng,
        zonaId: lugar.zonaId,
      })),
      zonas: zonas.map(({ perfilTrafico: _perfil, ...zona }) => zona),
    };
  },

  async route(origen: LatLng, destino: LatLng, hora?: number) {
    const zonas = await getZonas();
    const hour = hora ?? currentLocalHour();
    const metrics = pairMetrics(origen, destino, zonas, hour);
    return {
      distanciaKm: round(metrics.distanciaKm),
      lineaRectaKm: round(metrics.lineaRectaKm),
      minutosAuto: round((metrics.distanciaKm / env.velocidadReferenciaKmh) * 60 * metrics.factorTrafico, 1),
      nivelTrafico: round(metrics.nivelTrafico, 2),
      factorTrafico: metrics.factorTrafico,
      zonaOrigen: { id: metrics.zonaA.id, nombre: metrics.zonaA.nombre },
      zonaDestino: { id: metrics.zonaB.id, nombre: metrics.zonaB.nombre },
      hora: hour,
      polilinea: simulateStreetPolyline(origen, destino),
      proveedor: 'Rumbo Maps (simulado)',
    };
  },

  /** Matriz de distancias/tráfico para el algoritmo genético (n×n en una llamada). */
  async matrix(puntos: LatLng[], hora?: number) {
    const zonas = await getZonas();
    const hour = hora ?? currentLocalHour();
    const n = puntos.length;
    const distancias: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
    const lineaRecta: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
    const trafico: number[][] = Array.from({ length: n }, () => new Array(n).fill(1));

    for (let i = 0; i < n; i += 1) {
      for (let j = i + 1; j < n; j += 1) {
        const metrics = pairMetrics(puntos[i], puntos[j], zonas, hour);
        distancias[i][j] = distancias[j][i] = round(metrics.distanciaKm);
        lineaRecta[i][j] = lineaRecta[j][i] = round(metrics.lineaRectaKm);
        trafico[i][j] = trafico[j][i] = metrics.factorTrafico;
      }
    }
    const zonasPunto = puntos.map((punto) => zoneFor(punto, zonas).id);
    return { hora: hour, distancias, lineaRecta, trafico, zonas: zonasPunto };
  },

  async traffic(hora?: number) {
    const zonas = await getZonas();
    const hour = hora ?? currentLocalHour();
    return {
      hora: hour,
      zonas: zonas.map((zona) => ({
        id: zona.id,
        nombre: zona.nombre,
        color: zona.color,
        centroLat: zona.centroLat,
        centroLng: zona.centroLng,
        radioKm: zona.radioKm,
        nivel: round(congestion(zona, hour), 2),
        factor: trafficFactor(congestion(zona, hour)),
        perfil: zona.perfilTrafico,
      })),
    };
  },
};

import type { PerfilMedio } from '../src/domain/dispatchTypes.js';
import type { GaProblem } from '../src/geneticAlgorithm/gaTypes.js';

export const perfil = (id: string, overrides: Partial<PerfilMedio> = {}): PerfilMedio => ({
  id,
  nombre: id,
  icono: id,
  color: '#000000',
  velocidadKmh: 30,
  sensibilidadTrafico: 0.5,
  costoBase: 30,
  costoPorKm: 6,
  costoPorKg: 2,
  costoOperativoKm: 3,
  pesoMaxKg: 20,
  volumenMaxL: 100,
  distanciaMaxKm: 30,
  capacidadPaquetes: 5,
  emisionesGCO2Km: 50,
  ...overrides,
});

export const tramo = (overrides = {}) => ({
  distanciaKm: 5,
  lineaRectaKm: 4,
  factorTrafico: 1.5,
  zonaOrigen: 'norte',
  zonaDestino: 'sur',
  ...overrides,
});

/** Problema sintético: n envíos en una cuadrícula y una flota mixta. */
export function buildProblem(envios = 12): GaProblem {
  const puntos = Array.from({ length: envios * 2 + 4 }, (_, i) => ({ lat: 19.66 + (i % 6) * 0.012, lng: -101.23 + Math.floor(i / 6) * 0.012 }));
  const km = (a: (typeof puntos)[number], b: (typeof puntos)[number]) => Math.hypot(a.lat - b.lat, a.lng - b.lng) * 111;
  const lineaRecta = puntos.map((a) => puntos.map((b) => km(a, b)));
  return {
    puntos,
    matriz: {
      lineaRecta,
      distancias: lineaRecta.map((row) => row.map((v) => v * 1.3)),
      trafico: lineaRecta.map((row) => row.map(() => 1.4)),
      zonas: puntos.map(() => 'norte'),
    },
    perfiles: {
      camioneta: perfil('camioneta', { velocidadKmh: 28, sensibilidadTrafico: 1, pesoMaxKg: 800, capacidadPaquetes: 10, costoOperativoKm: 6.5 }),
      motocicleta: perfil('motocicleta', { velocidadKmh: 34, sensibilidadTrafico: 0.35, pesoMaxKg: 15, capacidadPaquetes: 6 }),
      dron: perfil('dron', { velocidadKmh: 55, sensibilidadTrafico: 0, pesoMaxKg: 2.5, capacidadPaquetes: 2, distanciaMaxKm: 14 }),
    },
    vehiculos: [
      { id: 'v1', nombre: 'Camioneta', medioId: 'camioneta', baseIdx: envios * 2, capacidad: 10 },
      { id: 'v2', nombre: 'Moto 1', medioId: 'motocicleta', baseIdx: envios * 2 + 1, capacidad: 6 },
      { id: 'v3', nombre: 'Moto 2', medioId: 'motocicleta', baseIdx: envios * 2 + 2, capacidad: 6 },
      { id: 'v4', nombre: 'Dron', medioId: 'dron', baseIdx: envios * 2 + 3, capacidad: 2 },
    ],
    envios: Array.from({ length: envios }, (_, i) => ({
      id: `e${i}`,
      folio: `F${i}`,
      pesoKg: i % 5 === 0 ? 30 : i % 3 === 0 ? 1.5 : 6,
      volumenL: 10,
      fragil: false,
      urgencia: i % 4 === 0 ? ('CRITICA' as const) : ('NORMAL' as const),
      urgente: false,
      minutosLimite: 60 + i * 15,
      medioPreferido: null,
      sugerencia: 'motocicleta',
      origenIdx: i,
      destinoIdx: envios + i,
    })),
  };
}

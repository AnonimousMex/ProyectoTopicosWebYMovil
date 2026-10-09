export interface LatLng {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_KM = 6371;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Distancia en línea recta (gran círculo). */
export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/** PRNG determinista (mulberry32) para que la misma ruta salga siempre igual. */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashPoints(a: LatLng, b: LatLng): number {
  const text = `${a.lat.toFixed(5)},${a.lng.toFixed(5)}>${b.lat.toFixed(5)},${b.lng.toFixed(5)}`;
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * Genera una polilínea "tipo calle": avanza en tramos alternando
 * norte-sur / oriente-poniente (como una cuadrícula urbana) con algo de
 * ruido determinista. No es una ruta real, pero se ve y se comporta como una.
 */
export function simulateStreetPolyline(from: LatLng, to: LatLng): [number, number][] {
  const random = seededRandom(hashPoints(from, to));
  const straight = haversineKm(from, to);
  const segments = Math.max(4, Math.min(16, Math.round(straight * 1.6)));
  const points: [number, number][] = [[from.lat, from.lng]];
  let current = { ...from };

  for (let i = 1; i < segments; i += 1) {
    const progress = i / segments;
    const target = {
      lat: from.lat + (to.lat - from.lat) * progress + (random() - 0.5) * 0.0025,
      lng: from.lng + (to.lng - from.lng) * progress + (random() - 0.5) * 0.0025,
    };
    // Tramo en "L": primero una dirección, luego la otra.
    const latFirst = random() > 0.5;
    const corner = latFirst ? { lat: target.lat, lng: current.lng } : { lat: current.lat, lng: target.lng };
    points.push([corner.lat, corner.lng], [target.lat, target.lng]);
    current = target;
  }
  const lastCorner = random() > 0.5 ? [to.lat, current.lng] : [current.lat, to.lng];
  points.push(lastCorner as [number, number], [to.lat, to.lng]);
  return points.map(([lat, lng]) => [Number(lat.toFixed(6)), Number(lng.toFixed(6))]);
}

export function polylineLengthKm(points: [number, number][]): number {
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    total += haversineKm({ lat: points[i - 1][0], lng: points[i - 1][1] }, { lat: points[i][0], lng: points[i][1] });
  }
  return total;
}

/** Hora local de Morelia (America/Mexico_City). */
export function currentLocalHour(): number {
  return Number(
    new Intl.DateTimeFormat('es-MX', { hour: 'numeric', hour12: false, timeZone: 'America/Mexico_City' }).format(new Date()),
  ) % 24;
}

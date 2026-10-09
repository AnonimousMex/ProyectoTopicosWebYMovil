import { EventTypes, ForbiddenError, NotFoundError, type AuthContext, type PedidoSnapshot } from '@rumbo/shared';
import { env, eventBus, keys, logger, mapsClient, realtime, redis } from '../lib/infrastructure.js';

type Coord = [number, number];

export interface TrackingMeta {
  folio: string;
  orderId: string;
  clienteId: string;
  repartidorId: string | null;
  repartidorNombre: string | null;
  medioId: string | null;
  status: string;
  polilinea: Coord[];
  inicio: number | null;
  duracionSeg: number;
  rutaEstimada: boolean;
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

const timers = new Map<string, NodeJS.Timeout>();
const TICK_MS = 1500;

function haversine(a: Coord, b: Coord): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/** Punto a cierta fracción del recorrido total de la polilínea. */
function pointAlong(polyline: Coord[], fraction: number): { punto: Coord; rumbo: number } {
  const lengths = polyline.slice(1).map((point, i) => haversine(polyline[i], point));
  const total = lengths.reduce((sum, value) => sum + value, 0) || 1;
  let target = Math.min(1, Math.max(0, fraction)) * total;
  for (let i = 0; i < lengths.length; i += 1) {
    if (target <= lengths[i] || i === lengths.length - 1) {
      const t = lengths[i] ? Math.min(1, target / lengths[i]) : 1;
      const [a, b] = [polyline[i], polyline[i + 1]];
      const rumbo = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
      return { punto: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], rumbo };
    }
    target -= lengths[i];
  }
  return { punto: polyline[polyline.length - 1], rumbo: 0 };
}

async function saveMeta(meta: TrackingMeta) {
  await redis.set(keys.meta(meta.folio), JSON.stringify(meta), 'EX', 60 * 60 * 24);
}

async function getMeta(folio: string): Promise<TrackingMeta | null> {
  const raw = await redis.get(keys.meta(folio));
  return raw ? (JSON.parse(raw) as TrackingMeta) : null;
}

async function publishPosition(meta: TrackingMeta, punto: Coord, progreso: number, rumbo: number) {
  const posicion: Posicion = {
    folio: meta.folio,
    lat: Number(punto[0].toFixed(6)),
    lng: Number(punto[1].toFixed(6)),
    progreso: Number(progreso.toFixed(3)),
    etaSeg: meta.inicio ? Math.max(0, Math.round(meta.duracionSeg * (1 - progreso))) : 0,
    rumbo: Math.round(rumbo),
    status: meta.status,
    medioId: meta.medioId,
    repartidorNombre: meta.repartidorNombre,
    ts: Date.now(),
  };
  await redis.set(keys.pos(meta.folio), JSON.stringify(posicion), 'EX', 60 * 60 * 24);
  await realtime.publish(keys.canal(meta.folio), posicion);
  await realtime.publish(keys.canalTodos, posicion);
  return posicion;
}

/** Obtiene la ruta del mapa; si el mapa está caído, línea recta (el seguimiento no se detiene). */
async function routeFor(pedido: PedidoSnapshot): Promise<{ polilinea: Coord[]; estimada: boolean }> {
  try {
    const ruta = await mapsClient.post<{ polilinea: Coord[] }>('/internal/mapas/ruta', {
      origen: { lat: pedido.origen.lat, lng: pedido.origen.lng },
      destino: { lat: pedido.destino.lat, lng: pedido.destino.lng },
    });
    return { polilinea: ruta.polilinea, estimada: false };
  } catch (error) {
    logger.warn({ err: (error as Error).message, folio: pedido.folio }, 'Mapa no disponible: trayecto en línea recta');
    return {
      polilinea: [
        [pedido.origen.lat, pedido.origen.lng],
        [pedido.destino.lat, pedido.destino.lng],
      ],
      estimada: true,
    };
  }
}

function stopSimulation(folio: string) {
  const timer = timers.get(folio);
  if (timer) clearInterval(timer);
  timers.delete(folio);
}

function runSimulation(meta: TrackingMeta) {
  stopSimulation(meta.folio);
  const timer = setInterval(async () => {
    try {
      const elapsed = (Date.now() - (meta.inicio ?? Date.now())) / 1000;
      const progreso = Math.min(1, elapsed / meta.duracionSeg);
      const { punto, rumbo } = pointAlong(meta.polilinea, progreso);
      await publishPosition(meta, punto, progreso, rumbo);
      if (progreso >= 1) {
        stopSimulation(meta.folio);
        meta.status = 'EN_DESTINO';
        await saveMeta(meta);
        await publishPosition(meta, punto, 1, rumbo);
        await eventBus.publish(EventTypes.ENVIO_LLEGO_DESTINO, {
          orderId: meta.orderId,
          folio: meta.folio,
          clienteId: meta.clienteId,
          repartidorId: meta.repartidorId,
        });
      }
    } catch (error) {
      logger.error({ err: error, folio: meta.folio }, 'Error en la simulación de seguimiento');
    }
  }, TICK_MS);
  timers.set(meta.folio, timer);
}

export const trackingService = {
  /** Reacciona a cada cambio de estado del pedido. */
  async onStatusChanged(pedido: PedidoSnapshot) {
    const existing = await getMeta(pedido.folio);
    const meta: TrackingMeta = existing ?? {
      folio: pedido.folio,
      orderId: pedido.orderId,
      clienteId: pedido.clienteId,
      repartidorId: pedido.repartidorId,
      repartidorNombre: pedido.repartidorNombre,
      medioId: pedido.medioId,
      status: pedido.status,
      polilinea: [
        [pedido.origen.lat, pedido.origen.lng],
        [pedido.destino.lat, pedido.destino.lng],
      ],
      inicio: null,
      duracionSeg: env.simSeconds,
      rutaEstimada: true,
    };
    Object.assign(meta, {
      status: pedido.status,
      repartidorId: pedido.repartidorId,
      repartidorNombre: pedido.repartidorNombre,
      medioId: pedido.medioId,
    });

    switch (pedido.status) {
      case 'ASIGNADO':
      case 'RECOLECTADO':
        await saveMeta(meta);
        await redis.sadd(keys.activos, pedido.folio);
        await publishPosition(meta, [pedido.origen.lat, pedido.origen.lng], 0, 0);
        break;
      case 'EN_CAMINO': {
        const ruta = await routeFor(pedido);
        meta.polilinea = ruta.polilinea;
        meta.rutaEstimada = ruta.estimada;
        meta.inicio = Date.now();
        // Un dron "vuela" más rápido en la demo; una bici, más lento.
        const factor: Record<string, number> = { dron: 0.6, motocicleta: 0.85, bicicleta: 1.3, camioneta: 1 };
        meta.duracionSeg = Math.round(env.simSeconds * (factor[meta.medioId ?? ''] ?? 1));
        await saveMeta(meta);
        await redis.sadd(keys.activos, pedido.folio);
        runSimulation(meta);
        break;
      }
      case 'ENTREGADO':
      case 'CANCELADO':
      case 'FALLIDO':
        stopSimulation(pedido.folio);
        await saveMeta(meta);
        await redis.srem(keys.activos, pedido.folio);
        if (pedido.status === 'ENTREGADO') {
          await publishPosition(meta, [pedido.destino.lat, pedido.destino.lng], 1, 0);
        }
        break;
      default:
        break;
    }
  },

  /** Al reiniciar el servicio, retoma las simulaciones en curso desde Redis. */
  async resumeActive() {
    const folios = await redis.smembers(keys.activos);
    for (const folio of folios) {
      const meta = await getMeta(folio);
      if (meta?.status === 'EN_CAMINO' && meta.inicio) runSimulation(meta);
    }
    if (folios.length) logger.info({ activos: folios.length }, 'Seguimientos retomados');
  },

  async get(folio: string, auth: AuthContext) {
    const meta = await getMeta(folio);
    if (!meta) throw new NotFoundError('Este pedido aún no tiene seguimiento');
    const allowed =
      auth.role === 'ADMIN' ||
      (auth.role === 'CLIENTE' && meta.clienteId === auth.userId) ||
      (auth.role === 'REPARTIDOR' && meta.repartidorId === auth.userId);
    if (!allowed) throw new ForbiddenError('Este pedido no es tuyo');
    const raw = await redis.get(keys.pos(folio));
    return { meta, posicion: raw ? (JSON.parse(raw) as Posicion) : null };
  },

  async listActive() {
    const folios = await redis.smembers(keys.activos);
    const posiciones = await Promise.all(folios.map((folio) => redis.get(keys.pos(folio))));
    return posiciones.filter((raw): raw is string => Boolean(raw)).map((raw) => JSON.parse(raw) as Posicion);
  },
};

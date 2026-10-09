import { routeAiClient } from '../lib/infrastructure.js';
import type { AiProvider, ContextoIA, ResultadoProveedor } from './aiProvider.js';

interface RouteAiResponse {
  route_hint: 'VAN' | 'MOTO' | 'BIKE' | 'DRONE';
  score: number;
  rationale_code: string;
  alternatives: Array<{ route_hint: string; score: number }>;
  model: string;
}

const HINT_TO_MEDIO: Record<string, string> = {
  VAN: 'camioneta',
  MOTO: 'motocicleta',
  BIKE: 'bicicleta',
  DRONE: 'dron',
};

const RATIONALE_ES: Record<string, string> = {
  HEAVY_PARCEL: 'paquete pesado, requiere capacidad de carga',
  LONG_DISTANCE_CAPACITY: 'distancia larga con buena capacidad',
  HIGH_TRAFFIC_SMALL_PARCEL: 'tráfico alto y paquete pequeño',
  FAST_URBAN_DELIVERY: 'entrega urbana rápida',
  SHORT_TRIP_LOW_COST: 'trayecto corto a bajo costo',
  URGENT_LIGHT_PARCEL: 'paquete ligero y urgente',
  LIGHT_PARCEL_DIRECT_PATH: 'paquete ligero en vuelo directo',
};

/** Adapter: traduce el dialecto JSON de RouteAI (route_hint, score) al dominio. */
export class RouteAiAdapter implements AiProvider {
  readonly id = 'routeai';
  readonly nombre = 'RouteAI Cloud';
  readonly formato = 'JSON' as const;

  async sugerir(contexto: ContextoIA): Promise<ResultadoProveedor> {
    const { paquete, tramo } = contexto;
    const response = await routeAiClient.post<RouteAiResponse>(
      '/proveedores/routeai/v1/recommend',
      {
        parcel: { weight_kg: paquete.pesoKg, volume_l: paquete.volumenL, fragile: paquete.fragil },
        trip: { distance_km: tramo.distanciaKm, straight_km: tramo.lineaRectaKm },
        traffic_level: tramo.nivelTrafico,
        priority: contexto.urgente || paquete.urgencia === 'CRITICA' ? 'HIGH' : paquete.urgencia === 'ALTA' ? 'MID' : 'LOW',
        deadline_min: Math.max(0, Math.round(contexto.minutosLimite)),
      },
    );

    // Si el medio sugerido no está disponible, se toma la mejor alternativa del proveedor.
    const candidates = [{ route_hint: response.route_hint, score: response.score }, ...response.alternatives];
    const chosen =
      candidates.find((candidate) => contexto.mediosFactibles.includes(HINT_TO_MEDIO[candidate.route_hint])) ??
      candidates[0];

    return {
      sugerencia: {
        medio: HINT_TO_MEDIO[chosen.route_hint] ?? 'motocicleta',
        motivo: RATIONALE_ES[response.rationale_code] ?? response.rationale_code.toLowerCase().replace(/_/g, ' '),
        confianza: chosen.score,
        proveedor: this.id,
      },
      respuestaOriginal: JSON.stringify(response, null, 2),
    };
  }
}

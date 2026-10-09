/**
 * "RouteAI Cloud" — proveedor externo simulado.
 * Habla su propio dialecto JSON en inglés: route_hint, score, rationale_code.
 * Rumbo NO controla este formato; por eso existe un adaptador del lado de dispatch.
 */
export interface RouteAiRequest {
  parcel: { weight_kg: number; volume_l: number; fragile?: boolean };
  trip: { distance_km: number; straight_km: number };
  traffic_level: number;
  priority: 'LOW' | 'MID' | 'HIGH';
  deadline_min: number;
}

export interface RouteAiResponse {
  route_hint: 'VAN' | 'MOTO' | 'BIKE' | 'DRONE';
  score: number;
  rationale_code: string;
  alternatives: Array<{ route_hint: string; score: number }>;
  model: string;
}

const clamp = (value: number) => Math.max(0.05, Math.min(0.99, value));

export function recommendRoute(input: RouteAiRequest): RouteAiResponse {
  const { parcel, trip, traffic_level: traffic, priority, deadline_min: deadline } = input;
  const noise = () => (Math.random() - 0.5) * 0.08;

  const scores: Record<RouteAiResponse['route_hint'], number> = {
    VAN: 0.35 + (parcel.weight_kg > 15 ? 0.5 : 0) + (parcel.volume_l > 80 ? 0.3 : 0) - traffic * 0.35 + (trip.distance_km > 15 ? 0.2 : 0),
    MOTO: 0.55 + traffic * 0.3 - (parcel.weight_kg > 12 ? 0.6 : 0) - (parcel.volume_l > 60 ? 0.5 : 0) + (priority === 'HIGH' ? 0.1 : 0),
    BIKE: 0.5 - trip.distance_km * 0.06 - (parcel.weight_kg > 6 ? 0.6 : 0) + traffic * 0.15 + (priority === 'LOW' ? 0.15 : 0),
    DRONE:
      0.4 +
      (parcel.weight_kg <= 2.5 && parcel.volume_l <= 8 ? 0.35 : -1) -
      (trip.straight_km > 12 ? 1 : 0) +
      (deadline < 45 ? 0.15 : 0) -
      (parcel.fragile ? 0.2 : 0),
  };

  const ranked = (Object.entries(scores) as Array<[RouteAiResponse['route_hint'], number]>)
    .map(([hint, score]) => [hint, clamp(score + noise())] as const)
    .sort((a, b) => b[1] - a[1]);
  const [hint, score] = ranked[0];

  const rationale: Record<RouteAiResponse['route_hint'], string> = {
    VAN: parcel.weight_kg > 15 ? 'HEAVY_PARCEL' : 'LONG_DISTANCE_CAPACITY',
    MOTO: traffic > 0.55 ? 'HIGH_TRAFFIC_SMALL_PARCEL' : 'FAST_URBAN_DELIVERY',
    BIKE: 'SHORT_TRIP_LOW_COST',
    DRONE: deadline < 45 ? 'URGENT_LIGHT_PARCEL' : 'LIGHT_PARCEL_DIRECT_PATH',
  };

  return {
    route_hint: hint,
    score: Number(score.toFixed(3)),
    rationale_code: rationale[hint],
    alternatives: ranked.slice(1).map(([routeHint, value]) => ({ route_hint: routeHint, score: Number(value.toFixed(3)) })),
    model: 'routeai-v2.3',
  };
}

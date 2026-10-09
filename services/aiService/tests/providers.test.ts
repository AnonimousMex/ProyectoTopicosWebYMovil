import { describe, expect, it } from 'vitest';
import { recommendRoute } from '../src/providers/routeAiProvider.js';
import { suggestXml } from '../src/providers/xmlBrainProvider.js';

describe('Proveedores externos simulados', () => {
  it('RouteAI responde en su dialecto JSON', () => {
    const response = recommendRoute({ parcel: { weight_kg: 1, volume_l: 3 }, trip: { distance_km: 6, straight_km: 4 }, traffic_level: 0.8, priority: 'MID', deadline_min: 90 });
    expect(['VAN', 'MOTO', 'BIKE', 'DRONE']).toContain(response.route_hint);
    expect(response.score).toBeGreaterThan(0);
  });

  it('XmlBrain recomienda camioneta para carga voluminosa, en XML', () => {
    const xml = suggestXml('<solicitud><paquete peso="40" volumen="200" fragil="false"/><viaje distancia="8" recta="6" trafico="0.4"/><prioridad>NORMAL</prioridad></solicitud>');
    expect(xml).toContain('<vehicle code="CAM"');
    expect(xml).toContain('<confidence>');
  });
});

import { portFromUrl, requireEnv } from '@rumbo/shared';

export const env = {
  serviceName: 'mapsService',
  port: portFromUrl(requireEnv('MAPS_SERVICE_URL')),
  /** Velocidad urbana de referencia de un auto sin tráfico. */
  velocidadReferenciaKmh: 32,
};

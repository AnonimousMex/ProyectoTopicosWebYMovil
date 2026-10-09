import { CircuitOpenError } from '@rumbo/shared';
import type { AiProvider, ContextoIA } from '../aiProviders/aiProvider.js';
import { InternalHeuristicProvider } from '../aiProviders/internalHeuristicProvider.js';
import { RouteAiAdapter } from '../aiProviders/routeAiAdapter.js';
import { XmlBrainAdapter } from '../aiProviders/xmlBrainAdapter.js';
import type { Sugerencia } from '../domain/dispatchTypes.js';
import { breakers, logger, prisma } from '../lib/infrastructure.js';
import { catalogService } from './catalogService.js';

export interface IntentoIA {
  proveedor: string;
  nombre: string;
  formato: string;
  resultado: 'ok' | 'falla' | 'circuito_abierto' | 'no_factible';
  latenciaMs: number;
  detalle?: string;
  respuestaOriginal?: string;
}

export interface SugerenciaDetallada extends Sugerencia {
  proveedorNombre: string;
  usoRespaldo: boolean;
  intentos: IntentoIA[];
}

const internal = new InternalHeuristicProvider(() => catalogService.activeMedios());
const providers = new Map<string, AiProvider>(
  [new RouteAiAdapter(), new XmlBrainAdapter(), internal].map((provider) => [provider.id, provider]),
);

async function orderedProviders(): Promise<AiProvider[]> {
  const configs = await prisma.aiProviderConfig.findMany({ where: { activo: true }, orderBy: { prioridad: 'asc' } });
  const ordered = configs.map((config) => providers.get(config.id)).filter((p): p is AiProvider => Boolean(p));
  // El modelo interno siempre queda como última red de seguridad.
  if (!ordered.includes(internal)) ordered.push(internal);
  return ordered;
}

/**
 * Cadena de proveedores (Chain of Responsibility + Circuit Breaker): se
 * pregunta al primero habilitado; si falla, tarda o su circuito está
 * abierto, pasa al siguiente. El resultado siempre es una Sugerencia.
 */
export const aiSuggestionService = {
  async sugerir(contexto: ContextoIA): Promise<SugerenciaDetallada> {
    const intentos: IntentoIA[] = [];

    for (const provider of await orderedProviders()) {
      const started = performance.now();
      try {
        const { sugerencia, respuestaOriginal } = await provider.sugerir(contexto);
        const latenciaMs = Math.round(performance.now() - started);
        if (!contexto.mediosFactibles.includes(sugerencia.medio)) {
          intentos.push({
            proveedor: provider.id,
            nombre: provider.nombre,
            formato: provider.formato,
            resultado: 'no_factible',
            latenciaMs,
            detalle: `Sugirió ${sugerencia.medio}, que no es factible para este paquete`,
            respuestaOriginal,
          });
          continue;
        }
        intentos.push({
          proveedor: provider.id,
          nombre: provider.nombre,
          formato: provider.formato,
          resultado: 'ok',
          latenciaMs,
          respuestaOriginal,
        });
        return {
          ...sugerencia,
          proveedorNombre: provider.nombre,
          usoRespaldo: intentos.length > 1,
          intentos,
        };
      } catch (error) {
        intentos.push({
          proveedor: provider.id,
          nombre: provider.nombre,
          formato: provider.formato,
          resultado: error instanceof CircuitOpenError ? 'circuito_abierto' : 'falla',
          latenciaMs: Math.round(performance.now() - started),
          detalle: (error as Error).message,
        });
        logger.debug({ proveedor: provider.id, err: (error as Error).message }, 'Proveedor de IA no disponible');
      }
    }

    return {
      medio: contexto.mediosFactibles[0] ?? 'camioneta',
      motivo: 'ningún proveedor respondió; se eligió el primer medio factible',
      confianza: 0.2,
      proveedor: 'ninguno',
      proveedorNombre: 'Sin IA',
      usoRespaldo: true,
      intentos,
    };
  },

  async listProviders() {
    const configs = await prisma.aiProviderConfig.findMany({ orderBy: { prioridad: 'asc' } });
    return configs.map((config) => ({
      ...config,
      circuito: config.id in breakers ? breakers[config.id as keyof typeof breakers].snapshot() : null,
    }));
  },

  updateProvider: (id: string, data: { activo?: boolean; prioridad?: number }) =>
    prisma.aiProviderConfig.update({ where: { id }, data }),

  resetBreaker(id: string) {
    if (id in breakers) breakers[id as keyof typeof breakers].reset();
  },
};

import { redis } from '../lib/infrastructure.js';

export const PROVIDERS = {
  routeai: { nombre: 'RouteAI Cloud', formato: 'JSON', latenciaBaseMs: 220 },
  xmlbrain: { nombre: 'XmlBrain Logistics', formato: 'XML', latenciaBaseMs: 380 },
} as const;

export type ProviderId = keyof typeof PROVIDERS;

export interface ChaosSettings {
  caido: boolean;
  tasaFallo: number;
  latenciaMs: number;
}

const key = (provider: ProviderId) => `ia:caos:${provider}`;
const statsKey = (provider: ProviderId) => `ia:stats:${provider}`;

export const chaosService = {
  async get(provider: ProviderId): Promise<ChaosSettings> {
    const raw = await redis.hgetall(key(provider));
    return {
      caido: raw.caido === '1',
      tasaFallo: Number(raw.tasaFallo ?? 0),
      latenciaMs: Number(raw.latenciaMs ?? PROVIDERS[provider].latenciaBaseMs),
    };
  },

  async update(provider: ProviderId, changes: Partial<ChaosSettings>): Promise<ChaosSettings> {
    const values: Record<string, string> = {};
    if (changes.caido !== undefined) values.caido = changes.caido ? '1' : '0';
    if (changes.tasaFallo !== undefined) values.tasaFallo = String(changes.tasaFallo);
    if (changes.latenciaMs !== undefined) values.latenciaMs = String(changes.latenciaMs);
    if (Object.keys(values).length) await redis.hset(key(provider), values);
    return this.get(provider);
  },

  async record(provider: ProviderId, outcome: 'ok' | 'falla' | 'caido') {
    await redis.hincrby(statsKey(provider), outcome, 1);
  },

  async overview() {
    return Promise.all(
      (Object.keys(PROVIDERS) as ProviderId[]).map(async (id) => {
        const stats = await redis.hgetall(statsKey(id));
        return {
          id,
          ...PROVIDERS[id],
          caos: await this.get(id),
          llamadas: { ok: Number(stats.ok ?? 0), falla: Number(stats.falla ?? 0), caido: Number(stats.caido ?? 0) },
        };
      }),
    );
  },
};

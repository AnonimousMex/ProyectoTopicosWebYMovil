import type { Logger } from '../logger/logger.js';
import type { EventBus } from './eventBus.js';

export interface OutboxRecord {
  id: string;
  type: string;
  payload: unknown;
  correlationId: string | null;
}

export interface OutboxStore {
  fetchPending(limit: number): Promise<OutboxRecord[]>;
  markPublished(id: string): Promise<void>;
  markFailed(id: string, error: string): Promise<void>;
}

/**
 * Transactional Outbox: el servicio guarda el evento en SU base dentro de la
 * MISMA transacción que el cambio de negocio. Este relay lo publica después.
 * Si Redis o un suscriptor falla, el cambio de negocio ya quedó firme y el
 * evento se reintenta: atomicidad y aviso quedan separados.
 */
export function startOutboxRelay(store: OutboxStore, bus: EventBus, logger: Logger, intervalMs = 400) {
  let stopped = false;
  let busy = false;

  const tick = async () => {
    if (busy || stopped) return;
    busy = true;
    try {
      const pending = await store.fetchPending(50);
      for (const record of pending) {
        try {
          await bus.publish(record.type, record.payload, {
            id: record.id,
            correlationId: record.correlationId ?? undefined,
          });
          await store.markPublished(record.id);
        } catch (error) {
          await store.markFailed(record.id, String((error as Error).message));
          logger.warn({ err: error, outboxId: record.id }, 'No se pudo publicar evento del outbox; se reintentará');
        }
      }
    } catch (error) {
      logger.error({ err: error }, 'Error en el relay del outbox');
    } finally {
      busy = false;
    }
  };

  const timer = setInterval(tick, intervalMs);
  return () => {
    stopped = true;
    clearInterval(timer);
  };
}

interface OutboxDelegate {
  findMany(args: unknown): Promise<Array<{ id: string; type: string; payload: unknown; correlationId: string | null }>>;
  update(args: unknown): Promise<unknown>;
}

/** Adaptador del outbox para cualquier cliente Prisma con el modelo OutboxEvent. */
export function prismaOutboxStore(delegate: OutboxDelegate): OutboxStore {
  return {
    fetchPending: (limit) =>
      delegate.findMany({
        where: { publishedAt: null, attempts: { lt: 20 } },
        orderBy: { createdAt: 'asc' },
        take: limit,
        select: { id: true, type: true, payload: true, correlationId: true },
      }),
    markPublished: async (id) => {
      await delegate.update({ where: { id }, data: { publishedAt: new Date() } });
    },
    markFailed: async (id, error) => {
      await delegate.update({ where: { id }, data: { attempts: { increment: 1 }, lastError: error.slice(0, 500) } });
    },
  };
}

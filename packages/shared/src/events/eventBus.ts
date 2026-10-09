import { randomUUID } from 'node:crypto';
import { Redis } from 'ioredis';
import type { DomainEvent } from '../contracts/events.js';
import type { Logger } from '../logger/logger.js';

export const EVENTS_STREAM = 'rumbo:events';
export const DEAD_LETTER_STREAM = 'rumbo:events:dlq';
const MAX_ATTEMPTS = 5;
const RETRY_IDLE_MS = 10_000;

export type EventHandler<T = unknown> = (event: DomainEvent<T>) => Promise<void>;

export interface PublishOptions {
  id?: string;
  correlationId?: string;
}

/**
 * Bus de eventos sobre Redis Streams (patrón Observer distribuido).
 *
 * Cada microservicio es un "consumer group": recibe TODOS los eventos y
 * decide cuáles le interesan. Un evento sólo se confirma (XACK) cuando el
 * manejador termina bien; si falla se reintenta y, tras MAX_ATTEMPTS, va a
 * la cola de mensajes muertos. Los manejadores deben ser idempotentes.
 */
export class EventBus {
  private readonly publisher: Redis;
  private readonly subscribers: Redis[] = [];
  private running = true;

  constructor(
    private readonly redisUrl: string,
    private readonly source: string,
    private readonly logger: Logger,
  ) {
    this.publisher = new Redis(redisUrl, { maxRetriesPerRequest: 2 });
  }

  async publish<T>(type: string, payload: T, options: PublishOptions = {}): Promise<DomainEvent<T>> {
    const event: DomainEvent<T> = {
      id: options.id ?? randomUUID(),
      type,
      source: this.source,
      occurredAt: new Date().toISOString(),
      correlationId: options.correlationId,
      payload,
    };
    await this.publisher.xadd(EVENTS_STREAM, 'MAXLEN', '~', '20000', '*', 'event', JSON.stringify(event));
    return event;
  }

  async subscribe(group: string, handlers: Record<string, EventHandler<any>>): Promise<void> {
    const client = new Redis(this.redisUrl, { maxRetriesPerRequest: null });
    this.subscribers.push(client);
    const consumer = `${group}-${process.pid}`;

    const ensureGroup = async () => {
      try {
        await client.xgroup('CREATE', EVENTS_STREAM, group, '0', 'MKSTREAM');
      } catch (error) {
        if (!String((error as Error).message).includes('BUSYGROUP')) throw error;
      }
    };
    await ensureGroup();

    const attempts = new Map<string, number>();

    const handleMessage = async (messageId: string, fields: string[]) => {
      const raw = fields[fields.indexOf('event') + 1];
      let event: DomainEvent;
      try {
        event = JSON.parse(raw);
      } catch {
        await client.xack(EVENTS_STREAM, group, messageId);
        return;
      }
      const handler = handlers[event.type];
      if (!handler) {
        await client.xack(EVENTS_STREAM, group, messageId);
        return;
      }
      try {
        await handler(event);
        await client.xack(EVENTS_STREAM, group, messageId);
        attempts.delete(messageId);
      } catch (error) {
        const count = (attempts.get(messageId) ?? 0) + 1;
        attempts.set(messageId, count);
        this.logger.error({ err: error, eventType: event.type, intento: count }, `Error al manejar ${event.type}`);
        if (count >= MAX_ATTEMPTS) {
          await client.xadd(
            DEAD_LETTER_STREAM,
            '*',
            'event',
            raw,
            'group',
            group,
            'error',
            String((error as Error).message),
          );
          await client.xack(EVENTS_STREAM, group, messageId);
          attempts.delete(messageId);
        }
      }
    };

    const loop = async () => {
      let lastReclaim = 0;
      while (this.running) {
        try {
          // Reintentos: reclama mensajes pendientes que llevan rato sin confirmarse.
          if (Date.now() - lastReclaim > RETRY_IDLE_MS) {
            lastReclaim = Date.now();
            const reclaimed = (await client.xautoclaim(
              EVENTS_STREAM,
              group,
              consumer,
              RETRY_IDLE_MS,
              '0-0',
              'COUNT',
              20,
            )) as [string, [string, string[]][]];
            for (const [id, fields] of reclaimed[1] ?? []) {
              if (fields) await handleMessage(id, fields);
            }
          }

          const result = (await client.xreadgroup(
            'GROUP',
            group,
            consumer,
            'COUNT',
            20,
            'BLOCK',
            3000,
            'STREAMS',
            EVENTS_STREAM,
            '>',
          )) as [string, [string, string[]][]][] | null;

          for (const [, messages] of result ?? []) {
            for (const [id, fields] of messages) await handleMessage(id, fields);
          }
        } catch (error) {
          if (!this.running) break;
          // Si Redis se reinició o se limpió, el grupo desaparece: se vuelve a crear.
          if (String((error as Error).message).includes('NOGROUP')) {
            await ensureGroup().catch(() => undefined);
            continue;
          }
          this.logger.error({ err: error }, 'Error leyendo el bus de eventos; reintentando');
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }
    };

    void loop();
    this.logger.info({ group, eventos: Object.keys(handlers) }, 'Suscrito al bus de eventos');
  }

  async close(): Promise<void> {
    this.running = false;
    await Promise.allSettled([this.publisher.quit(), ...this.subscribers.map((client) => client.disconnect())]);
  }
}

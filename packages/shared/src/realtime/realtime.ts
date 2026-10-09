import type { Request, Response } from 'express';
import { Redis } from 'ioredis';

/**
 * Tiempo real con Redis Pub/Sub + Server-Sent Events.
 * Cualquier instancia publica en un canal; la instancia que tiene abierta la
 * conexión SSE del usuario se la entrega.
 */
export class RealtimeChannel {
  private readonly publisher: Redis;
  private readonly subscriber: Redis;
  private readonly listeners = new Map<string, Set<(data: string) => void>>();

  constructor(redisUrl: string) {
    this.publisher = new Redis(redisUrl);
    this.subscriber = new Redis(redisUrl);
    this.subscriber.on('message', (channel: string, message: string) => {
      this.listeners.get(channel)?.forEach((listener) => listener(message));
    });
  }

  async publish(channel: string, data: unknown): Promise<void> {
    await this.publisher.publish(channel, JSON.stringify(data));
  }

  get redis(): Redis {
    return this.publisher;
  }

  async listen(channel: string, listener: (data: string) => void): Promise<() => Promise<void>> {
    let set = this.listeners.get(channel);
    if (!set) {
      set = new Set();
      this.listeners.set(channel, set);
      await this.subscriber.subscribe(channel);
    }
    set.add(listener);
    return async () => {
      const current = this.listeners.get(channel);
      current?.delete(listener);
      if (current && current.size === 0) {
        this.listeners.delete(channel);
        await this.subscriber.unsubscribe(channel);
      }
    };
  }

  async close(): Promise<void> {
    await Promise.allSettled([this.publisher.quit(), this.subscriber.quit()]);
  }
}

export interface SseConnection {
  send: (event: string, data: unknown) => void;
  onClose: (callback: () => void) => void;
  close: () => void;
}

export function openSse(req: Request, res: Response): SseConnection {
  res.status(200);
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const heartbeat = setInterval(() => res.write(': ping\n\n'), 15_000);
  const closeCallbacks: Array<() => void> = [];
  req.on('close', () => {
    clearInterval(heartbeat);
    closeCallbacks.forEach((callback) => callback());
  });

  return {
    send: (event, data) => {
      res.write(`event: ${event}\ndata: ${typeof data === 'string' ? data : JSON.stringify(data)}\n\n`);
    },
    onClose: (callback) => closeCallbacks.push(callback),
    close: () => {
      clearInterval(heartbeat);
      res.end();
    },
  };
}

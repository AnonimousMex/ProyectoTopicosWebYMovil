/**
 * Circuit Breaker (patrón de resiliencia + patrón State).
 *
 * CERRADO   → las llamadas pasan; si fallan `failureThreshold` veces seguidas, abre.
 * ABIERTO   → se rechaza de inmediato (sin esperar timeouts) y se usa el fallback.
 * SEMIABIERTO → tras `resetTimeoutMs` se deja pasar una llamada de prueba:
 *               si funciona cierra, si falla vuelve a abrir.
 *
 * Así, cuando el mapa o la IA se caen, el usuario no ve "la rueda": recibe
 * el fallback al instante y lo que vive en nuestra base sigue funcionando.
 */
export type BreakerState = 'CERRADO' | 'ABIERTO' | 'SEMIABIERTO';

export interface CircuitBreakerOptions {
  name: string;
  failureThreshold?: number;
  resetTimeoutMs?: number;
}

export interface BreakerSnapshot {
  name: string;
  state: BreakerState;
  consecutiveFailures: number;
  totalCalls: number;
  totalFailures: number;
  totalRejected: number;
  totalFallbacks: number;
  lastError: string | null;
  lastFailureAt: string | null;
  openedAt: string | null;
}

export class CircuitOpenError extends Error {
  constructor(name: string) {
    super(`Circuito "${name}" abierto: el colaborador no responde`);
    this.name = 'CircuitOpenError';
  }
}

export class CircuitBreaker {
  private state: BreakerState = 'CERRADO';
  private consecutiveFailures = 0;
  private openedAt: number | null = null;
  private halfOpenInFlight = false;
  private stats = {
    totalCalls: 0,
    totalFailures: 0,
    totalRejected: 0,
    totalFallbacks: 0,
    lastError: null as string | null,
    lastFailureAt: null as number | null,
  };

  readonly name: string;
  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;

  constructor(options: CircuitBreakerOptions) {
    this.name = options.name;
    this.failureThreshold = options.failureThreshold ?? 3;
    this.resetTimeoutMs = options.resetTimeoutMs ?? 15_000;
    breakerRegistry.set(this.name, this);
  }

  get currentState(): BreakerState {
    if (this.state === 'ABIERTO' && this.openedAt && Date.now() - this.openedAt >= this.resetTimeoutMs) {
      return 'SEMIABIERTO';
    }
    return this.state;
  }

  async execute<T>(action: () => Promise<T>, fallback?: (error: Error) => T | Promise<T>): Promise<T> {
    this.stats.totalCalls += 1;
    const state = this.currentState;

    if (state === 'ABIERTO' || (state === 'SEMIABIERTO' && this.halfOpenInFlight)) {
      this.stats.totalRejected += 1;
      return this.handleFallback(new CircuitOpenError(this.name), fallback);
    }

    if (state === 'SEMIABIERTO') {
      this.state = 'SEMIABIERTO';
      this.halfOpenInFlight = true;
    }

    try {
      const result = await action();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error as Error);
      return this.handleFallback(error as Error, fallback);
    } finally {
      this.halfOpenInFlight = false;
    }
  }

  snapshot(): BreakerSnapshot {
    return {
      name: this.name,
      state: this.currentState,
      consecutiveFailures: this.consecutiveFailures,
      totalCalls: this.stats.totalCalls,
      totalFailures: this.stats.totalFailures,
      totalRejected: this.stats.totalRejected,
      totalFallbacks: this.stats.totalFallbacks,
      lastError: this.stats.lastError,
      lastFailureAt: this.stats.lastFailureAt ? new Date(this.stats.lastFailureAt).toISOString() : null,
      openedAt: this.openedAt ? new Date(this.openedAt).toISOString() : null,
    };
  }

  reset(): void {
    this.state = 'CERRADO';
    this.consecutiveFailures = 0;
    this.openedAt = null;
  }

  private onSuccess(): void {
    this.consecutiveFailures = 0;
    this.state = 'CERRADO';
    this.openedAt = null;
  }

  private onFailure(error: Error): void {
    this.consecutiveFailures += 1;
    this.stats.totalFailures += 1;
    this.stats.lastError = error.message;
    this.stats.lastFailureAt = Date.now();
    if (this.state === 'SEMIABIERTO' || this.consecutiveFailures >= this.failureThreshold) {
      this.state = 'ABIERTO';
      this.openedAt = Date.now();
    }
  }

  private async handleFallback<T>(error: Error, fallback?: (error: Error) => T | Promise<T>): Promise<T> {
    if (!fallback) throw error;
    this.stats.totalFallbacks += 1;
    return fallback(error);
  }
}

const breakerRegistry = new Map<string, CircuitBreaker>();

export function listBreakers(): BreakerSnapshot[] {
  return [...breakerRegistry.values()].map((breaker) => breaker.snapshot());
}

export function getBreaker(name: string): CircuitBreaker | undefined {
  return breakerRegistry.get(name);
}

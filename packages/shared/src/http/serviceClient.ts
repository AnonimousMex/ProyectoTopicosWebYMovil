import { AppError, ServiceUnavailableError } from '../errors/appErrors.js';
import { serviceContextHeaders, signContext, type AuthContext } from '../security/internalAuth.js';
import type { CircuitBreaker } from './circuitBreaker.js';

export interface ServiceClientOptions {
  /** Nombre del servicio que llama (para firmar la identidad). */
  caller: string;
  /** Nombre legible del colaborador (para mensajes de error). */
  target: string;
  baseUrl: string;
  timeoutMs?: number;
  breaker?: CircuitBreaker;
}

export interface RequestOptions {
  body?: unknown;
  rawBody?: string;
  contentType?: string;
  /** Si viene, se reenvía la identidad del usuario original. */
  context?: AuthContext;
  headers?: Record<string, string>;
  responseType?: 'json' | 'text';
  timeoutMs?: number;
}

/**
 * Cliente HTTP entre microservicios: timeout duro, identidad firmada y
 * (opcionalmente) circuit breaker. Los 4xx se propagan como AppError; los
 * fallos de red, timeouts y 5xx cuentan como caída del colaborador.
 */
export class ServiceClient {
  constructor(private readonly options: ServiceClientOptions) {}

  async request<T>(method: string, path: string, opts: RequestOptions = {}): Promise<T> {
    const call = () => this.rawRequest<T>(method, path, opts);
    const breaker = this.options.breaker;
    if (!breaker) return call();

    // Un 4xx es una respuesta válida del colaborador: no debe abrir el circuito.
    const outcome = await breaker.execute(async () => {
      try {
        return { ok: true as const, value: await call() };
      } catch (error) {
        if (error instanceof AppError && error.status < 500) return { ok: false as const, error };
        throw error;
      }
    });
    if (!outcome.ok) throw outcome.error;
    return outcome.value;
  }

  get<T>(path: string, opts?: RequestOptions) {
    return this.request<T>('GET', path, opts);
  }

  post<T>(path: string, body?: unknown, opts?: RequestOptions) {
    return this.request<T>('POST', path, { ...opts, body });
  }

  private async rawRequest<T>(method: string, path: string, opts: RequestOptions): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), opts.timeoutMs ?? this.options.timeoutMs ?? 4000);

    const identity = opts.context
      ? signContext({
          userId: opts.context.userId,
          role: opts.context.role,
          email: opts.context.email,
          name: opts.context.name,
          requestId: opts.context.requestId,
        })
      : serviceContextHeaders(this.options.caller);

    const headers: Record<string, string> = { ...identity, ...opts.headers };
    let body: string | undefined;
    if (opts.rawBody !== undefined) {
      body = opts.rawBody;
      headers['content-type'] = opts.contentType ?? 'text/plain';
    } else if (opts.body !== undefined) {
      body = JSON.stringify(opts.body);
      headers['content-type'] = 'application/json';
    }

    let response: Response;
    try {
      response = await fetch(`${this.options.baseUrl}${path}`, { method, headers, body, signal: controller.signal });
    } catch (error) {
      const reason = (error as Error).name === 'AbortError' ? 'tiempo de espera agotado' : 'sin conexión';
      throw new ServiceUnavailableError(`${this.options.target} no responde (${reason})`);
    } finally {
      clearTimeout(timeout);
    }

    const text = await response.text();
    if (response.status >= 500) {
      throw new ServiceUnavailableError(`${this.options.target} falló (${response.status})`);
    }
    if (!response.ok) {
      let parsed: { error?: { code?: string; message?: string; details?: unknown } } = {};
      try {
        parsed = JSON.parse(text);
      } catch {
        /* respuesta no JSON */
      }
      throw new AppError(
        response.status,
        parsed.error?.code ?? 'ERROR_REMOTO',
        parsed.error?.message ?? `${this.options.target} respondió ${response.status}`,
        parsed.error?.details,
      );
    }

    if (opts.responseType === 'text') return text as T;
    return (text ? JSON.parse(text) : undefined) as T;
  }
}

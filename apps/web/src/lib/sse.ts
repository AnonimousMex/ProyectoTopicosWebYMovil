import { fetchEventSource } from '@microsoft/fetch-event-source';
import { refreshSession } from './apiClient';
import { tokenStore } from './tokenStore';

export interface SseHandlers {
  onEvent: (event: string, data: unknown) => void;
  onError?: (error: unknown) => void;
  onClose?: () => void;
}

class RetriableError extends Error {}
class FatalError extends Error {}
class SessionExpired extends Error {}

/**
 * Server-Sent Events con encabezado Authorization (EventSource nativo no lo
 * permite). Reintenta solo y, si el token expiró, renueva la sesión y se
 * vuelve a conectar con el token nuevo.
 */
export function openStream(path: string, handlers: SseHandlers, { retry = true } = {}): () => void {
  let controller = new AbortController();
  let stopped = false;

  const connect = () => {
    controller = new AbortController();
    fetchEventSource(`/api${path}`, {
      signal: controller.signal,
      openWhenHidden: true,
      headers: { Authorization: `Bearer ${tokenStore.get() ?? ''}`, Accept: 'text/event-stream' },
      async onopen(response) {
        if (response.ok) return;
        if (response.status === 401) throw new SessionExpired();
        throw new FatalError(`El stream respondió ${response.status}`);
      },
      onmessage(message) {
        if (!message.event) return;
        let data: unknown = message.data;
        try {
          data = JSON.parse(message.data);
        } catch {
          /* texto plano */
        }
        handlers.onEvent(message.event, data);
      },
      onclose() {
        handlers.onClose?.();
        if (retry) throw new RetriableError('reconectar');
      },
      onerror(error) {
        if (error instanceof SessionExpired || error instanceof FatalError || !retry) throw error;
        handlers.onError?.(error);
        return 3000;
      },
    }).catch(async (error) => {
      if (stopped) return;
      if (error instanceof SessionExpired && (await refreshSession())) {
        connect();
        return;
      }
      handlers.onError?.(error);
    });
  };

  connect();
  return () => {
    stopped = true;
    controller.abort();
  };
}

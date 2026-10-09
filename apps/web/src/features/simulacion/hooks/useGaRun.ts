import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, errorMessage } from '@/lib/apiClient';
import { openStream } from '@/lib/sse';
import type { Escenario, GaFrame, GaResultado } from '../types';

export type RunStatus = 'inactivo' | 'iniciando' | 'evolucionando' | 'terminado' | 'error';

/**
 * Controla una corrida del algoritmo genético: la inicia (mutation) y luego
 * escucha cada generación por SSE para animar las gráficas en vivo.
 */
export function useGaRun(endpoint: '/simulacion' | '/asignacion/optimizar') {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<RunStatus>('inactivo');
  const [escenario, setEscenario] = useState<Escenario | null>(null);
  const [frames, setFrames] = useState<GaFrame[]>([]);
  const [mejor, setMejor] = useState<GaFrame['mejor']>(null);
  const [resultado, setResultado] = useState<GaResultado | null>(null);
  const closeRef = useRef<(() => void) | null>(null);

  useEffect(() => () => closeRef.current?.(), []);

  const listen = useCallback(
    (runId: string) => {
      closeRef.current?.();
      setStatus('evolucionando');
      closeRef.current = openStream(
        `/simulacion/${runId}/stream`,
        {
          onEvent: (event, data) => {
            if (event === 'escenario') setEscenario((data as { escenario: Escenario }).escenario);
            if (event === 'generacion') {
              const frame = data as GaFrame;
              setFrames((current) => [...current, frame]);
              if (frame.mejor) setMejor(frame.mejor);
            }
            if (event === 'resultado') {
              const result = data as GaResultado;
              setResultado(result);
              setMejor(result.mejor);
              setStatus('terminado');
              queryClient.invalidateQueries({ queryKey: ['simulacion', 'historial'] });
              queryClient.invalidateQueries({ queryKey: ['asignacion'] });
              queryClient.invalidateQueries({ queryKey: ['pedidos'] });
            }
            if (event === 'falla') {
              setStatus('error');
              toast.error((data as { message: string }).message);
            }
          },
          onError: () => setStatus((current) => (current === 'terminado' ? current : 'error')),
        },
        { retry: false },
      );
    },
    [queryClient],
  );

  const start = useMutation({
    mutationFn: (body: unknown) => api.post<{ runId: string; escenario: Escenario }>(endpoint, body).then((r) => r.data),
    onMutate: () => {
      setStatus('iniciando');
      setFrames([]);
      setMejor(null);
      setResultado(null);
    },
    onSuccess: ({ runId, escenario: initial }) => {
      setEscenario(initial);
      listen(runId);
    },
    onError: (error) => {
      setStatus('error');
      toast.error(errorMessage(error));
    },
  });

  return { start, status, escenario, frames, mejor, resultado, lastFrame: frames.at(-1) ?? null };
}

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { openStream } from '@/lib/sse';
import type { Posicion } from '@/types/api';

/** Posición en vivo del repartidor de un pedido (SSE). */
export function useTracking(folio: string | undefined, enabled: boolean) {
  const [posicion, setPosicion] = useState<Posicion | null>(null);
  const [conectado, setConectado] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!folio || !enabled) return;
    let lastStatus: string | null = null;
    const close = openStream(`/seguimiento/${folio}/stream`, {
      onEvent: (event, data) => {
        if (event !== 'posicion') return;
        const next = data as Posicion;
        setConectado(true);
        setPosicion(next);
        if (lastStatus && lastStatus !== next.status) queryClient.invalidateQueries({ queryKey: ['pedidos', 'detalle', folio] });
        lastStatus = next.status;
      },
      onError: () => setConectado(false),
    });
    return close;
  }, [folio, enabled, queryClient]);

  return { posicion, conectado };
}

/** Todas las posiciones activas (mapa en vivo del panel). */
export function useFleetTracking() {
  const [posiciones, setPosiciones] = useState<Record<string, Posicion>>({});
  useEffect(
    () =>
      openStream('/seguimiento/en-vivo/todos', {
        onEvent: (event, data) => {
          if (event !== 'posicion') return;
          const next = data as Posicion;
          setPosiciones((current) => {
            if (next.status === 'ENTREGADO' || next.status === 'CANCELADO') {
              const { [next.folio]: _removed, ...rest } = current;
              return rest;
            }
            return { ...current, [next.folio]: next };
          });
        },
      }),
    [],
  );
  return posiciones;
}

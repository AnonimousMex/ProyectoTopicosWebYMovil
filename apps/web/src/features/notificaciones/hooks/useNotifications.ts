import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/apiClient';
import { openStream } from '@/lib/sse';
import type { Notificacion } from '@/types/api';

export const notificationKeys = {
  all: ['notificaciones'] as const,
  count: ['notificaciones', 'conteo'] as const,
};

export function useNotifications() {
  return useQuery({
    queryKey: notificationKeys.all,
    queryFn: () => api.get<Notificacion[]>('/notificaciones').then((r) => r.data),
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: notificationKeys.count,
    queryFn: () => api.get<{ noLeidas: number }>('/notificaciones/conteo').then((r) => r.data.noLeidas),
  });
}

export function useMarkAllRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/notificaciones/leer-todas'),
    // Actualización optimista: la campana se limpia al instante.
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.all });
      queryClient.setQueryData(notificationKeys.count, 0);
      queryClient.setQueryData<Notificacion[]>(notificationKeys.all, (old) => old?.map((item) => ({ ...item, leida: true })));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
  });
}

/**
 * Escucha avisos en vivo (SSE). Cada aviso nuevo actualiza la campana e
 * invalida las consultas relacionadas para que la pantalla se refresque sola.
 */
export function useNotificationStream(enabled: boolean) {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!enabled) return;
    return openStream('/notificaciones/stream', {
      onEvent: (event, data) => {
        if (event !== 'notificacion') return;
        const notification = data as Notificacion;
        queryClient.setQueryData<Notificacion[]>(notificationKeys.all, (old) => [notification, ...(old ?? [])].slice(0, 50));
        queryClient.setQueryData<number>(notificationKeys.count, (old) => (old ?? 0) + 1);
        toast(notification.titulo, { description: notification.mensaje });
        queryClient.invalidateQueries({ queryKey: ['pedidos'] });
        queryClient.invalidateQueries({ queryKey: ['bff'] });
        queryClient.invalidateQueries({ queryKey: ['asignacion'] });
      },
    });
  }, [enabled, queryClient]);
}

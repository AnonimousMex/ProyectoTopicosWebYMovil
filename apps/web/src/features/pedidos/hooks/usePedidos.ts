import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { errorMessage } from '@/lib/apiClient';
import type { PedidoPanel } from '@/types/api';
import { pedidosApi, type ListaPedidosQuery } from '../api/pedidosApi';

export const pedidoKeys = {
  all: ['pedidos'] as const,
  lista: (vista: string, query: ListaPedidosQuery) => ['pedidos', 'lista', vista, query] as const,
  detalle: (folio: string) => ['pedidos', 'detalle', folio] as const,
  resumen: ['pedidos', 'resumen'] as const,
};

// ---------- Queries ----------
export const useCatalogo = () =>
  useQuery({ queryKey: ['mapas', 'catalogo'], queryFn: pedidosApi.catalogo, staleTime: 30 * 60_000 });

export const useMedios = () => useQuery({ queryKey: ['medios'], queryFn: pedidosApi.medios, staleTime: 60_000 });

export const useExtras = () => useQuery({ queryKey: ['extras'], queryFn: pedidosApi.extras, staleTime: 60_000 });

export const usePedidosApp = (query: ListaPedidosQuery) =>
  useQuery({ queryKey: pedidoKeys.lista('app', query), queryFn: () => pedidosApi.listaApp(query), placeholderData: keepPreviousData });

export const usePedidosPanel = (query: ListaPedidosQuery) =>
  useQuery({
    queryKey: pedidoKeys.lista('panel', query),
    queryFn: () => pedidosApi.listaPanel(query),
    placeholderData: keepPreviousData,
  });

export const usePedido = (folio: string | undefined) =>
  useQuery({ queryKey: pedidoKeys.detalle(folio ?? ''), queryFn: () => pedidosApi.detalle(folio!), enabled: Boolean(folio) });

// ---------- Mutations ----------
export const useCotizar = () =>
  useMutation({ mutationFn: pedidosApi.cotizar, onError: (error) => toast.error(errorMessage(error)) });

export function useCrearPedido() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: pedidosApi.crear,
    onSuccess: (pedido) => {
      queryClient.setQueryData(pedidoKeys.detalle(pedido.folio), pedido);
      queryClient.invalidateQueries({ queryKey: pedidoKeys.all });
      queryClient.invalidateQueries({ queryKey: ['bff'] });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useCancelarPedido() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: pedidosApi.cancelar,
    onSuccess: (pedido) => {
      queryClient.setQueryData(pedidoKeys.detalle(pedido.folio), pedido);
      queryClient.invalidateQueries({ queryKey: pedidoKeys.all });
      toast.success(`Pedido ${pedido.folio} cancelado`);
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

/** Cambio de estado con actualización optimista (el repartidor ve el cambio al instante). */
export function useCambiarEstado() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: pedidosApi.cambiarEstado,
    onMutate: async ({ folio, estado }) => {
      const key = pedidoKeys.detalle(folio);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<PedidoPanel>(key);
      if (previous) queryClient.setQueryData(key, { ...previous, estado: estado as PedidoPanel['estado'] });
      return { previous, key };
    },
    onError: (error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(context.key, context.previous);
      toast.error(errorMessage(error));
    },
    onSuccess: (pedido) => {
      queryClient.setQueryData(pedidoKeys.detalle(pedido.folio), pedido);
      toast.success(`${pedido.folio}: ${pedido.estadoTexto}`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: pedidoKeys.all });
      queryClient.invalidateQueries({ queryKey: ['bff'] });
    },
  });
}

export const useDescargarGuia = () =>
  useMutation({ mutationFn: pedidosApi.descargarGuia, onError: (error) => toast.error(errorMessage(error)) });

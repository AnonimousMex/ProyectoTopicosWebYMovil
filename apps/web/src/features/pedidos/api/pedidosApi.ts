import { api } from '@/lib/apiClient';
import type { Cotizacion, Extra, Lugar, Medio, Paginated, PedidoApp, PedidoPanel, Zona } from '@/types/api';

export interface CotizacionInput {
  origen: { direccion: string; lat: number; lng: number; lugarId?: string | null };
  destino: { direccion: string; lat: number; lng: number; lugarId?: string | null };
  pesoKg: number;
  largoCm: number;
  anchoCm: number;
  altoCm: number;
  fragil: boolean;
  urgencia: 'NORMAL' | 'ALTA' | 'CRITICA';
  fechaLimite: string;
  extras: string[];
  valorDeclarado: number;
}

export interface CrearPedidoInput extends CotizacionInput {
  destinatarioNombre: string;
  destinatarioTelefono?: string;
  medioPreferido: string | null;
  notas?: string;
}

export interface ListaPedidosQuery {
  status?: string;
  activos?: boolean;
  q?: string;
  page?: number;
  pageSize?: number;
}

export const pedidosApi = {
  catalogo: () => api.get<{ lugares: Lugar[]; zonas: Zona[] }>('/mapas/catalogo').then((r) => r.data),
  medios: () => api.get<Medio[]>('/medios').then((r) => r.data),
  extras: () => api.get<Extra[]>('/extras').then((r) => r.data),
  cotizar: (body: CotizacionInput) => api.post<Cotizacion>('/cotizaciones', body).then((r) => r.data),
  crear: ({ body, idempotencyKey }: { body: CrearPedidoInput; idempotencyKey: string }) =>
    api.post<PedidoPanel>('/pedidos', body, { headers: { 'Idempotency-Key': idempotencyKey } }).then((r) => r.data),
  listaApp: (query: ListaPedidosQuery) =>
    api.get<Paginated<PedidoApp>>('/pedidos', { params: { ...query, vista: 'app' } }).then((r) => r.data),
  listaPanel: (query: ListaPedidosQuery) =>
    api.get<Paginated<PedidoPanel>>('/pedidos', { params: { ...query, vista: 'panel' } }).then((r) => r.data),
  resumen: () => api.get<Record<string, number>>('/pedidos/resumen').then((r) => r.data),
  detalle: (folio: string) => api.get<PedidoPanel>(`/pedidos/${folio}`).then((r) => r.data),
  cancelar: ({ folio, motivo }: { folio: string; motivo?: string }) =>
    api.post<PedidoPanel>(`/pedidos/${folio}/cancelar`, { motivo }).then((r) => r.data),
  cambiarEstado: ({ folio, estado, motivo }: { folio: string; estado: string; motivo?: string }) =>
    api.patch<PedidoPanel>(`/pedidos/${folio}/estado`, { estado, motivo }).then((r) => r.data),
  async descargarGuia(folio: string) {
    const response = await api.get(`/pedidos/${folio}/guia.pdf`, { responseType: 'blob' });
    const url = URL.createObjectURL(response.data as Blob);
    window.open(url, '_blank', 'noopener');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  },
  async descargarReporte() {
    const response = await api.get('/reportes/pedidos', { params: { formato: 'csv' }, responseType: 'blob' });
    const url = URL.createObjectURL(response.data as Blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reporte-pedidos-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  },
};

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { FileSpreadsheet, Search } from 'lucide-react';
import { toast } from 'sonner';
import { OrderStatusLabels, OrderStatuses } from '@rumbo/shared/contracts';
import { MedioIcon } from '@/components/map/MedioIcon';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ErrorState, Skeleton } from '@/components/ui/Feedback';
import { Input, Select } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/Misc';
import { errorMessage } from '@/lib/apiClient';
import { dateTime, money } from '@/lib/format';
import { medioNombre } from '@/lib/medios';
import { pedidosApi } from '../api/pedidosApi';
import { StatusBadge } from '../components/StatusBadge';
import { usePedidosPanel } from '../hooks/usePedidos';

export function PanelPedidosPage() {
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const { data, isLoading, error, isFetching } = usePedidosPanel({ status: status || undefined, q: q || undefined, page, pageSize: 20 });
  const reporte = useMutation({ mutationFn: pedidosApi.descargarReporte, onSuccess: () => toast.success('Reporte descargado'), onError: (e) => toast.error(errorMessage(e)) });

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Pedidos"
        subtitle="El reporte usa las mismas consultas que el seguimiento: sólo cambia el presentador (CSV)."
        actions={
          <Button variant="secondary" loading={reporte.isPending} onClick={() => reporte.mutate()}>
            <FileSpreadsheet className="h-4 w-4" /> Reporte CSV
          </Button>
        }
      />
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input className="pl-9" placeholder="Folio, cliente o destinatario" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        </div>
        <Select className="sm:w-56" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">Todos los estados</option>
          {OrderStatuses.map((s) => (
            <option key={s} value={s}>
              {OrderStatusLabels[s]}
            </option>
          ))}
        </Select>
      </div>
      {error && <ErrorState message={(error as Error).message} />}
      <Card className="overflow-hidden">
        {isLoading ? (
          <Skeleton className="m-4 h-96" />
        ) : (
          <div className={isFetching ? 'overflow-x-auto opacity-70' : 'overflow-x-auto'}>
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-400">
                <tr>
                  <th className="px-4 py-3">Folio</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Destino</th>
                  <th className="px-4 py-3">Medio</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Creado</th>
                  <th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data?.items.map((pedido) => (
                  <tr key={pedido.folio} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link to={`/panel/pedidos/${pedido.folio}`} className="font-mono text-xs font-bold text-brand-600 hover:underline">
                        {pedido.folio}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{pedido.cliente.nombre}</td>
                    <td className="max-w-56 truncate px-4 py-3 text-slate-500">{pedido.destinoPunto.direccion}</td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5 text-slate-600">
                        <MedioIcon medio={pedido.medio} className="h-4 w-4" /> {medioNombre(pedido.medio)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={pedido.estado} />
                    </td>
                    <td className="px-4 py-3 text-slate-500">{dateTime(pedido.creado)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-800">{money(pedido.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
            <span>{data.total} pedidos</span>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" disabled={page === 1} onClick={() => setPage(page - 1)}>
                Anterior
              </Button>
              <Button size="sm" variant="secondary" disabled={page * data.pageSize >= data.total} onClick={() => setPage(page + 1)}>
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PackagePlus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback';
import { Segmented } from '@/components/ui/Misc';
import { usePedidosApp } from '../hooks/usePedidos';
import { PedidoMiniCard } from './ClienteInicioPage';

export function MisPedidosPage() {
  const [filtro, setFiltro] = useState<'activos' | 'todos'>('activos');
  const [page, setPage] = useState(1);
  const { data, isLoading, error, refetch, isFetching } = usePedidosApp({ activos: filtro === 'activos', page, pageSize: 15 });

  return (
    <div className="space-y-4 animate-fade-up">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold text-ink-900">Mis envíos</h1>
        <Link to="/app/nuevo">
          <Button size="sm">
            <PackagePlus className="h-4 w-4" /> Nuevo
          </Button>
        </Link>
      </div>
      <Segmented
        value={filtro}
        onChange={(value) => {
          setFiltro(value);
          setPage(1);
        }}
        options={[
          { value: 'activos', label: 'En curso' },
          { value: 'todos', label: 'Historial' },
        ]}
      />
      {error && <ErrorState message={(error as Error).message} onRetry={() => void refetch()} />}
      {isLoading && <Skeleton className="h-64" />}
      {data && data.items.length === 0 && <EmptyState title="Nada por aquí" description="Cuando registres un envío aparecerá en esta lista." />}
      <div className={isFetching ? 'space-y-2.5 opacity-70' : 'space-y-2.5'}>
        {data?.items.map((pedido) => (
          <PedidoMiniCard key={pedido.folio} pedido={pedido} />
        ))}
      </div>
      {data && data.total > data.pageSize && (
        <div className="flex items-center justify-between text-sm">
          <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
            Anterior
          </Button>
          <span className="text-slate-500">
            Página {page} de {Math.ceil(data.total / data.pageSize)}
          </span>
          <Button variant="secondary" size="sm" disabled={page * data.pageSize >= data.total} onClick={() => setPage(page + 1)}>
            Siguiente
          </Button>
        </div>
      )}
    </div>
  );
}

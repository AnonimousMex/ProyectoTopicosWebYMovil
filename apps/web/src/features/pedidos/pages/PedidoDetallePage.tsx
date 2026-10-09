import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { ErrorState, PageLoader } from '@/components/ui/Feedback';
import { useAuth } from '@/features/auth/hooks/AuthProvider';
import { PedidoDetalleView } from '../components/PedidoDetalleView';
import { usePedido } from '../hooks/usePedidos';

export function PedidoDetallePage({ backTo }: { backTo: string }) {
  const { folio } = useParams();
  const { user } = useAuth();
  const { data, isLoading, error, refetch } = usePedido(folio);

  return (
    <div className="space-y-4 animate-fade-up">
      <Link to={backTo} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> Volver
      </Link>
      {isLoading && <PageLoader />}
      {error && <ErrorState message={(error as Error).message} onRetry={() => void refetch()} />}
      {data && user && <PedidoDetalleView pedido={data} rol={user.role} />}
    </div>
  );
}

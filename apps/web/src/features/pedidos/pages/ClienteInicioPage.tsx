import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowRight, PackagePlus, Sparkles } from 'lucide-react';
import { MedioIcon } from '@/components/map/MedioIcon';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback';
import { api } from '@/lib/apiClient';
import { money, relative, time } from '@/lib/format';
import { medioColor, medioNombre } from '@/lib/medios';
import type { BffSection, PedidoApp, Paginated } from '@/types/api';
import { StatusBadge } from '../components/StatusBadge';

interface ClienteInicio {
  usuario: { nombre: string };
  activos: BffSection<Paginated<PedidoApp>>;
  recientes: BffSection<Paginated<PedidoApp>>;
  resumen: BffSection<Record<string, number>>;
}

export function PedidoMiniCard({ pedido }: { pedido: PedidoApp }) {
  return (
    <Link
      to={`/app/pedidos/${pedido.folio}`}
      className="flex items-center gap-3 rounded-2xl border border-slate-200/70 bg-white p-4 shadow-card transition hover:-translate-y-0.5 hover:border-brand-200"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${medioColor(pedido.medio)}1A` }}>
        <MedioIcon medio={pedido.medio} className="h-6 w-6" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="font-mono text-xs font-bold text-slate-500">{pedido.folio}</p>
          <StatusBadge status={pedido.estado} />
        </div>
        <p className="mt-0.5 truncate text-sm font-semibold text-slate-800">{pedido.destino}</p>
        <p className="text-xs text-slate-500">
          {pedido.eta ? `Llega aprox. ${time(pedido.eta)}` : relative(pedido.creado)} · {medioNombre(pedido.medio)}
        </p>
      </div>
      <span className="text-sm font-bold text-ink-900">{money(pedido.total)}</span>
    </Link>
  );
}

/** Inicio del cliente: UNA petición al BFF en lugar de doce. */
export function ClienteInicioPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['bff', 'cliente'],
    queryFn: () => api.get<ClienteInicio>('/bff/app/inicio').then((r) => r.data),
    refetchInterval: 30_000,
  });

  if (error) return <ErrorState message={(error as Error).message} onRetry={() => void refetch()} />;

  const activos = data?.activos.data?.items ?? [];
  const resumen = data?.resumen.data ?? {};
  const entregados = resumen.ENTREGADO ?? 0;

  return (
    <div className="space-y-6 animate-fade-up">
      <section className="relative overflow-hidden rounded-3xl bg-ink-900 p-6 text-white">
        <div className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-brand-500/30 blur-3xl" />
        <div className="absolute -bottom-16 left-10 h-40 w-40 rounded-full bg-accent-500/30 blur-3xl" />
        <p className="relative text-sm text-slate-300">Hola, {data?.usuario.nombre.split(' ')[0] ?? '…'}</p>
        <h1 className="relative mt-1 text-2xl font-extrabold leading-tight">¿Qué enviamos hoy?</h1>
        <p className="relative mt-1 flex items-center gap-1.5 text-xs text-slate-400">
          <Sparkles className="h-3.5 w-3.5 text-brand-400" /> La IA te recomienda el medio ideal
        </p>
        <Link to="/app/nuevo" className="relative mt-5 inline-block">
          <Button size="lg">
            <PackagePlus className="h-5 w-5" /> Nuevo envío
          </Button>
        </Link>
        <div className="relative mt-6 grid grid-cols-3 gap-2 text-center">
          {[
            ['Activos', activos.length],
            ['Entregados', entregados],
            ['Por pagar', resumen.PENDIENTE_PAGO ?? 0],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl bg-white/5 py-3">
              <p className="text-xl font-extrabold">{value}</p>
              <p className="text-[11px] text-slate-400">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold text-ink-900">En curso</h2>
          <Link to="/app/pedidos" className="flex items-center gap-1 text-xs font-semibold text-brand-600">
            Ver todos <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        ) : !data?.activos.ok ? (
          <ErrorState message="El módulo de pedidos no responde en este momento" />
        ) : activos.length === 0 ? (
          <EmptyState title="No tienes envíos en curso" description="Crea uno y síguelo en el mapa en tiempo real." />
        ) : (
          <div className="space-y-2.5">
            {activos.map((pedido) => (
              <PedidoMiniCard key={pedido.folio} pedido={pedido} />
            ))}
          </div>
        )}
      </section>

      {(data?.recientes.data?.items.length ?? 0) > 0 && (
        <section>
          <h2 className="mb-3 font-bold text-ink-900">Entregados recientemente</h2>
          <div className="space-y-2.5">
            {data!.recientes.data!.items.map((pedido) => (
              <PedidoMiniCard key={pedido.folio} pedido={pedido} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

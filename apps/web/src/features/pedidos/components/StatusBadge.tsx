import { CheckCircle2, Circle, CreditCard, PackageCheck, Truck, UserCheck, XCircle, AlertOctagon, Navigation } from 'lucide-react';
import { OrderStatusLabels, type OrderStatus } from '@rumbo/shared/contracts';
import { cn } from '@/lib/cn';
import { dateTime } from '@/lib/format';
import type { PedidoPanel } from '@/types/api';

export const STATUS_STYLE: Record<OrderStatus, { color: string; icon: typeof Circle }> = {
  PENDIENTE_PAGO: { color: '#F59E0B', icon: CreditCard },
  PAGADO: { color: '#6366F1', icon: CheckCircle2 },
  ASIGNADO: { color: '#8B5CF6', icon: UserCheck },
  RECOLECTADO: { color: '#0EA5E9', icon: PackageCheck },
  EN_CAMINO: { color: '#FF5A1F', icon: Navigation },
  ENTREGADO: { color: '#10B981', icon: Truck },
  CANCELADO: { color: '#94A3B8', icon: XCircle },
  FALLIDO: { color: '#EF4444', icon: AlertOctagon },
};

export function StatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  const { color, icon: Icon } = STATUS_STYLE[status];
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold', className)} style={{ backgroundColor: `${color}1A`, color }}>
      <Icon className="h-3.5 w-3.5" />
      {OrderStatusLabels[status]}
    </span>
  );
}

const FLOW: OrderStatus[] = ['PENDIENTE_PAGO', 'PAGADO', 'ASIGNADO', 'RECOLECTADO', 'EN_CAMINO', 'ENTREGADO'];

/** Línea de tiempo del pedido a partir de su historial. */
export function StatusTimeline({ pedido }: { pedido: PedidoPanel }) {
  const reached = new Map(pedido.historial.map((item) => [item.a, item]));
  const terminal = pedido.estado === 'CANCELADO' || pedido.estado === 'FALLIDO';
  const steps = terminal ? [...FLOW.filter((step) => reached.has(step)), pedido.estado] : FLOW;

  return (
    <ol className="relative space-y-4">
      {steps.map((step, index) => {
        const item = reached.get(step);
        const { color, icon: Icon } = STATUS_STYLE[step];
        const done = Boolean(item);
        const current = step === pedido.estado;
        return (
          <li key={step} className="relative flex gap-3">
            {index < steps.length - 1 && (
              <span className="absolute left-[15px] top-8 h-[calc(100%-8px)] w-0.5" style={{ backgroundColor: done ? `${color}55` : '#E2E8F0' }} />
            )}
            <span
              className={cn('relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2', current && 'ring-4')}
              style={{
                borderColor: done ? color : '#E2E8F0',
                backgroundColor: done ? color : 'white',
                color: done ? 'white' : '#CBD5E1',
                ['--tw-ring-color' as string]: `${color}33`,
              }}
            >
              <Icon className="h-4 w-4" />
            </span>
            <div className="pt-1">
              <p className={cn('text-sm font-semibold', done ? 'text-slate-800' : 'text-slate-400')}>{OrderStatusLabels[step]}</p>
              {item && (
                <p className="text-xs text-slate-500">
                  {dateTime(item.fecha)}
                  {item.motivo ? ` · ${item.motivo}` : ''}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

import type { ReactNode } from 'react';
import { AlertTriangle, Inbox, Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button } from './Button';

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('h-5 w-5 animate-spin text-brand-500', className)} />;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-xl bg-slate-200/70', className)} />;
}

export function PageLoader({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div className="flex h-64 flex-col items-center justify-center gap-3 text-sm text-slate-500">
      <Spinner className="h-7 w-7" />
      {label}
    </div>
  );
}

export function EmptyState({ title, description, icon, action }: { title: string; description?: ReactNode; icon?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-12 text-center">
      <div className="mb-3 rounded-2xl bg-slate-100 p-3 text-slate-400">{icon ?? <Inbox className="h-6 w-6" />}</div>
      <p className="font-semibold text-slate-700">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="flex-1">
        <p className="font-semibold">No pudimos cargar esta sección</p>
        <p className="text-rose-700/80">{message}</p>
      </div>
      {onRetry && (
        <Button size="sm" variant="secondary" onClick={onRetry}>
          Reintentar
        </Button>
      )}
    </div>
  );
}

export function Notice({ tone = 'info', children, icon }: { tone?: 'info' | 'warning' | 'success'; children: ReactNode; icon?: ReactNode }) {
  const tones = {
    info: 'border-accent-100 bg-accent-50 text-accent-600',
    warning: 'border-amber-200 bg-amber-50 text-amber-800',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  };
  return <div className={cn('flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-xs font-medium', tones[tone])}>{icon}{children}</div>;
}

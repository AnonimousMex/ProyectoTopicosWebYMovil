import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

export function Badge({ children, color, className }: { children: ReactNode; color?: string; className?: string }) {
  return (
    <span
      className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold', !color && 'bg-slate-100 text-slate-600', className)}
      style={color ? { backgroundColor: `${color}1A`, color } : undefined}
    >
      {children}
    </span>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = '#FF5A1F',
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white p-4 shadow-card">
      <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full opacity-10" style={{ backgroundColor: tone }} />
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-500">{label}</p>
        {icon && (
          <span className="rounded-lg p-1.5" style={{ backgroundColor: `${tone}1A`, color: tone }}>
            {icon}
          </span>
        )}
      </div>
      <p className="mt-2 text-2xl font-extrabold tracking-tight text-ink-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export function Toggle({ checked, onChange, disabled, label }: { checked: boolean; onChange: (value: boolean) => void; disabled?: boolean; label?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition disabled:opacity-50',
        checked ? 'bg-emerald-500' : 'bg-slate-300',
      )}
    >
      <span className={cn('inline-block h-5 w-5 rounded-full bg-white shadow transition', checked ? 'translate-x-5' : 'translate-x-0.5')} />
    </button>
  );
}

export function PageHeader({ title, subtitle, actions, eyebrow }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <p className="mb-1 text-xs font-bold uppercase tracking-wider text-brand-500">{eyebrow}</p>}
        <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[1200] flex items-end justify-center bg-ink-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        className={cn('max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white shadow-pop animate-fade-up sm:rounded-3xl', wide ? 'sm:max-w-2xl' : 'sm:max-w-md')}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4">
          <h3 className="font-bold text-ink-900">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" aria-label="Cerrar">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (value: T) => void; options: Array<{ value: T; label: ReactNode }> }) {
  return (
    <div className="inline-flex rounded-xl bg-slate-100 p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            'rounded-lg px-3 py-1.5 text-xs font-semibold transition',
            value === option.value ? 'bg-white text-ink-900 shadow-sm' : 'text-slate-500 hover:text-slate-700',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

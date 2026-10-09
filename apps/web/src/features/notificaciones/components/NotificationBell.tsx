import { useEffect, useRef, useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { cn } from '@/lib/cn';
import { relative } from '@/lib/format';
import { useMarkAllRead, useNotifications, useUnreadCount } from '../hooks/useNotifications';

export function NotificationBell({ dark }: { dark?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data: count = 0 } = useUnreadCount();
  const { data: items = [] } = useNotifications();
  const markAll = useMarkAllRead();

  useEffect(() => {
    const close = (event: MouseEvent) => !ref.current?.contains(event.target as Node) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((value) => !value)}
        className={cn('relative rounded-xl p-2.5 transition', dark ? 'text-slate-300 hover:bg-white/10' : 'text-slate-500 hover:bg-slate-100')}
        aria-label="Notificaciones"
      >
        <Bell className="h-5 w-5" />
        {count > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-500 px-1 text-[10px] font-bold text-white">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-[900] mt-2 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-pop animate-fade-up">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-bold text-ink-900">Notificaciones</p>
            <button onClick={() => markAll.mutate()} className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline">
              <CheckCheck className="h-3.5 w-3.5" /> Marcar leídas
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto scrollbar-thin">
            {items.length === 0 && <p className="px-4 py-8 text-center text-sm text-slate-400">Sin notificaciones</p>}
            {items.map((item) => (
              <div key={item.id} className={cn('border-b border-slate-50 px-4 py-3', !item.leida && 'bg-brand-50/50')}>
                <div className="flex items-start gap-2">
                  {!item.leida && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" />}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800">{item.titulo}</p>
                    <p className="text-xs text-slate-500">{item.mensaje}</p>
                    <p className="mt-1 text-[11px] text-slate-400">{relative(item.createdAt)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

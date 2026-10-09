import { cn } from '@/lib/cn';

export function Logo({ dark, compact }: { dark?: boolean; compact?: boolean }) {
  return (
    <div className="relative flex items-center gap-2.5">
      <svg viewBox="0 0 64 64" className="h-9 w-9" aria-hidden>
        <rect width="64" height="64" rx="16" fill={dark ? '#FFFFFF14' : '#0B1020'} />
        <path d="M18 44 L30 20 L46 44" fill="none" stroke="#FF5A1F" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="46" cy="44" r="5" fill="#6366F1" />
      </svg>
      {!compact && (
        <div className="leading-none">
          <p className={cn('text-lg font-extrabold tracking-tight', dark ? 'text-white' : 'text-ink-900')}>Rumbo</p>
          <p className={cn('text-[10px] font-semibold uppercase tracking-[0.18em]', dark ? 'text-slate-400' : 'text-slate-400')}>Entregas</p>
        </div>
      )}
    </div>
  );
}

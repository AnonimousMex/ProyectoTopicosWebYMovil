import { Clock, Leaf, Sparkles, TriangleAlert } from 'lucide-react';
import { MedioIcon } from '@/components/map/MedioIcon';
import { cn } from '@/lib/cn';
import { money, time } from '@/lib/format';
import type { Cotizacion } from '@/types/api';

/** Opciones por medio + "Que Rumbo decida" (toma la sugerencia de la IA). */
export function QuoteOptions({
  cotizacion,
  value,
  onChange,
}: {
  cotizacion: Cotizacion;
  value: string | null;
  onChange: (medio: string | null) => void;
}) {
  const sugerida = cotizacion.opciones.find((opcion) => opcion.medioId === cotizacion.sugerencia?.medio);

  return (
    <div className="space-y-2.5">
      {sugerida && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className={cn(
            'flex w-full items-center gap-3 rounded-2xl border-2 p-3.5 text-left transition',
            value === null ? 'border-accent-500 bg-accent-50' : 'border-slate-200 bg-white hover:border-slate-300',
          )}
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-600 text-white">
            <Sparkles className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold text-ink-900">Que Rumbo decida</span>
            <span className="block text-xs text-slate-500">El algoritmo genético elige al repartidor óptimo · precio de {sugerida.nombre.toLowerCase()}</span>
          </span>
          <span className="text-right">
            <span className="block text-base font-extrabold text-ink-900">{money(sugerida.precio.total)}</span>
            <span className="block text-[11px] text-slate-500">≈ {sugerida.minutos} min</span>
          </span>
        </button>
      )}

      {cotizacion.opciones.map((opcion) => {
        const selected = value === opcion.medioId;
        return (
          <button
            key={opcion.medioId}
            type="button"
            disabled={!opcion.factible}
            onClick={() => onChange(opcion.medioId)}
            className={cn(
              'flex w-full items-center gap-3 rounded-2xl border-2 p-3.5 text-left transition disabled:cursor-not-allowed disabled:opacity-60',
              selected ? 'bg-white' : 'border-slate-200 bg-white hover:border-slate-300',
            )}
            style={selected ? { borderColor: opcion.color, backgroundColor: `${opcion.color}0D` } : undefined}
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${opcion.color}1A` }}>
              <MedioIcon medio={opcion.medioId} color={opcion.color} className="h-6 w-6" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2 text-sm font-bold text-ink-900">
                {opcion.nombre}
                {opcion.medioId === cotizacion.sugerencia?.medio && (
                  <span className="rounded-full bg-accent-100 px-2 py-0.5 text-[10px] font-bold text-accent-600">IA</span>
                )}
              </span>
              {opcion.factible ? (
                <span className="flex flex-wrap items-center gap-x-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {opcion.minutos} min · llega {time(opcion.llegadaEstimada)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Leaf className="h-3 w-3" /> {opcion.emisionesG} g CO₂
                  </span>
                  {!opcion.cumpleLimite && <span className="font-semibold text-amber-600">No llega antes del límite</span>}
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-rose-600">
                  <TriangleAlert className="h-3 w-3" /> {opcion.motivos[0]}
                </span>
              )}
            </span>
            {opcion.factible && <span className="text-base font-extrabold text-ink-900">{money(opcion.precio.total)}</span>}
          </button>
        );
      })}
    </div>
  );
}

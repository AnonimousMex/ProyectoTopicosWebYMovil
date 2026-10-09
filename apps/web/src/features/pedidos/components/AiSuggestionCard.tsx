import { useState } from 'react';
import { BrainCircuit, ChevronDown, CircleCheck, CircleSlash, Zap, Ban } from 'lucide-react';
import { MedioIcon } from '@/components/map/MedioIcon';
import { cn } from '@/lib/cn';
import { medioColor, medioNombre } from '@/lib/medios';
import type { SugerenciaIA } from '@/types/api';

const RESULT = {
  ok: { label: 'Respondió', icon: CircleCheck, className: 'text-emerald-600 bg-emerald-50' },
  falla: { label: 'Falló', icon: CircleSlash, className: 'text-rose-600 bg-rose-50' },
  circuito_abierto: { label: 'Circuito abierto', icon: Zap, className: 'text-amber-700 bg-amber-50' },
  no_factible: { label: 'No factible', icon: Ban, className: 'text-slate-600 bg-slate-100' },
};

/** Muestra la Sugerencia{ medio, motivo } y, si se quiere, la traza de proveedores. */
export function AiSuggestionCard({ sugerencia, compact }: { sugerencia: SugerenciaIA; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const color = medioColor(sugerencia.medio);
  return (
    <div className="overflow-hidden rounded-2xl border border-accent-100 bg-gradient-to-br from-accent-50 to-white">
      <div className="flex items-center gap-3 p-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm" style={{ color }}>
          <MedioIcon medio={sugerencia.medio} className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-accent-600">
            <BrainCircuit className="h-3.5 w-3.5" /> La IA recomienda
          </p>
          <p className="text-sm text-slate-800">
            <strong style={{ color }}>{medioNombre(sugerencia.medio)}</strong>: {sugerencia.motivo}
          </p>
          <p className="text-[11px] text-slate-500">
            {sugerencia.proveedorNombre} · confianza {Math.round(sugerencia.confianza * 100)}%
            {sugerencia.usoRespaldo && ' · proveedor de respaldo'}
          </p>
        </div>
        {!compact && (
          <button type="button" onClick={() => setOpen((v) => !v)} className="rounded-lg p-1.5 text-slate-400 hover:bg-white" aria-label="Ver traza">
            <ChevronDown className={cn('h-4 w-4 transition', open && 'rotate-180')} />
          </button>
        )}
      </div>
      {open && (
        <div className="space-y-2 border-t border-accent-100 bg-white/70 p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Cadena de proveedores</p>
          {sugerencia.intentos.map((intento) => {
            const result = RESULT[intento.resultado];
            return (
              <details key={intento.proveedor} className="rounded-xl border border-slate-200 bg-white">
                <summary className="flex cursor-pointer items-center gap-2 px-3 py-2 text-xs">
                  <span className={cn('flex items-center gap-1 rounded-full px-2 py-0.5 font-bold', result.className)}>
                    <result.icon className="h-3 w-3" /> {result.label}
                  </span>
                  <span className="font-semibold text-slate-700">{intento.nombre}</span>
                  <span className="rounded bg-slate-100 px-1.5 font-mono text-[10px] text-slate-500">{intento.formato}</span>
                  <span className="ml-auto text-slate-400">{intento.latenciaMs} ms</span>
                </summary>
                <div className="border-t border-slate-100 px-3 py-2">
                  {intento.detalle && <p className="mb-1 text-xs text-slate-500">{intento.detalle}</p>}
                  {intento.respuestaOriginal && (
                    <pre className="max-h-48 overflow-auto rounded-lg bg-ink-900 p-3 font-mono text-[11px] leading-relaxed text-emerald-300 scrollbar-thin">
                      {intento.respuestaOriginal}
                    </pre>
                  )}
                </div>
              </details>
            );
          })}
        </div>
      )}
    </div>
  );
}

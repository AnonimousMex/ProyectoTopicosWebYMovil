import { MedioIcon } from '@/components/map/MedioIcon';
import { cn } from '@/lib/cn';
import { minutes, number } from '@/lib/format';
import { routeColor, type Escenario, type Gene, type Solucion } from '../types';

/**
 * El cromosoma: una fila de genes (envío, vehículo). El color es el vehículo
 * asignado y el orden de izquierda a derecha es la secuencia de visita.
 */
export function ChromosomeStrip({ genes, escenario }: { genes: Gene[]; escenario: Escenario }) {
  return (
    <div className="flex flex-wrap gap-1">
      {genes.map((gene, index) => {
        const envio = escenario.envios[gene.e];
        const color = routeColor(gene.v);
        return (
          <div
            key={`${gene.e}-${index}`}
            title={`Gen ${index + 1}: ${envio?.folio} → ${escenario.vehiculos[gene.v]?.nombre}`}
            className={cn('flex h-8 w-8 flex-col items-center justify-center rounded-lg text-[9px] font-bold text-white shadow-sm transition-colors duration-300', envio?.urgencia === 'CRITICA' && 'ring-2 ring-rose-400 ring-offset-1')}
            style={{ backgroundColor: color }}
          >
            <span className="leading-none">{gene.e + 1}</span>
            <span className="mt-0.5 leading-none opacity-75">v{gene.v + 1}</span>
          </div>
        );
      })}
    </div>
  );
}

export function RouteTable({ solucion, escenario }: { solucion: Solucion; escenario: Escenario }) {
  const rutas = [...solucion.rutas].sort((a, b) => a.vehiculo - b.vehiculo);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="text-[11px] font-bold uppercase text-slate-400">
          <tr>
            <th className="py-2 pr-3">Vehículo</th>
            <th className="py-2 pr-3">Secuencia de envíos</th>
            <th className="py-2 pr-3 text-right">Km</th>
            <th className="py-2 pr-3 text-right">Tiempo</th>
            <th className="py-2 text-right">Costo</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rutas.map((ruta) => {
            const vehiculo = escenario.vehiculos[ruta.vehiculo];
            const sobrecupo = ruta.paradas.length > vehiculo.capacidad;
            return (
              <tr key={ruta.vehiculo}>
                <td className="py-2.5 pr-3">
                  <span className="flex items-center gap-2 font-semibold text-slate-700">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: routeColor(ruta.vehiculo) }} />
                    <MedioIcon medio={vehiculo.medioId} className="h-4 w-4" />
                    {vehiculo.nombre}
                  </span>
                </td>
                <td className="py-2.5 pr-3">
                  <div className="flex flex-wrap gap-1">
                    {ruta.paradas.map((parada) => (
                      <span
                        key={parada.envio}
                        className={cn('rounded-md px-1.5 py-0.5 font-mono text-[10px] font-bold', parada.minutosTarde > 0 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600')}
                        title={`Llega en ${minutes(parada.llegadaMin)}${parada.minutosTarde ? ` (${parada.minutosTarde} min tarde)` : ''}`}
                      >
                        {escenario.envios[parada.envio]?.folio.replace(/^RB-\d{4}-0*/, '#')}
                      </span>
                    ))}
                    {sobrecupo && <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">sobrecupo</span>}
                  </div>
                </td>
                <td className="py-2.5 pr-3 text-right tabular-nums text-slate-600">{number(ruta.km, 1)}</td>
                <td className="py-2.5 pr-3 text-right tabular-nums text-slate-600">{minutes(ruta.minutos)}</td>
                <td className="py-2.5 text-right font-semibold tabular-nums text-slate-800">${number(ruta.costo, 0)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

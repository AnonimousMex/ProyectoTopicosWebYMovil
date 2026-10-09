import { Activity, AlarmClock, Dna, GitMerge, Shuffle, Sparkles, Target, TrendingDown } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Notice } from '@/components/ui/Feedback';
import { StatCard } from '@/components/ui/Misc';
import { MedioIcon } from '@/components/map/MedioIcon';
import { number } from '@/lib/format';
import type { RunStatus } from '../hooks/useGaRun';
import { routeColor, type Escenario, type GaFrame, type GaResultado } from '../types';
import { ChromosomeStrip, RouteTable } from './ChromosomeView';
import { DiversityChart, FitnessChart, PopulationHistogram } from './GaCharts';
import { RoutesMap } from './RoutesMap';

export function GaRunPanel({
  status,
  escenario,
  frames,
  mejor,
  resultado,
  lastFrame,
  poblacion,
  generaciones,
}: {
  status: RunStatus;
  escenario: Escenario | null;
  frames: GaFrame[];
  mejor: GaFrame['mejor'];
  resultado: GaResultado | null;
  lastFrame: GaFrame | null;
  poblacion: number;
  generaciones: number;
}) {
  if (!escenario) return null;
  const totalCruces = frames.reduce((sum, frame) => sum + frame.cruces, 0);
  const totalMutaciones = frames.reduce((sum, frame) => sum + frame.mutaciones, 0);
  const primera = frames[0]?.mejorCosto;
  const progreso = lastFrame ? Math.min(100, (lastFrame.generacion / generaciones) * 100) : 0;

  return (
    <div className="space-y-5">
      {escenario.matrizEstimada && (
        <Notice tone="warning">El proveedor de mapas no respondió: las distancias se estimaron localmente y el algoritmo siguió trabajando.</Notice>
      )}

      <div className="overflow-hidden rounded-full bg-slate-200">
        <div className="h-1.5 bg-gradient-to-r from-brand-500 to-accent-500 transition-all" style={{ width: `${status === 'terminado' ? 100 : progreso}%` }} />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-6">
        <StatCard label="Generación" value={`${lastFrame?.generacion ?? 0} / ${generaciones}`} icon={<Dna className="h-4 w-4" />} tone="#6366F1" hint={status === 'evolucionando' ? 'evolucionando…' : status} />
        <StatCard label="Mejor costo" value={`$${number(mejor?.solucion.costo ?? lastFrame?.mejorCosto ?? 0, 0)}`} icon={<Target className="h-4 w-4" />} hint={primera ? `inició en $${number(primera, 0)}` : undefined} />
        <StatCard
          label="Vs. método voraz"
          value={resultado ? `${resultado.mejoraVsGreedyPct > 0 ? '−' : ''}${number(Math.abs(resultado.mejoraVsGreedyPct), 1)}%` : '…'}
          icon={<TrendingDown className="h-4 w-4" />}
          tone="#10B981"
          hint={resultado ? `voraz: $${number(resultado.greedy.solucion.costo, 0)}` : 'se calcula al final'}
        />
        <StatCard label="Violaciones" value={mejor?.solucion.violaciones ?? '—'} icon={<Activity className="h-4 w-4" />} tone="#EF4444" hint="peso, alcance, reglas del medio" />
        <StatCard label="Entregas tarde" value={mejor?.solucion.tardias ?? '—'} icon={<AlarmClock className="h-4 w-4" />} tone="#F59E0B" hint={`de ${escenario.envios.length} envíos`} />
        <StatCard label="Operadores" value={`${number(totalCruces)} / ${number(totalMutaciones)}`} icon={<GitMerge className="h-4 w-4" />} tone="#06B6D4" hint="cruces / mutaciones" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.25fr_1fr]">
        <Card>
          <CardHeader title="Evolución de la aptitud" subtitle="Costo de la mejor solución por generación (menor es mejor)" icon={<TrendingDown className="h-4 w-4" />} />
          <CardBody className="h-72">
            <FitnessChart frames={frames} greedy={resultado?.greedy.solucion.costo} />
          </CardBody>
        </Card>
        <div className="grid gap-5">
          <Card>
            <CardHeader title="Diversidad y factibilidad" subtitle="Si la diversidad cae a 0, la población convergió" icon={<Shuffle className="h-4 w-4" />} />
            <CardBody className="h-32 py-2">
              <DiversityChart frames={frames} poblacion={poblacion} />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Población actual" subtitle="Distribución de costos de los individuos" icon={<Sparkles className="h-4 w-4" />} />
            <CardBody className="h-32 py-2">
              <PopulationHistogram frame={lastFrame} />
            </CardBody>
          </Card>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.25fr_1fr]">
        <Card className="overflow-hidden">
          <CardHeader title="Rutas de la mejor solución" subtitle="Cada color es un vehículo · círculos blancos = recolección, naranjas = entrega" />
          <RoutesMap escenario={escenario} solucion={mejor?.solucion ?? null} className="h-[440px] rounded-none" />
        </Card>
        <Card>
          <CardHeader title="Mejor cromosoma" subtitle="Gen = (envío, vehículo). El orden es la secuencia de visita." icon={<Dna className="h-4 w-4" />} />
          <CardBody className="space-y-4">
            {mejor ? <ChromosomeStrip genes={mejor.genes} escenario={escenario} /> : <p className="text-sm text-slate-400">Esperando la primera generación…</p>}
            <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
              {escenario.vehiculos.map((vehiculo, index) => (
                <span key={vehiculo.id} className="flex items-center gap-1.5 rounded-full border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: routeColor(index) }} />
                  <MedioIcon medio={vehiculo.medioId} className="h-3.5 w-3.5" /> v{index + 1} {vehiculo.nombre}
                </span>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>

      {mejor && (
        <Card>
          <CardHeader title="Plan de entregas" subtitle="Envíos en rojo llegarían después de su fecha límite" />
          <CardBody>
            <RouteTable solucion={mejor.solucion} escenario={escenario} />
          </CardBody>
        </Card>
      )}
    </div>
  );
}

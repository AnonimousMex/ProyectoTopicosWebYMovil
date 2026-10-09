import { useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dices, FlaskConical, Play } from 'lucide-react';
import { MedioIcon } from '@/components/map/MedioIcon';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/Misc';
import { api } from '@/lib/apiClient';
import { dateTime, number } from '@/lib/format';
import { useMedios } from '@/features/pedidos/hooks/usePedidos';
import { GaRunPanel } from '../components/GaRunPanel';
import { useGaRun } from '../hooks/useGaRun';
import type { EscenarioParams, GaParams } from '../types';

function Slider({ label, value, min, max, step = 1, onChange, format }: { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; format?: (v: number) => ReactNode }) {
  return (
    <label className="block">
      <span className="flex justify-between text-xs font-semibold text-slate-600">
        {label}
        <span className="font-mono text-ink-900">{format ? format(value) : value}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-2 w-full accent-brand-500" />
    </label>
  );
}

interface RunHistory {
  id: string;
  tipo: string;
  estado: string;
  costoTotal: number | null;
  mejoraPct: number | null;
  generaciones: number | null;
  duracionMs: number | null;
  envios: number;
  vehiculos: number;
  createdAt: string;
}

export function SimulacionPage() {
  const { data: medios = [] } = useMedios();
  const run = useGaRun('/simulacion');
  const [escenario, setEscenario] = useState<EscenarioParams>({
    envios: 30,
    flota: { camioneta: 2, motocicleta: 3, bicicleta: 2, dron: 1 },
    semilla: 42,
    porcentajeUrgentes: 0.3,
    porcentajePreferencia: 0.1,
  });
  const [params, setParams] = useState<GaParams>({ poblacion: 100, generaciones: 250, tasaCruce: 0.85, tasaMutacion: 0.3, elitismo: 2, torneo: 3, semilla: 2026, paciencia: 0 });
  const [velocidad, setVelocidad] = useState(30);
  const historial = useQuery({
    queryKey: ['simulacion', 'historial'],
    queryFn: () => api.get<RunHistory[]>('/simulacion/historial').then((r) => r.data),
  });

  const corriendo = run.status === 'iniciando' || run.status === 'evolucionando';
  const setParam = (key: keyof GaParams) => (value: number) => setParams((current) => ({ ...current, [key]: value }));

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow="Laboratorio"
        title="Algoritmo genético de asignación"
        subtitle="Cada individuo es un plan completo de entregas (un cromosoma). La población evoluciona por selección, cruce y mutación hasta encontrar rutas baratas, puntuales y que respetan las reglas de cada medio."
        actions={
          <Button size="lg" loading={corriendo} onClick={() => run.start.mutate({ escenario, parametros: params, velocidadMs: velocidad })}>
            <Play className="h-4 w-4" /> Evolucionar
          </Button>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[340px_1fr]">
        <div className="space-y-5">
          <Card>
            <CardHeader title="Escenario" subtitle="Pedidos y flota sintéticos sobre lugares reales de Morelia" icon={<FlaskConical className="h-4 w-4" />} />
            <CardBody className="space-y-4">
              <Slider label="Envíos" value={escenario.envios} min={5} max={80} onChange={(envios) => setEscenario({ ...escenario, envios })} />
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-600">Flota</p>
                {medios
                  .filter((medio) => medio.activo)
                  .map((medio) => (
                    <div key={medio.id} className="flex items-center gap-3">
                      <MedioIcon medio={medio.id} color={medio.color} className="h-5 w-5" />
                      <span className="flex-1 text-sm text-slate-700">{medio.nombre}</span>
                      <input
                        type="number"
                        min={0}
                        max={20}
                        value={escenario.flota[medio.id] ?? 0}
                        onChange={(e) => setEscenario({ ...escenario, flota: { ...escenario.flota, [medio.id]: Math.max(0, Number(e.target.value)) } })}
                        className="h-8 w-16 rounded-lg border border-slate-200 text-center text-sm"
                      />
                    </div>
                  ))}
              </div>
              <Slider label="Urgentes" value={escenario.porcentajeUrgentes} min={0} max={1} step={0.05} onChange={(v) => setEscenario({ ...escenario, porcentajeUrgentes: v })} format={(v) => `${Math.round(v * 100)}%`} />
              <Slider label="Hora del día (tráfico)" value={escenario.hora ?? 13} min={0} max={23} onChange={(hora) => setEscenario({ ...escenario, hora })} format={(v) => `${v}:00`} />
              <div className="flex items-end gap-2">
                <label className="flex-1">
                  <span className="text-xs font-semibold text-slate-600">Semilla del escenario</span>
                  <input type="number" value={escenario.semilla} onChange={(e) => setEscenario({ ...escenario, semilla: Number(e.target.value) || 1 })} className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm" />
                </label>
                <Button variant="secondary" size="icon" onClick={() => setEscenario({ ...escenario, semilla: Math.floor(Math.random() * 99999) + 1 })} aria-label="Semilla aleatoria">
                  <Dices className="h-4 w-4" />
                </Button>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Parámetros genéticos" />
            <CardBody className="space-y-4">
              <Slider label="Tamaño de población" value={params.poblacion} min={10} max={400} step={10} onChange={setParam('poblacion')} />
              <Slider label="Generaciones" value={params.generaciones} min={10} max={1500} step={10} onChange={setParam('generaciones')} />
              <Slider label="Probabilidad de cruce (OX)" value={params.tasaCruce} min={0} max={1} step={0.05} onChange={setParam('tasaCruce')} format={(v) => `${Math.round(v * 100)}%`} />
              <Slider label="Probabilidad de mutación" value={params.tasaMutacion} min={0} max={1} step={0.05} onChange={setParam('tasaMutacion')} format={(v) => `${Math.round(v * 100)}%`} />
              <Slider label="Elitismo" value={params.elitismo} min={0} max={20} onChange={setParam('elitismo')} format={(v) => `${v} mejores pasan intactos`} />
              <Slider label="Tamaño del torneo" value={params.torneo} min={2} max={10} onChange={setParam('torneo')} />
              <Slider label="Paciencia (parar si no mejora)" value={params.paciencia} min={0} max={500} step={10} onChange={setParam('paciencia')} format={(v) => (v ? `${v} gen.` : 'nunca')} />
              <Slider label="Velocidad de animación" value={velocidad} min={0} max={300} step={10} onChange={setVelocidad} format={(v) => `${v} ms/gen`} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="¿Cómo se lee?" />
            <CardBody className="space-y-2 text-xs leading-relaxed text-slate-600">
              <p><strong>Cromosoma:</strong> lista de genes (envío, vehículo). El orden define la ruta de cada vehículo.</p>
              <p><strong>Aptitud:</strong> costo operativo (km y minutos según la estrategia de cada medio) + castigos por llegar tarde, exceder peso/alcance, zonas prohibidas y sobrecupo.</p>
              <p><strong>Selección por torneo</strong>, <strong>cruce OX</strong> (conserva permutaciones válidas) y <strong>mutaciones</strong> de intercambio, inversión, reasignación y reubicación.</p>
              <p>La población inicial mezcla la solución voraz, soluciones guiadas por la <strong>sugerencia de la IA</strong> y soluciones aleatorias.</p>
            </CardBody>
          </Card>
        </div>

        <div className="min-w-0">
          {run.escenario ? (
            <GaRunPanel {...run} poblacion={params.poblacion} generaciones={params.generaciones} />
          ) : (
            <Card className="flex h-full min-h-96 flex-col items-center justify-center p-10 text-center">
              <div className="rounded-3xl bg-brand-50 p-5 text-brand-500">
                <FlaskConical className="h-10 w-10" />
              </div>
              <p className="mt-4 text-lg font-bold text-ink-900">Configura un escenario y presiona «Evolucionar»</p>
              <p className="mt-1 max-w-md text-sm text-slate-500">Verás en vivo cómo la población converge, el cromosoma cambia de colores y las rutas se reacomodan en el mapa.</p>
            </Card>
          )}

          {(historial.data?.length ?? 0) > 0 && (
            <Card className="mt-5">
              <CardHeader title="Corridas recientes" />
              <CardBody className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-[11px] font-bold uppercase text-slate-400">
                    <tr>
                      <th className="py-2">Fecha</th>
                      <th>Tipo</th>
                      <th className="text-right">Envíos</th>
                      <th className="text-right">Vehículos</th>
                      <th className="text-right">Gen.</th>
                      <th className="text-right">Costo</th>
                      <th className="text-right">Mejora</th>
                      <th className="text-right">Tiempo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {historial.data!.slice(0, 12).map((item) => (
                      <tr key={item.id} className="text-slate-600">
                        <td className="py-2">{dateTime(item.createdAt)}</td>
                        <td>
                          <span className={item.tipo === 'REAL' ? 'font-semibold text-brand-600' : ''}>{item.tipo === 'REAL' ? 'Asignación real' : 'Simulación'}</span>
                        </td>
                        <td className="text-right">{item.envios}</td>
                        <td className="text-right">{item.vehiculos}</td>
                        <td className="text-right">{item.generaciones ?? '—'}</td>
                        <td className="text-right">{item.costoTotal ? `$${number(item.costoTotal)}` : '—'}</td>
                        <td className="text-right font-semibold text-emerald-600">{item.mejoraPct !== null ? `${number(item.mejoraPct, 1)}%` : '—'}</td>
                        <td className="text-right">{item.duracionMs ? `${item.duracionMs} ms` : item.estado}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

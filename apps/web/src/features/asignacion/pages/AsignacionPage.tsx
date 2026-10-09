import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Dna, Inbox, Timer, Truck } from 'lucide-react';
import { toast } from 'sonner';
import { MedioIcon } from '@/components/map/MedioIcon';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { EmptyState, Notice, PageLoader } from '@/components/ui/Feedback';
import { Badge, PageHeader, Toggle } from '@/components/ui/Misc';
import { api, errorMessage } from '@/lib/apiClient';
import { dateTime, relative } from '@/lib/format';
import { medioColor, medioNombre } from '@/lib/medios';
import type { Envio, Repartidor } from '@/types/api';
import { GaRunPanel } from '@/features/simulacion/components/GaRunPanel';
import { useGaRun } from '@/features/simulacion/hooks/useGaRun';

interface PoolResponse {
  pool: Envio[];
  activos: Envio[];
  conteo: Record<string, number>;
}

interface AutoSettings {
  activo: boolean;
  intervaloSeg: number;
  ultimaEjecucion: string | null;
}

const URGENCIA_COLOR: Record<string, string> = { NORMAL: '#64748B', ALTA: '#F59E0B', CRITICA: '#E11D48' };

export function AsignacionPage() {
  const queryClient = useQueryClient();
  const pool = useQuery({ queryKey: ['asignacion', 'pool'], queryFn: () => api.get<PoolResponse>('/asignacion/pool').then((r) => r.data), refetchInterval: 15_000 });
  const flota = useQuery({ queryKey: ['asignacion', 'flota'], queryFn: () => api.get<Repartidor[]>('/flota').then((r) => r.data) });
  const auto = useQuery({ queryKey: ['asignacion', 'auto'], queryFn: () => api.get<AutoSettings>('/asignacion/auto').then((r) => r.data) });
  const run = useGaRun('/asignacion/optimizar');

  const toggleAuto = useMutation({
    mutationFn: (activo: boolean) => api.put<AutoSettings>('/asignacion/auto', { activo, intervaloSeg: auto.data?.intervaloSeg ?? 120 }).then((r) => r.data),
    onSuccess: (data) => {
      queryClient.setQueryData(['asignacion', 'auto'], data);
      toast.success(data.activo ? 'Asignación automática activada' : 'Asignación automática desactivada');
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  if (pool.isLoading) return <PageLoader />;
  const enTurno = (flota.data ?? []).filter((r) => r.activo && r.disponible);
  const corriendo = run.status === 'iniciando' || run.status === 'evolucionando';

  return (
    <div className="space-y-5 animate-fade-up">
      <PageHeader
        eyebrow="Despacho"
        title="Asignación de entregas"
        subtitle="Los pedidos pagados esperan en el pool. El algoritmo genético decide qué repartidor lleva cada uno y en qué orden."
        actions={
          <Button
            size="lg"
            loading={corriendo}
            disabled={(pool.data?.pool.length ?? 0) === 0}
            onClick={() => run.start.mutate({ parametros: { poblacion: 120, generaciones: 200, paciencia: 80 }, velocidadMs: 20 })}
          >
            <Dna className="h-4 w-4" /> Optimizar y asignar
          </Button>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title={`Pool pendiente (${pool.data?.pool.length ?? 0})`} subtitle="Pagados y sin repartidor" icon={<Inbox className="h-4 w-4" />} />
          <CardBody className="max-h-80 space-y-2 overflow-y-auto scrollbar-thin">
            {pool.data?.pool.length === 0 && <EmptyState title="Pool vacío" description="Todo lo pagado ya tiene repartidor." />}
            {pool.data?.pool.map((envio) => (
              <div key={envio.id} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3">
                <span className="font-mono text-xs font-bold text-slate-500">{envio.folio}</span>
                <Badge color={URGENCIA_COLOR[envio.urgencia]}>{envio.urgencia.toLowerCase()}</Badge>
                <span className="min-w-0 flex-1 truncate text-sm text-slate-700">{envio.destinoDireccion}</span>
                <span className="text-xs text-slate-500">{envio.pesoKg} kg</span>
                {envio.sugerenciaMedio && (
                  <span className="flex items-center gap-1 text-xs text-slate-500" title={`IA: ${envio.sugerenciaMotivo ?? ''}`}>
                    <MedioIcon medio={envio.sugerenciaMedio} className="h-4 w-4" /> IA
                  </span>
                )}
                <span className="text-xs text-slate-400">límite {relative(envio.fechaLimite)}</span>
              </div>
            ))}
          </CardBody>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardBody className="flex items-center gap-4">
              <div className="rounded-xl bg-accent-50 p-2.5 text-accent-600">
                <Timer className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-ink-900">Asignación automática</p>
                <p className="text-xs text-slate-500">
                  Cada {auto.data?.intervaloSeg ?? 120} s · última {auto.data?.ultimaEjecucion ? dateTime(auto.data.ultimaEjecucion) : 'nunca'}
                </p>
              </div>
              <Toggle checked={auto.data?.activo ?? false} onChange={(v) => toggleAuto.mutate(v)} label="Asignación automática" />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title={`Repartidores en turno (${enTurno.length})`} icon={<Truck className="h-4 w-4" />} />
            <CardBody className="max-h-56 space-y-2 overflow-y-auto scrollbar-thin">
              {enTurno.map((repartidor) => (
                <div key={repartidor.id} className="flex items-center gap-2 text-sm">
                  <MedioIcon medio={repartidor.medioId} className="h-4 w-4" />
                  <span className="flex-1 truncate text-slate-700">{repartidor.nombre}</span>
                  <span className="text-xs text-slate-400">
                    {repartidor.cargaActual}/{repartidor.medio.capacidadPaquetes}
                  </span>
                </div>
              ))}
            </CardBody>
          </Card>
        </div>
      </div>

      {run.resultado?.asignados !== undefined && (
        <Notice tone="success">
          Se asignaron {run.resultado.asignados} envíos ({run.resultado.mejoraVsGreedyPct.toFixed(1)}% más barato que asignar a mano).
          {run.resultado.sinAsignar ? ` ${run.resultado.sinAsignar} quedaron en el pool: ${run.resultado.foliosSinAsignar?.map((f) => `${f.folio} (${f.motivo})`).join(', ')}` : ''}
          {' '}Clientes y repartidores ya fueron notificados por correo.
        </Notice>
      )}

      {run.escenario && <GaRunPanel {...run} poblacion={120} generaciones={200} />}

      <Card>
        <CardHeader title={`En ruta (${pool.data?.activos.length ?? 0})`} subtitle="Asignados por el algoritmo, en orden de visita" />
        <CardBody className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-[11px] font-bold uppercase text-slate-400">
              <tr>
                <th className="py-2">Folio</th>
                <th>Medio</th>
                <th>Repartidor</th>
                <th>Orden</th>
                <th>Estado</th>
                <th>Destino</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pool.data?.activos.map((envio) => (
                <tr key={envio.id} className="text-slate-600">
                  <td className="py-2 font-mono text-xs font-bold">{envio.folio}</td>
                  <td>
                    <span className="flex items-center gap-1.5" style={{ color: medioColor(envio.medioId) }}>
                      <MedioIcon medio={envio.medioId} className="h-4 w-4" /> {medioNombre(envio.medioId)}
                    </span>
                  </td>
                  <td>{flota.data?.find((r) => r.id === envio.repartidorId)?.nombre ?? '—'}</td>
                  <td>#{envio.secuencia}</td>
                  <td>
                    <Badge>{envio.status === 'EN_RUTA' ? 'en camino' : 'asignado'}</Badge>
                  </td>
                  <td className="max-w-xs truncate">{envio.destinoDireccion}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  );
}

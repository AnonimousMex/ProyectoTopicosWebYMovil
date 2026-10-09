import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, BrainCircuit, FlaskConical, RotateCcw, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Notice, PageLoader } from '@/components/ui/Feedback';
import { Badge, PageHeader, Toggle } from '@/components/ui/Misc';
import { api, errorMessage } from '@/lib/apiClient';
import type { SugerenciaIA } from '@/types/api';
import { AiSuggestionCard } from '@/features/pedidos/components/AiSuggestionCard';

interface ProviderConfig {
  id: string;
  nombre: string;
  formato: string;
  activo: boolean;
  prioridad: number;
  circuito: { state: string; totalCalls: number; totalFailures: number; totalRejected: number; lastError: string | null } | null;
}

interface ExternalProvider {
  id: 'routeai' | 'xmlbrain';
  nombre: string;
  formato: string;
  caos: { caido: boolean; tasaFallo: number; latenciaMs: number };
  llamadas: { ok: number; falla: number; caido: number };
}

const BREAKER_COLOR: Record<string, string> = { CERRADO: '#10B981', ABIERTO: '#EF4444', SEMIABIERTO: '#F59E0B' };

const SAMPLE = () => ({
  origen: { direccion: 'Instituto Tecnológico de Morelia', lat: 19.7215, lng: -101.1857 },
  destino: { direccion: 'Plaza Las Américas', lat: 19.6869, lng: -101.1567 },
  pesoKg: 1.8,
  largoCm: 25,
  anchoCm: 18,
  altoCm: 10,
  fragil: false,
  urgencia: 'ALTA',
  fechaLimite: new Date(Date.now() + 2 * 3_600_000).toISOString(),
  extras: [],
  valorDeclarado: 0,
});

export function IaPage() {
  const queryClient = useQueryClient();
  const providers = useQuery({ queryKey: ['ia', 'proveedores'], queryFn: () => api.get<ProviderConfig[]>('/ia/proveedores').then((r) => r.data), refetchInterval: 5000 });
  const external = useQuery({ queryKey: ['ia', 'externos'], queryFn: () => api.get<ExternalProvider[]>('/ia/proveedores-externos').then((r) => r.data), refetchInterval: 5000 });

  const updateProvider = useMutation({
    mutationFn: ({ id, ...body }: { id: string; activo?: boolean; prioridad?: number }) => api.patch(`/ia/proveedores/${id}`, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ia', 'proveedores'] }),
    onError: (e) => toast.error(errorMessage(e)),
  });
  const resetBreaker = useMutation({
    mutationFn: (id: string) => api.post(`/ia/proveedores/${id}/reiniciar-circuito`),
    onSuccess: () => {
      toast.success('Circuito reiniciado');
      queryClient.invalidateQueries({ queryKey: ['ia', 'proveedores'] });
    },
  });
  const chaos = useMutation({
    mutationFn: ({ id, ...body }: { id: string; caido?: boolean; tasaFallo?: number; latenciaMs?: number }) => api.patch(`/ia/proveedores-externos/${id}`, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ia', 'externos'] }),
    onError: (e) => toast.error(errorMessage(e)),
  });
  const test = useMutation({
    mutationFn: () => api.post<{ sugerencia: SugerenciaIA }>('/ia/probar', SAMPLE()).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ia'] }),
    onError: (e) => toast.error(errorMessage(e)),
  });

  if (providers.isLoading) return <PageLoader />;
  const ordered = [...(providers.data ?? [])].sort((a, b) => a.prioridad - b.prioridad);

  const move = (index: number, direction: -1 | 1) => {
    const other = ordered[index + direction];
    const current = ordered[index];
    if (!other) return;
    updateProvider.mutate({ id: current.id, prioridad: other.prioridad });
    updateProvider.mutate({ id: other.id, prioridad: current.prioridad });
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        eyebrow="Adapter + Chain of Responsibility + Circuit Breaker"
        title="Proveedores de IA"
        subtitle="Cada proveedor habla su idioma (JSON, XML u objeto interno). Un adaptador lo traduce a Sugerencia{ medio, motivo }. Si uno falla, se pregunta al siguiente."
        actions={
          <Button onClick={() => test.mutate()} loading={test.isPending}>
            <FlaskConical className="h-4 w-4" /> Probar en vivo
          </Button>
        }
      />

      {test.data?.sugerencia && <AiSuggestionCard sugerencia={test.data.sugerencia} />}

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Orden de consulta" subtitle="El modelo interno siempre queda como red de seguridad" icon={<BrainCircuit className="h-4 w-4" />} />
          <CardBody className="space-y-3">
            {ordered.map((provider, index) => (
              <div key={provider.id} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink-900 text-xs font-bold text-white">{index + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-sm font-bold text-ink-900">
                    {provider.nombre} <span className="rounded bg-slate-100 px-1.5 font-mono text-[10px] text-slate-500">{provider.formato}</span>
                  </p>
                  {provider.circuito ? (
                    <p className="text-[11px] text-slate-500">
                      <span className="font-bold" style={{ color: BREAKER_COLOR[provider.circuito.state] }}>
                        ● Circuito {provider.circuito.state.toLowerCase()}
                      </span>{' '}
                      · {provider.circuito.totalCalls} llamadas · {provider.circuito.totalFailures} fallas · {provider.circuito.totalRejected} rechazadas al instante
                    </p>
                  ) : (
                    <p className="text-[11px] text-emerald-600">Local: nunca depende de la red</p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="ghost" disabled={index === 0} onClick={() => move(index, -1)} aria-label="Subir">
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" disabled={index === ordered.length - 1} onClick={() => move(index, 1)} aria-label="Bajar">
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  {provider.circuito && provider.circuito.state !== 'CERRADO' && (
                    <Button size="icon" variant="ghost" onClick={() => resetBreaker.mutate(provider.id)} aria-label="Reiniciar circuito">
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  )}
                  <Toggle checked={provider.activo} onChange={(activo) => updateProvider.mutate({ id: provider.id, activo })} label="Activo" />
                </div>
              </div>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Simulador de fallas (proveedores externos)" subtitle="Tumba un proveedor y mira cómo el sistema sigue respondiendo" icon={<Zap className="h-4 w-4" />} />
          <CardBody className="space-y-4">
            {external.data?.map((provider) => (
              <div key={provider.id} className="space-y-3 rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-ink-900">
                    {provider.nombre} <Badge>{provider.formato}</Badge>
                  </p>
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                    {provider.caos.caido ? <span className="text-rose-600">CAÍDO</span> : 'En línea'}
                    <Toggle checked={!provider.caos.caido} onChange={(online) => chaos.mutate({ id: provider.id, caido: !online })} label="En línea" />
                  </label>
                </div>
                <label className="block text-xs text-slate-600">
                  Fallas aleatorias: <strong>{Math.round(provider.caos.tasaFallo * 100)}%</strong>
                  <input type="range" min={0} max={1} step={0.05} defaultValue={provider.caos.tasaFallo} onMouseUp={(e) => chaos.mutate({ id: provider.id, tasaFallo: Number(e.currentTarget.value) })} onTouchEnd={(e) => chaos.mutate({ id: provider.id, tasaFallo: Number(e.currentTarget.value) })} className="mt-1 w-full accent-rose-500" />
                </label>
                <label className="block text-xs text-slate-600">
                  Latencia: <strong>{provider.caos.latenciaMs} ms</strong>
                  <input type="range" min={0} max={4000} step={100} defaultValue={provider.caos.latenciaMs} onMouseUp={(e) => chaos.mutate({ id: provider.id, latenciaMs: Number(e.currentTarget.value) })} onTouchEnd={(e) => chaos.mutate({ id: provider.id, latenciaMs: Number(e.currentTarget.value) })} className="mt-1 w-full accent-amber-500" />
                </label>
                <p className="text-[11px] text-slate-500">
                  Respuestas: {provider.llamadas.ok} ok · {provider.llamadas.falla} fallas · {provider.llamadas.caido} caído
                </p>
              </div>
            ))}
            <Notice tone="info">Con latencia mayor a 1.5 s se dispara el timeout; tras 2 fallas el circuito se abre y las siguientes peticiones se responden en milisegundos con el respaldo.</Notice>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

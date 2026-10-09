import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Mail, MapPinOff, RefreshCw, Send, Server } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { PageLoader } from '@/components/ui/Feedback';
import { Input } from '@/components/ui/Input';
import { Badge, PageHeader, Toggle } from '@/components/ui/Misc';
import { api, errorMessage } from '@/lib/apiClient';
import { dateTime } from '@/lib/format';

interface Salud {
  servicios: Array<{
    id: string;
    nombre: string;
    estado: 'ok' | 'degradado' | 'caido';
    latenciaMs: number;
    uptimeSeg?: number;
    memoriaMb?: number;
    circuitos?: Array<{ name: string; state: string; totalCalls: number; totalFailures: number; totalFallbacks: number; lastError: string | null }>;
  }>;
  rutas: Array<{ prefix: string; service: string; access: string; descripcion: string }>;
}

interface Correos {
  driver: string;
  correos: Array<{ id: string; to: string; subject: string; status: string; attempts: number; lastError: string | null; createdAt: string; driver: string | null }>;
}

const ESTADO = { ok: '#10B981', degradado: '#F59E0B', caido: '#EF4444' } as const;
const BREAKER = { CERRADO: '#10B981', ABIERTO: '#EF4444', SEMIABIERTO: '#F59E0B' } as Record<string, string>;

export function SistemaPage() {
  const queryClient = useQueryClient();
  const [para, setPara] = useState('appprueba695@gmail.com');
  const salud = useQuery({ queryKey: ['sistema', 'salud'], queryFn: () => api.get<Salud>('/sistema/salud').then((r) => r.data), refetchInterval: 5000 });
  const caosMapas = useQuery({ queryKey: ['mapas', 'caos'], queryFn: () => api.get<{ caido: boolean; tasaFallo: number; latenciaMs: number }>('/mapas/caos').then((r) => r.data) });
  const correos = useQuery({ queryKey: ['correos'], queryFn: () => api.get<Correos>('/correos').then((r) => r.data), refetchInterval: 10_000 });

  const setMapas = useMutation({
    mutationFn: (body: { caido?: boolean }) => api.patch('/mapas/caos', body).then((r) => r.data),
    onSuccess: (data) => {
      queryClient.setQueryData(['mapas', 'caos'], data);
      toast(data.caido ? 'Proveedor de mapas CAÍDO: prueba consultar un pedido o cotizar' : 'Proveedor de mapas en línea');
    },
  });
  const testMail = useMutation({
    mutationFn: () => api.post<{ status: string; driver: string; error: string | null }>('/correos/prueba', { para }).then((r) => r.data),
    onSuccess: (data) => {
      if (data.status === 'ENVIADO') toast.success(`Correo enviado vía ${data.driver}`);
      else toast.error(data.error ?? 'No se pudo enviar');
      queryClient.invalidateQueries({ queryKey: ['correos'] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const retry = useMutation({
    mutationFn: (id: string) => api.post(`/correos/${id}/reintentar`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['correos'] }),
  });

  if (salud.isLoading) return <PageLoader />;

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader title="Salud y resiliencia" subtitle="Estado de cada microservicio, sus circuitos y el simulador de fallas. Se actualiza cada 5 s." />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {salud.data?.servicios.map((servicio) => (
          <Card key={servicio.id}>
            <CardBody className="space-y-2 p-4">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: ESTADO[servicio.estado] }} />
                <p className="text-sm font-bold text-ink-900">{servicio.nombre}</p>
                <span className="ml-auto text-[11px] text-slate-400">{servicio.latenciaMs} ms</span>
              </div>
              <p className="text-[11px] text-slate-500">
                {servicio.estado === 'caido' ? 'Sin respuesta' : `${Math.round((servicio.uptimeSeg ?? 0) / 60)} min arriba · ${servicio.memoriaMb} MB`}
              </p>
              {servicio.circuitos?.map((c) => (
                <p key={c.name} className="truncate text-[11px]" title={c.lastError ?? ''}>
                  <span className="font-bold" style={{ color: BREAKER[c.state] }}>●</span> {c.name} · {c.totalFallbacks} respaldos
                </p>
              ))}
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Simulador de fallas: mapas" icon={<MapPinOff className="h-4 w-4" />} subtitle="Prueba: con el mapa caído, consultar un pedido guardado sigue funcionando" />
          <CardBody className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-800">{caosMapas.data?.caido ? 'Proveedor de mapas caído' : 'Proveedor de mapas en línea'}</p>
              <p className="text-xs text-slate-500">Cotizaciones y algoritmo usan estimación local mientras tanto.</p>
            </div>
            <Toggle checked={!caosMapas.data?.caido} onChange={(online) => setMapas.mutate({ caido: !online })} label="Mapas en línea" />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Correo saliente" icon={<Mail className="h-4 w-4" />} subtitle={`Adaptador activo: ${correos.data?.driver ?? '—'} · remitente appprueba695@gmail.com`} />
          <CardBody className="flex gap-2">
            <Input value={para} onChange={(e) => setPara(e.target.value)} />
            <Button onClick={() => testMail.mutate()} loading={testMail.isPending}>
              <Send className="h-4 w-4" /> Probar
            </Button>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Bitácora de correos" subtitle="Si un envío falla se reintenta con espera exponencial; el pedido nunca se detiene por esto." />
        <CardBody className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-[11px] font-bold uppercase text-slate-400">
              <tr>
                <th className="py-2">Fecha</th>
                <th>Para</th>
                <th>Asunto</th>
                <th>Estado</th>
                <th>Intentos</th>
                <th />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {correos.data?.correos.map((correo) => (
                <tr key={correo.id} className="text-slate-600">
                  <td className="py-2 whitespace-nowrap">{dateTime(correo.createdAt)}</td>
                  <td className="max-w-48 truncate">{correo.to}</td>
                  <td className="max-w-72 truncate">{correo.subject}</td>
                  <td>
                    <Badge color={correo.status === 'ENVIADO' ? '#10B981' : correo.status === 'FALLIDO' ? '#EF4444' : '#F59E0B'}>{correo.status.toLowerCase()}</Badge>
                  </td>
                  <td title={correo.lastError ?? ''}>{correo.attempts}</td>
                  <td className="text-right">
                    {correo.status !== 'ENVIADO' && (
                      <Button size="sm" variant="ghost" onClick={() => retry.mutate(correo.id)}>
                        <RefreshCw className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Tabla de enrutamiento del API Gateway" subtitle="Agregar un servicio = una línea; sesión, bitácora y firma se aplican solas" icon={<Server className="h-4 w-4" />} />
        <CardBody className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {salud.data?.rutas.map((ruta) => (
            <div key={ruta.prefix} className="rounded-xl border border-slate-100 px-3 py-2 text-xs">
              <p className="font-mono font-bold text-ink-900">{ruta.prefix}</p>
              <p className="text-slate-500">
                → {ruta.service} · {ruta.access} · {ruta.descripcion}
              </p>
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}

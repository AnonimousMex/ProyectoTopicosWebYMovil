import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CheckCircle2, Clock, DollarSign, Dna, Inbox, Package, Radio, Route } from 'lucide-react';
import { OrderStatusLabels, type OrderStatus } from '@rumbo/shared/contracts';
import { MedioIcon } from '@/components/map/MedioIcon';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { ErrorState, PageLoader } from '@/components/ui/Feedback';
import { PageHeader, StatCard } from '@/components/ui/Misc';
import { api } from '@/lib/apiClient';
import { money, number, relative, shortDate } from '@/lib/format';
import { medioColor, medioNombre } from '@/lib/medios';
import type { BffSection, Envio, Posicion } from '@/types/api';
import { STATUS_STYLE } from '@/features/pedidos/components/StatusBadge';

interface Stats {
  kpis: {
    pedidosHoy: number;
    ingresosHoy: number;
    pedidosPeriodo: number;
    ingresosPeriodo: number;
    ticketPromedio: number;
    entregados: number;
    aTiempoPct: number;
    minutosPromedioEntrega: number;
    canceladosPct: number;
    kmTotales: number;
  };
  serie: Array<{ fecha: string; pedidos: number; ingresos: number; entregados: number }>;
  porMedio: Array<{ medio: string; pedidos: number; ingresos: number; entregados: number; aTiempo: number }>;
  porEstado: Record<string, number>;
  porHora: number[];
  optimizaciones: { corridas: number; mejoraPromedioPct: number; enviosAsignados: number };
}

interface PanelInicio {
  estadisticas: BffSection<Stats>;
  pool: BffSection<{ pool: Envio[]; activos: Envio[] }>;
  enRuta: BffSection<Posicion[]>;
  eventos: BffSection<Array<{ id: string; type: string; source: string; folio: string | null; occurredAt: string }>>;
}

const axis = { fontSize: 11, fill: '#94A3B8' };

const EVENT_LABEL: Record<string, string> = {
  'pedido.creado': 'Pedido creado',
  'pedido.estado_cambiado': 'Cambio de estado',
  'pago.acreditado': 'Pago acreditado',
  'pago.rechazado': 'Pago rechazado',
  'pago.reembolsado': 'Reembolso',
  'envio.asignado': 'Envío asignado',
  'envio.llego_destino': 'Repartidor en destino',
  'usuario.registrado': 'Usuario registrado',
  'optimizacion.completada': 'Optimización genética',
};

export function DashboardPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['bff', 'panel'],
    queryFn: () => api.get<PanelInicio>('/bff/panel/inicio').then((r) => r.data),
    refetchInterval: 30_000,
  });

  if (isLoading) return <PageLoader />;
  if (error) return <ErrorState message={(error as Error).message} onRetry={() => void refetch()} />;

  const stats = data?.estadisticas.data;
  const k = stats?.kpis;
  const estados = Object.entries(stats?.porEstado ?? {}).map(([estado, valor]) => ({ estado: estado as OrderStatus, valor }));

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader eyebrow="Últimos 14 días" title="Tablero de operación" subtitle="Una sola petición al BFF arma esta pantalla; si un módulo falla, el resto se sigue mostrando." />

      {!data?.estadisticas.ok && <ErrorState message="El servicio de estadísticas no responde; el resto del tablero sigue disponible." />}

      {k && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Pedidos hoy" value={k.pedidosHoy} hint={`${number(k.pedidosPeriodo)} en el periodo`} icon={<Package className="h-4 w-4" />} />
          <StatCard label="Ingresos del periodo" value={money(k.ingresosPeriodo)} hint={`hoy ${money(k.ingresosHoy)} · ticket ${money(k.ticketPromedio)}`} icon={<DollarSign className="h-4 w-4" />} tone="#10B981" />
          <StatCard label="Entregas a tiempo" value={`${k.aTiempoPct}%`} hint={`${number(k.entregados)} entregados · ${k.canceladosPct}% cancelados`} icon={<CheckCircle2 className="h-4 w-4" />} tone="#6366F1" />
          <StatCard label="Tiempo promedio" value={`${Math.round(k.minutosPromedioEntrega)} min`} hint={`${number(k.kmTotales)} km recorridos`} icon={<Clock className="h-4 w-4" />} tone="#F59E0B" />
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Pedidos e ingresos por día" />
          <CardBody className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats?.serie ?? []} margin={{ left: 0, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="ing" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#FF5A1F" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#FF5A1F" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#EEF2F7" vertical={false} />
                <XAxis dataKey="fecha" tickFormatter={shortDate} tick={axis} tickLine={false} axisLine={false} />
                <YAxis yAxisId="i" tick={axis} tickLine={false} axisLine={false} width={60} tickFormatter={(v) => `$${number(v)}`} />
                <YAxis yAxisId="p" orientation="right" tick={axis} tickLine={false} axisLine={false} width={30} />
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} labelFormatter={(v) => shortDate(String(v))} formatter={(v, n) => [n === 'ingresos' ? money(Number(v)) : String(v), n === 'ingresos' ? 'Ingresos' : 'Pedidos']} />
                <Area yAxisId="i" type="monotone" dataKey="ingresos" stroke="#FF5A1F" strokeWidth={2.5} fill="url(#ing)" />
                <Bar yAxisId="p" dataKey="pedidos" fill="#6366F1" opacity={0.35} radius={[4, 4, 0, 0]} />
              </AreaChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Pedidos por estado" />
          <CardBody className="h-72">
            <ResponsiveContainer width="100%" height="65%">
              <PieChart>
                <Pie data={estados} dataKey="valor" nameKey="estado" innerRadius={50} outerRadius={78} paddingAngle={2}>
                  {estados.map((item) => (
                    <Cell key={item.estado} fill={STATUS_STYLE[item.estado]?.color ?? '#CBD5E1'} />
                  ))}
                </Pie>
                <Tooltip formatter={(v, n) => [String(v), OrderStatusLabels[n as OrderStatus] ?? String(n)]} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              {estados.map((item) => (
                <span key={item.estado} className="flex items-center gap-1.5 text-slate-600">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: STATUS_STYLE[item.estado]?.color }} />
                  {OrderStatusLabels[item.estado]} <strong className="ml-auto">{item.valor}</strong>
                </span>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <Card>
          <CardHeader title="Desempeño por medio" />
          <CardBody className="space-y-3">
            {stats?.porMedio.map((row) => (
              <div key={row.medio}>
                <div className="flex items-center gap-2 text-sm">
                  <MedioIcon medio={row.medio} className="h-4 w-4" />
                  <span className="font-semibold text-slate-700">{medioNombre(row.medio)}</span>
                  <span className="ml-auto text-xs text-slate-500">
                    {row.pedidos} · {money(row.ingresos)} · {row.entregados ? Math.round((row.aTiempo / row.entregados) * 100) : 0}% a tiempo
                  </span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full" style={{ width: `${(row.pedidos / Math.max(...(stats?.porMedio.map((m) => m.pedidos) ?? [1]))) * 100}%`, backgroundColor: medioColor(row.medio) }} />
                </div>
              </div>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Horas pico" subtitle="Pedidos creados por hora" />
          <CardBody className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={(stats?.porHora ?? []).map((v, h) => ({ h, v }))}>
                <XAxis dataKey="h" tick={axis} tickLine={false} axisLine={false} interval={2} />
                <Tooltip formatter={(v) => [String(v), 'pedidos']} labelFormatter={(h) => `${h}:00`} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                <Bar dataKey="v" fill="#0B1020" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Ahora mismo" />
          <CardBody className="space-y-3">
            <Link to="/panel/asignacion" className="flex items-center gap-3 rounded-xl bg-amber-50 p-3">
              <Inbox className="h-5 w-5 text-amber-600" />
              <span className="flex-1 text-sm font-semibold text-amber-800">Pool por asignar</span>
              <strong className="text-lg text-amber-800">{data?.pool.data?.pool.length ?? '—'}</strong>
            </Link>
            <Link to="/panel/mapa" className="flex items-center gap-3 rounded-xl bg-emerald-50 p-3">
              <Radio className="h-5 w-5 text-emerald-600" />
              <span className="flex-1 text-sm font-semibold text-emerald-800">En movimiento</span>
              <strong className="text-lg text-emerald-800">{data?.enRuta.data?.length ?? '—'}</strong>
            </Link>
            <Link to="/panel/asignacion" className="flex items-center gap-3 rounded-xl bg-accent-50 p-3">
              <Route className="h-5 w-5 text-accent-600" />
              <span className="flex-1 text-sm font-semibold text-accent-600">Asignados en ruta</span>
              <strong className="text-lg text-accent-600">{data?.pool.data?.activos.length ?? '—'}</strong>
            </Link>
            {stats && (
              <div className="flex items-center gap-3 rounded-xl bg-brand-50 p-3">
                <Dna className="h-5 w-5 text-brand-600" />
                <span className="flex-1 text-sm font-semibold text-brand-700">Ahorro del algoritmo genético</span>
                <strong className="text-lg text-brand-700">{stats.optimizaciones.mejoraPromedioPct}%</strong>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Eventos recientes del bus" subtitle="Lo que escuchan cliente, repartidor, notificaciones, estadísticas e IA" />
        <CardBody className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {data?.eventos.data?.length === 0 && <p className="text-sm text-slate-400">Aún no hay eventos; crea o paga un pedido.</p>}
          {data?.eventos.data?.map((evento) => (
            <div key={evento.id} className="flex items-center gap-2 rounded-xl border border-slate-100 px-3 py-2 text-xs">
              <span className="h-2 w-2 rounded-full bg-brand-500" />
              <span className="font-semibold text-slate-700">{EVENT_LABEL[evento.type] ?? evento.type}</span>
              {evento.folio && <span className="font-mono text-slate-500">{evento.folio}</span>}
              <span className="ml-auto text-slate-400">{relative(evento.occurredAt)}</span>
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}

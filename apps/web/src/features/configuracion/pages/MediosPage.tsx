import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Code2, Database, Pencil, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { MedioIcon } from '@/components/map/MedioIcon';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Notice, PageLoader } from '@/components/ui/Feedback';
import { Field, Input, Select } from '@/components/ui/Input';
import { Badge, Modal, PageHeader, Toggle } from '@/components/ui/Misc';
import { api, errorMessage } from '@/lib/apiClient';
import { money } from '@/lib/format';
import type { Extra, Medio } from '@/types/api';
import { useExtras, useMedios } from '@/features/pedidos/hooks/usePedidos';

const NUMERIC: Array<[keyof Medio, string, number?]> = [
  ['velocidadKmh', 'Velocidad (km/h)'],
  ['sensibilidadTrafico', 'Sensibilidad al tráfico (0–1)', 0.05],
  ['costoBase', 'Banderazo ($)'],
  ['costoPorKm', 'Costo por km ($)', 0.1],
  ['costoPorKg', 'Costo por kg ($)', 0.1],
  ['costoOperativoKm', 'Costo operativo / km ($)', 0.1],
  ['pesoMaxKg', 'Peso máximo (kg)', 0.1],
  ['volumenMaxL', 'Volumen máximo (L)'],
  ['distanciaMaxKm', 'Alcance máximo (km)'],
  ['capacidadPaquetes', 'Paquetes por ruta'],
  ['emisionesGCO2Km', 'Emisiones (g CO₂/km)'],
];

const EMPTY_MEDIO: Medio = {
  id: '',
  nombre: '',
  descripcion: '',
  icono: 'package',
  color: '#8B5CF6',
  activo: true,
  orden: 10,
  velocidadKmh: 25,
  sensibilidadTrafico: 0.5,
  costoBase: 30,
  costoPorKm: 6,
  costoPorKg: 2,
  costoOperativoKm: 3,
  pesoMaxKg: 20,
  volumenMaxL: 80,
  distanciaMaxKm: 20,
  capacidadPaquetes: 5,
  emisionesGCO2Km: 50,
};

export function MediosPage() {
  const queryClient = useQueryClient();
  const { data: medios, isLoading } = useMedios();
  const { data: extras = [] } = useExtras();
  const [editing, setEditing] = useState<{ medio: Medio; nuevo: boolean } | null>(null);
  const [extra, setExtra] = useState<Extra | null>(null);

  const saveMedio = useMutation({
    mutationFn: ({ medio, nuevo }: { medio: Medio; nuevo: boolean }) => {
      const { id, repartidores: _r, estrategiaPropia: _e, ...body } = medio;
      return nuevo ? api.post('/medios', { id, ...body }).then(() => undefined) : api.patch(`/medios/${id}`, body).then(() => undefined);
    },
    onSuccess: () => {
      toast.success('Medio guardado: ya aplica en cotizaciones y en el algoritmo');
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ['medios'] });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const toggleMedio = useMutation({
    mutationFn: (medio: Medio) => api.patch(`/medios/${medio.id}`, { activo: !medio.activo }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['medios'] }),
    onError: (error) => toast.error(errorMessage(error)),
  });

  const saveExtra = useMutation({
    mutationFn: ({ id, ...body }: Extra) => api.put(`/extras/${id}`, body),
    onSuccess: () => {
      toast.success('Extra guardado');
      setExtra(null);
      queryClient.invalidateQueries({ queryKey: ['extras'] });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        title="Medios, tarifas y extras"
        subtitle="Costos y tiempos viven en la base de datos: cambiarlos no requiere tocar HTML, SQL ni el cobro."
        actions={
          <Button onClick={() => setEditing({ medio: EMPTY_MEDIO, nuevo: true })}>
            <Plus className="h-4 w-4" /> Nuevo medio
          </Button>
        }
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {medios?.map((medio) => (
          <Card key={medio.id} className={medio.activo ? '' : 'opacity-60'}>
            <CardBody className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ backgroundColor: `${medio.color}1A` }}>
                  <MedioIcon medio={medio.id} color={medio.color} className="h-6 w-6" />
                </span>
                <div className="flex-1">
                  <p className="font-bold text-ink-900">{medio.nombre}</p>
                  <p className="text-[11px] text-slate-500">{medio.repartidores} repartidores</p>
                </div>
                <Toggle checked={medio.activo} onChange={() => toggleMedio.mutate(medio)} label="Activo" />
              </div>
              <p className="text-xs text-slate-500">{medio.descripcion}</p>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-slate-600">
                <span>{medio.velocidadKmh} km/h</span>
                <span>máx {medio.pesoMaxKg} kg</span>
                <span>{money(medio.costoBase)} + {money(medio.costoPorKm)}/km</span>
                <span>alcance {medio.distanciaMaxKm} km</span>
              </div>
              <div className="flex items-center justify-between">
                <Badge color={medio.estrategiaPropia ? '#6366F1' : '#64748B'}>
                  {medio.estrategiaPropia ? <Code2 className="h-3 w-3" /> : <Database className="h-3 w-3" />}
                  {medio.estrategiaPropia ? 'Estrategia propia' : 'Estrategia genérica'}
                </Badge>
                <Button size="sm" variant="ghost" onClick={() => setEditing({ medio, nuevo: false })}>
                  <Pencil className="h-3.5 w-3.5" /> Editar
                </Button>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      <Notice>
        Un medio creado aquí funciona de inmediato con la <strong>estrategia genérica</strong> (peso, volumen, alcance y tráfico). Si necesita reglas especiales — como la
        zona de exclusión aérea del dron — se agrega una clase Strategy y se registra; el cotizador y el algoritmo genético no cambian.
      </Notice>

      <Card>
        <CardHeader title="Extras (patrón Decorator)" subtitle="Cada extra envuelve el precio anterior; se combinan en cualquier orden." />
        <CardBody className="grid gap-3 md:grid-cols-3">
          {extras.map((item) => (
            <div key={item.id} className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <p className="font-bold text-ink-900">{item.nombre}</p>
                <Button size="sm" variant="ghost" onClick={() => setExtra(item)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </div>
              <p className="mt-1 text-xs text-slate-500">{item.descripcion}</p>
              <p className="mt-2 text-sm font-semibold text-brand-600">
                {item.tipo === 'FIJO' ? money(item.valor) : `${item.valor}% ${item.tipo === 'PORCENTAJE_VALOR' ? 'del valor declarado' : 'del total'}`}
                {item.minimo > 0 && ` (mín. ${money(item.minimo)})`}
              </p>
              {!item.activo && <Badge className="mt-2">Inactivo</Badge>}
            </div>
          ))}
        </CardBody>
      </Card>

      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title={editing?.nuevo ? 'Nuevo medio' : `Editar ${editing?.medio.nombre}`} wide>
        {editing && (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              saveMedio.mutate(editing);
            }}
          >
            <div className="grid gap-3 sm:grid-cols-3">
              {editing.nuevo && (
                <Field label="Identificador" hint="ej. patineta">
                  <Input required value={editing.medio.id} onChange={(e) => setEditing({ ...editing, medio: { ...editing.medio, id: e.target.value } })} />
                </Field>
              )}
              <Field label="Nombre">
                <Input required value={editing.medio.nombre} onChange={(e) => setEditing({ ...editing, medio: { ...editing.medio, nombre: e.target.value } })} />
              </Field>
              <Field label="Color">
                <Input type="color" className="h-11 p-1" value={editing.medio.color} onChange={(e) => setEditing({ ...editing, medio: { ...editing.medio, color: e.target.value } })} />
              </Field>
            </div>
            <Field label="Descripción">
              <Input value={editing.medio.descripcion} onChange={(e) => setEditing({ ...editing, medio: { ...editing.medio, descripcion: e.target.value } })} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-3">
              {NUMERIC.map(([key, label, step]) => (
                <Field key={key} label={label}>
                  <Input
                    type="number"
                    step={step ?? 1}
                    value={editing.medio[key] as number}
                    onChange={(e) => setEditing({ ...editing, medio: { ...editing.medio, [key]: Number(e.target.value) } })}
                  />
                </Field>
              ))}
            </div>
            <Button type="submit" className="w-full" loading={saveMedio.isPending}>
              Guardar
            </Button>
          </form>
        )}
      </Modal>

      <Modal open={Boolean(extra)} onClose={() => setExtra(null)} title={`Extra: ${extra?.nombre}`}>
        {extra && (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              saveExtra.mutate(extra);
            }}
          >
            <Field label="Nombre">
              <Input value={extra.nombre} onChange={(e) => setExtra({ ...extra, nombre: e.target.value })} />
            </Field>
            <Field label="Descripción">
              <Input value={extra.descripcion} onChange={(e) => setExtra({ ...extra, descripcion: e.target.value })} />
            </Field>
            <Field label="Tipo de cálculo">
              <Select value={extra.tipo} onChange={(e) => setExtra({ ...extra, tipo: e.target.value as Extra['tipo'] })}>
                <option value="PORCENTAJE_VALOR">% del valor declarado</option>
                <option value="PORCENTAJE_TOTAL">% del total</option>
                <option value="FIJO">Monto fijo</option>
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Valor">
                <Input type="number" step="0.1" value={extra.valor} onChange={(e) => setExtra({ ...extra, valor: Number(e.target.value) })} />
              </Field>
              <Field label="Mínimo ($)">
                <Input type="number" value={extra.minimo} onChange={(e) => setExtra({ ...extra, minimo: Number(e.target.value) })} />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Toggle checked={extra.activo} onChange={(v) => setExtra({ ...extra, activo: v })} /> Activo
            </label>
            <Button type="submit" className="w-full" loading={saveExtra.isPending}>
              Guardar
            </Button>
          </form>
        )}
      </Modal>
    </div>
  );
}

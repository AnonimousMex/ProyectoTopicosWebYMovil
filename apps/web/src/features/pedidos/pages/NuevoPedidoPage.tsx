import { useMemo, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Box, CheckCircle2, Mail, Package, ShieldAlert, Sparkles } from 'lucide-react';
import { Marker, Polyline } from 'react-leaflet';
import { BaseMap, boundsOf, pinIcon } from '@/components/map/BaseMap';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { Notice } from '@/components/ui/Feedback';
import { Field, Input, Textarea } from '@/components/ui/Input';
import { Segmented } from '@/components/ui/Misc';
import { newIdempotencyKey } from '@/lib/apiClient';
import { cn } from '@/lib/cn';
import { money } from '@/lib/format';
import { useAuth } from '@/features/auth/hooks/AuthProvider';
import { PaymentForm } from '@/features/pagos/components/PaymentForm';
import type { Cotizacion, PedidoPanel } from '@/types/api';
import type { CotizacionInput } from '../api/pedidosApi';
import { AiSuggestionCard } from '../components/AiSuggestionCard';
import { OrderRouteMap } from '../components/OrderRouteMap';
import { PlacePicker } from '../components/PlacePicker';
import { QuoteOptions } from '../components/QuoteOptions';
import { useCotizar, useCrearPedido, useExtras } from '../hooks/usePedidos';
import { nuevoPedidoSchema, type NuevoPedidoForm, type NuevoPedidoValues } from '../schemas/pedidoSchemas';

const STEPS = ['Ruta', 'Paquete', 'Medio', 'Pago'];

const PRESETS = [
  { label: 'Sobre', peso: 0.3, dims: [30, 22, 2] },
  { label: 'Caja chica', peso: 1.5, dims: [25, 18, 10] },
  { label: 'Caja mediana', peso: 6, dims: [40, 30, 25] },
  { label: 'Caja grande', peso: 20, dims: [60, 45, 40] },
];

function toQuoteInput(values: NuevoPedidoValues): CotizacionInput {
  const strip = ({ nombre: _nombre, ...rest }: NuevoPedidoValues['origen']) => rest;
  return {
    origen: strip(values.origen),
    destino: strip(values.destino),
    pesoKg: values.pesoKg,
    largoCm: values.largoCm,
    anchoCm: values.anchoCm,
    altoCm: values.altoCm,
    fragil: values.fragil || values.extras.includes('FRAGIL'),
    urgencia: values.extras.includes('URGENTE') && values.urgencia === 'NORMAL' ? 'ALTA' : values.urgencia,
    fechaLimite: new Date(Date.now() + values.horasLimite * 3_600_000).toISOString(),
    extras: values.extras,
    valorDeclarado: values.valorDeclarado,
  };
}

export function NuevoPedidoPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [cotizacion, setCotizacion] = useState<Cotizacion | null>(null);
  const [medio, setMedio] = useState<string | null>(null);
  const [pedido, setPedido] = useState<PedidoPanel | null>(null);
  const orderKey = useRef(newIdempotencyKey());
  const { data: extras = [] } = useExtras();
  const cotizar = useCotizar();
  const crear = useCrearPedido();

  const form = useForm<NuevoPedidoForm, unknown, NuevoPedidoValues>({
    resolver: zodResolver(nuevoPedidoSchema),
    defaultValues: {
      pesoKg: 1.5,
      largoCm: 25,
      anchoCm: 18,
      altoCm: 10,
      fragil: false,
      urgencia: 'NORMAL',
      horasLimite: 3,
      extras: [],
      valorDeclarado: 0,
      destinatarioNombre: '',
      destinatarioTelefono: '',
    },
  });
  const { errors } = form.formState;
  const origen = form.watch('origen');
  const destino = form.watch('destino');
  const selectedExtras = form.watch('extras');

  const previewBounds = useMemo(
    () => boundsOf([origen, destino].filter(Boolean).map((p) => [p!.lat, p!.lng] as [number, number])),
    [origen, destino],
  );

  const next = async () => {
    if (step === 0 && (await form.trigger(['origen', 'destino']))) setStep(1);
    if (step === 1 && (await form.trigger())) {
      await form.handleSubmit(async (values) => {
        const result = await cotizar.mutateAsync(toQuoteInput(values));
        setCotizacion(result);
        setMedio(null);
        setStep(2);
      })();
    }
    if (step === 2) {
      await form.handleSubmit(async (values) => {
        const created = await crear.mutateAsync({
          idempotencyKey: orderKey.current,
          body: {
            ...toQuoteInput(values),
            destinatarioNombre: values.destinatarioNombre,
            destinatarioTelefono: values.destinatarioTelefono || undefined,
            medioPreferido: medio,
            notas: values.notas || undefined,
          },
        });
        setPedido(created);
        setStep(3);
      })();
    }
  };

  const opcionElegida = cotizacion?.opciones.find((opcion) => opcion.medioId === (medio ?? cotizacion.sugerencia?.medio));

  return (
    <div className="space-y-5 animate-fade-up">
      <div>
        <h1 className="text-xl font-extrabold text-ink-900">Nuevo envío</h1>
        <div className="mt-4 flex gap-1.5">
          {STEPS.map((label, index) => (
            <div key={label} className="flex-1">
              <div className={cn('h-1.5 rounded-full transition', index <= step ? 'bg-brand-500' : 'bg-slate-200')} />
              <p className={cn('mt-1.5 text-[11px] font-semibold', index <= step ? 'text-brand-600' : 'text-slate-400')}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      {step === 0 && (
        <Card>
          <CardBody className="space-y-4">
            <Controller
              control={form.control}
              name="origen"
              render={({ field }) => (
                <PlacePicker label="¿Dónde recogemos?" value={field.value ?? null} onChange={field.onChange} accent="#0B1020" error={errors.origen?.message} />
              )}
            />
            <Controller
              control={form.control}
              name="destino"
              render={({ field }) => (
                <PlacePicker label="¿A dónde lo llevamos?" value={field.value ?? null} onChange={field.onChange} accent="#FF5A1F" error={errors.destino?.message} />
              )}
            />
            <BaseMap className="h-56" bounds={previewBounds}>
              {origen && <Marker position={[origen.lat, origen.lng]} icon={pinIcon('#0B1020', 'A')} />}
              {destino && <Marker position={[destino.lat, destino.lng]} icon={pinIcon('#FF5A1F', 'B')} />}
              {origen && destino && (
                <Polyline positions={[[origen.lat, origen.lng], [destino.lat, destino.lng]]} pathOptions={{ color: '#FF5A1F', dashArray: '6 8' }} />
              )}
            </BaseMap>
          </CardBody>
        </Card>
      )}

      {step === 1 && (
        <Card>
          <CardBody className="space-y-5">
            <div>
              <p className="mb-2 text-xs font-semibold text-slate-600">Tamaño rápido</p>
              <div className="grid grid-cols-4 gap-2">
                {PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      form.setValue('pesoKg', preset.peso);
                      form.setValue('largoCm', preset.dims[0]);
                      form.setValue('anchoCm', preset.dims[1]);
                      form.setValue('altoCm', preset.dims[2]);
                    }}
                    className="flex flex-col items-center gap-1 rounded-xl border border-slate-200 bg-white py-2.5 text-[11px] font-semibold text-slate-600 hover:border-brand-300 hover:text-brand-600"
                  >
                    {preset.peso < 1 ? <Mail className="h-4 w-4" /> : preset.peso < 10 ? <Package className="h-4 w-4" /> : <Box className="h-4 w-4" />}
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <Field label="Peso kg" error={errors.pesoKg?.message}>
                <Input type="number" step="0.1" {...form.register('pesoKg')} />
              </Field>
              <Field label="Largo cm" error={errors.largoCm?.message}>
                <Input type="number" {...form.register('largoCm')} />
              </Field>
              <Field label="Ancho cm" error={errors.anchoCm?.message}>
                <Input type="number" {...form.register('anchoCm')} />
              </Field>
              <Field label="Alto cm" error={errors.altoCm?.message}>
                <Input type="number" {...form.register('altoCm')} />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Urgencia">
                <Controller
                  control={form.control}
                  name="urgencia"
                  render={({ field }) => (
                    <Segmented
                      value={field.value}
                      onChange={field.onChange}
                      options={[
                        { value: 'NORMAL', label: 'Normal' },
                        { value: 'ALTA', label: 'Alta' },
                        { value: 'CRITICA', label: 'Crítica' },
                      ]}
                    />
                  )}
                />
              </Field>
              <Field label="Debe llegar en (horas)" error={errors.horasLimite?.message}>
                <Input type="number" step="0.5" {...form.register('horasLimite')} />
              </Field>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold text-slate-600">Extras</p>
              <Controller
                control={form.control}
                name="extras"
                render={({ field }) => (
                  <div className="grid gap-2 sm:grid-cols-3">
                    {extras
                      .filter((extra) => extra.activo)
                      .map((extra) => {
                        const active = field.value.includes(extra.id);
                        return (
                          <button
                            key={extra.id}
                            type="button"
                            onClick={() => field.onChange(active ? field.value.filter((id) => id !== extra.id) : [...field.value, extra.id])}
                            className={cn(
                              'rounded-xl border-2 p-3 text-left transition',
                              active ? 'border-brand-500 bg-brand-50' : 'border-slate-200 bg-white hover:border-slate-300',
                            )}
                          >
                            <p className="flex items-center justify-between text-sm font-bold text-ink-900">
                              {extra.nombre}
                              {active && <CheckCircle2 className="h-4 w-4 text-brand-500" />}
                            </p>
                            <p className="mt-0.5 text-[11px] text-slate-500">{extra.descripcion}</p>
                          </button>
                        );
                      })}
                  </div>
                )}
              />
            </div>
            {selectedExtras.includes('SEGURO') && (
              <Field label="Valor declarado (MXN)" error={errors.valorDeclarado?.message}>
                <Input type="number" {...form.register('valorDeclarado')} />
              </Field>
            )}
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" className="h-4 w-4 accent-brand-500" {...form.register('fragil')} />
              <ShieldAlert className="h-4 w-4 text-amber-500" /> El contenido es frágil
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="¿Quién recibe?" error={errors.destinatarioNombre?.message}>
                <Input {...form.register('destinatarioNombre')} />
              </Field>
              <Field label="Teléfono de quien recibe" error={errors.destinatarioTelefono?.message}>
                <Input inputMode="numeric" maxLength={10} {...form.register('destinatarioTelefono')} />
              </Field>
            </div>
            <Field label="Notas para el repartidor (opcional)">
              <Textarea {...form.register('notas')} placeholder="Ej. tocar en la reja verde" />
            </Field>
          </CardBody>
        </Card>
      )}

      {step === 2 && cotizacion && (
        <div className="space-y-4">
          {cotizacion.ruta.estimada && (
            <Notice tone="warning">El proveedor de mapas no responde: la ruta y los tiempos son una estimación. Tu envío no se detiene.</Notice>
          )}
          {cotizacion.sugerencia && <AiSuggestionCard sugerencia={cotizacion.sugerencia} />}
          <OrderRouteMap
            origen={form.getValues('origen')!}
            destino={form.getValues('destino')!}
            polilinea={cotizacion.ruta.polilinea}
            medio={medio ?? cotizacion.sugerencia?.medio}
            className="h-52"
          />
          <p className="text-xs text-slate-500">
            {cotizacion.ruta.distanciaKm.toFixed(1)} km por calle · tráfico {Math.round(cotizacion.ruta.nivelTrafico * 100)}%
          </p>
          <QuoteOptions cotizacion={cotizacion} value={medio} onChange={setMedio} />
          {opcionElegida && (
            <Card>
              <CardBody className="space-y-1.5 text-sm">
                {opcionElegida.precio.lineas.map((linea) => (
                  <div key={linea.concepto} className="flex justify-between text-slate-600">
                    <span>{linea.concepto}</span>
                    <span>{money(linea.monto)}</span>
                  </div>
                ))}
                <div className="flex justify-between text-slate-600">
                  <span>IVA 16 %</span>
                  <span>{money(opcionElegida.precio.iva)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-100 pt-2 text-base font-extrabold text-ink-900">
                  <span>Total</span>
                  <span>{money(opcionElegida.precio.total)}</span>
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      )}

      {step === 3 && pedido && (
        <Card>
          <CardBody className="space-y-4">
            <Notice tone="success" icon={<Sparkles className="h-4 w-4" />}>
              Pedido {pedido.folio} registrado. Completa el pago para que el algoritmo lo asigne.
            </Notice>
            <PaymentForm folio={pedido.folio} total={pedido.total} titular={user?.name} onPaid={() => navigate(`/app/pedidos/${pedido.folio}`)} />
          </CardBody>
        </Card>
      )}

      {step < 3 && (
        <div className="flex gap-2">
          {step > 0 && (
            <Button variant="secondary" size="lg" onClick={() => setStep(step - 1)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <Button size="lg" className="flex-1" onClick={() => void next()} loading={cotizar.isPending || crear.isPending}>
            {step === 0 && 'Continuar'}
            {step === 1 && 'Cotizar con IA'}
            {step === 2 && `Confirmar ${opcionElegida ? money(opcionElegida.precio.total) : ''}`}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { CalendarClock, FileDown, MapPin, Package, Phone, Radio, User, XCircle } from 'lucide-react';
import { OrderStatusLabels, type OrderStatus } from '@rumbo/shared/contracts';
import { MedioIcon } from '@/components/map/MedioIcon';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Notice } from '@/components/ui/Feedback';
import { Textarea } from '@/components/ui/Input';
import { Badge, Modal } from '@/components/ui/Misc';
import { dateTime, minutes, money, time } from '@/lib/format';
import { medioColor, medioNombre } from '@/lib/medios';
import { PaymentForm } from '@/features/pagos/components/PaymentForm';
import { useTracking } from '@/features/seguimiento/hooks/useTracking';
import type { PedidoPanel } from '@/types/api';
import { useCambiarEstado, useCancelarPedido, useDescargarGuia } from '../hooks/usePedidos';
import { OrderRouteMap } from './OrderRouteMap';
import { StatusBadge, StatusTimeline } from './StatusBadge';

const TRACKABLE: OrderStatus[] = ['ASIGNADO', 'RECOLECTADO', 'EN_CAMINO', 'ENTREGADO'];

/** Detalle de un pedido; las acciones dependen del rol (las que el servidor permite). */
export function PedidoDetalleView({ pedido, rol }: { pedido: PedidoPanel; rol: 'CLIENTE' | 'REPARTIDOR' | 'ADMIN' }) {
  const tracking = useTracking(pedido.folio, TRACKABLE.includes(pedido.estado));
  const cancelar = useCancelarPedido();
  const cambiar = useCambiarEstado();
  const guia = useDescargarGuia();
  const [fallo, setFallo] = useState(false);
  const [motivo, setMotivo] = useState('');
  const medio = pedido.medioAsignado ?? pedido.medioPreferido ?? pedido.sugerencia?.medio ?? null;
  const posicion = tracking.posicion;
  const accionesEstado = pedido.accionesDisponibles.filter((estado) => estado !== 'CANCELADO' && estado !== 'FALLIDO');

  return (
    <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
      <div className="space-y-5">
        <Card className="overflow-hidden">
          <div className="relative">
            <OrderRouteMap
              origen={pedido.origen}
              destino={pedido.destinoPunto}
              polilinea={pedido.ruta.polilinea}
              medio={medio}
              posicion={posicion}
              className="h-80 rounded-none"
            />
            {pedido.estado === 'EN_CAMINO' && posicion && (
              <div className="absolute inset-x-3 bottom-3 z-[500] flex items-center gap-3 rounded-2xl bg-white/95 p-3 shadow-pop backdrop-blur">
                <span className="relative flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-brand-500" />
                </span>
                <div className="flex-1">
                  <p className="text-sm font-bold text-ink-900">{posicion.repartidorNombre} va en camino</p>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-brand-500 transition-all duration-1000" style={{ width: `${Math.round(posicion.progreso * 100)}%` }} />
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-extrabold text-ink-900">{Math.max(1, Math.ceil(posicion.etaSeg / 60))} min</p>
                  <p className="text-[10px] text-slate-500">simulado</p>
                </div>
              </div>
            )}
          </div>
          <CardBody className="grid gap-4 sm:grid-cols-2">
            <div className="flex gap-3">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ink-900" />
              <div>
                <p className="text-[11px] font-bold uppercase text-slate-400">Recolección</p>
                <p className="text-sm text-slate-700">{pedido.origen.direccion}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
              <div>
                <p className="text-[11px] font-bold uppercase text-slate-400">Entrega</p>
                <p className="text-sm text-slate-700">{pedido.destinoPunto.direccion}</p>
              </div>
            </div>
          </CardBody>
        </Card>

        {pedido.ruta.estimada && <Notice tone="warning">Ruta estimada localmente: el proveedor de mapas no respondía al cotizar.</Notice>}

        <Card>
          <CardHeader title="Detalles del envío" icon={<Package className="h-4 w-4" />} />
          <CardBody className="grid gap-4 text-sm sm:grid-cols-3">
            <Info label="Paquete" value={`${pedido.paquete.pesoKg} kg · ${pedido.paquete.largoCm}×${pedido.paquete.anchoCm}×${pedido.paquete.altoCm} cm`} />
            <Info label="Urgencia" value={pedido.urgenciaTexto} />
            <Info label="Límite" value={dateTime(pedido.fechaLimite)} />
            <Info label="Distancia" value={`${pedido.ruta.distanciaKm.toFixed(1)} km`} />
            <Info label="Tiempo estimado" value={minutes(pedido.ruta.etaMinutos ?? pedido.ruta.minutosEstimados)} />
            <Info label="Llegada aprox." value={time(pedido.eta)} />
            <Info label="Recibe" value={pedido.destinatario.nombre} icon={<User className="h-3.5 w-3.5" />} />
            {pedido.destinatario.telefono && <Info label="Teléfono" value={pedido.destinatario.telefono} icon={<Phone className="h-3.5 w-3.5" />} />}
            {pedido.extras.length > 0 && (
              <div>
                <p className="text-[11px] font-bold uppercase text-slate-400">Extras</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {pedido.extras.map((extra) => (
                    <Badge key={extra}>{extra}</Badge>
                  ))}
                </div>
              </div>
            )}
            {pedido.notas && <Info label="Notas" value={pedido.notas} />}
          </CardBody>
        </Card>
      </div>

      <div className="space-y-5">
        <Card>
          <CardBody className="space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-mono text-xs font-bold text-slate-500">{pedido.folio}</p>
                <p className="mt-1 text-2xl font-extrabold text-ink-900">{money(pedido.total)}</p>
              </div>
              <StatusBadge status={pedido.estado} />
            </div>
            <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm">
                <MedioIcon medio={medio} className="h-6 w-6" />
              </span>
              <div className="text-sm">
                <p className="font-bold" style={{ color: medioColor(medio) }}>
                  {medioNombre(medio)}
                  {!pedido.medioAsignado && pedido.medioPreferido === null && ' (sugerido por IA)'}
                </p>
                <p className="text-xs text-slate-500">
                  {pedido.repartidor?.nombre ? `Repartidor: ${pedido.repartidor.nombre}` : 'Esperando asignación del algoritmo'}
                </p>
              </div>
            </div>
            {pedido.sugerencia && (
              <p className="text-xs text-slate-500">
                <strong className="text-accent-600">IA ({pedido.sugerencia.proveedor}):</strong> {medioNombre(pedido.sugerencia.medio)} — {pedido.sugerencia.motivo}
              </p>
            )}
            {TRACKABLE.includes(pedido.estado) && (
              <p className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                <Radio className={tracking.conectado ? 'h-3.5 w-3.5 text-emerald-500' : 'h-3.5 w-3.5 text-slate-300'} />
                {tracking.conectado ? 'Seguimiento en vivo conectado' : 'Conectando seguimiento…'}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" loading={guia.isPending} onClick={() => guia.mutate(pedido.folio)}>
                <FileDown className="h-4 w-4" /> Guía PDF
              </Button>
              {pedido.accionesDisponibles.includes('CANCELADO') && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-rose-600"
                  loading={cancelar.isPending}
                  onClick={() => window.confirm('¿Cancelar este pedido? Si ya pagaste, se reembolsa.') && cancelar.mutate({ folio: pedido.folio })}
                >
                  <XCircle className="h-4 w-4" /> Cancelar
                </Button>
              )}
            </div>

            {rol !== 'CLIENTE' && accionesEstado.length > 0 && (
              <div className="space-y-2 border-t border-slate-100 pt-4">
                {accionesEstado.map((estado) => (
                  <Button
                    key={estado}
                    size="lg"
                    variant={estado === 'ENTREGADO' ? 'success' : 'primary'}
                    className="w-full"
                    loading={cambiar.isPending}
                    onClick={() => cambiar.mutate({ folio: pedido.folio, estado })}
                  >
                    Marcar como {OrderStatusLabels[estado].toLowerCase()}
                  </Button>
                ))}
                {pedido.accionesDisponibles.includes('FALLIDO') && (
                  <Button variant="ghost" className="w-full text-rose-600" onClick={() => setFallo(true)}>
                    Reportar entrega fallida
                  </Button>
                )}
              </div>
            )}
          </CardBody>
        </Card>

        {pedido.estado === 'PENDIENTE_PAGO' && rol === 'CLIENTE' && (
          <Card>
            <CardHeader title="Completa tu pago" subtitle="Al acreditarse, el algoritmo genético asigna repartidor." />
            <CardBody>
              <PaymentForm folio={pedido.folio} total={pedido.total} titular={pedido.cliente.nombre} />
            </CardBody>
          </Card>
        )}

        <Card>
          <CardHeader title="Seguimiento" icon={<CalendarClock className="h-4 w-4" />} />
          <CardBody>
            <StatusTimeline pedido={pedido} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Desglose" />
          <CardBody className="space-y-1.5 text-sm">
            {pedido.precio.lineas.map((linea) => (
              <div key={linea.concepto} className="flex justify-between text-slate-600">
                <span>{linea.concepto}</span>
                <span>{money(linea.monto)}</span>
              </div>
            ))}
            <div className="flex justify-between text-slate-600">
              <span>IVA</span>
              <span>{money(pedido.precio.iva)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-100 pt-2 font-extrabold text-ink-900">
              <span>Total</span>
              <span>{money(pedido.total)}</span>
            </div>
          </CardBody>
        </Card>
      </div>

      <Modal open={fallo} onClose={() => setFallo(false)} title="Reportar entrega fallida">
        <Textarea value={motivo} onChange={(event) => setMotivo(event.target.value)} placeholder="¿Qué pasó? Ej. nadie recibió" />
        <Button
          variant="danger"
          className="mt-4 w-full"
          loading={cambiar.isPending}
          onClick={() =>
            cambiar.mutate({ folio: pedido.folio, estado: 'FALLIDO', motivo: motivo || 'Sin detalle' }, { onSuccess: () => setFallo(false) })
          }
        >
          Confirmar
        </Button>
      </Modal>
    </div>
  );
}

function Info({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase text-slate-400">{label}</p>
      <p className="mt-0.5 flex items-center gap-1 text-slate-700">
        {icon}
        {value}
      </p>
    </div>
  );
}

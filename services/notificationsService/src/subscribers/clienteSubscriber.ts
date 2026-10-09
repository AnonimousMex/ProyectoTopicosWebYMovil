import {
  EventTypes,
  type DomainEvent,
  type EnvioLlegoDestinoPayload,
  type PagoAcreditadoPayload,
  type PagoRechazadoPayload,
  type PagoReembolsadoPayload,
  type PedidoCreadoPayload,
  type PedidoEstadoCambiadoPayload,
  type UsuarioRegistradoPayload,
} from '@rumbo/shared';
import type { Notice, NotificationSubscriber } from './subscriberTypes.js';


function onStatusChanged(event: DomainEvent<PedidoEstadoCambiadoPayload>): Notice[] {
  const { pedido, nuevo, motivo } = event.payload;
  const medioLegible = (id: string | null) => id ?? 'el medio asignado';
  const base = { nombre: pedido.clienteNombre, folio: pedido.folio, destino: pedido.destino.direccion };
  const inApp = (titulo: string, mensaje: string) => ({
    userId: pedido.clienteId,
    titulo,
    mensaje,
    tipo: `pedido.${nuevo.toLowerCase()}`,
    folio: pedido.folio,
  });
  const email = (template: string, data: Record<string, unknown> = {}) => ({
    to: pedido.clienteEmail,
    template,
    data: { ...base, ...data },
    folio: pedido.folio,
  });

  switch (nuevo) {
    case 'PAGADO':
      return [{ email: email('pagoAcreditado', { monto: pedido.total }) }];
    case 'ASIGNADO':
      return [
        {
          inApp: inApp(
            'Ya tienes repartidor',
            `${pedido.repartidorNombre ?? 'Un repartidor'} llevará tu pedido en ${medioLegible(pedido.medioId)}.`,
          ),
          email: email('pedidoAsignado', {
            repartidor: pedido.repartidorNombre ?? 'Repartidor Rumbo',
            medio: pedido.medioId,
            eta: pedido.etaMinutos ?? '—',
          }),
        },
      ];
    case 'RECOLECTADO':
      return [{ inApp: inApp('Paquete recolectado', `El repartidor ya tiene tu paquete ${pedido.folio}.`) }];
    case 'EN_CAMINO':
      return [
        {
          inApp: inApp('¡Va en camino!', `Tu pedido ${pedido.folio} va hacia ${pedido.destino.direccion}.`),
          email: email('pedidoEnCamino'),
        },
      ];
    case 'ENTREGADO':
      return [
        { inApp: inApp('Pedido entregado', `Tu pedido ${pedido.folio} fue entregado.`), email: email('pedidoEntregado') },
      ];
    case 'CANCELADO':
      return [
        {
          inApp: inApp('Pedido cancelado', `El pedido ${pedido.folio} fue cancelado.`),
          email: email('pedidoCancelado', { motivo }),
        },
      ];
    case 'FALLIDO':
      return [
        {
          inApp: inApp('Problema con la entrega', `No se pudo entregar ${pedido.folio}.`),
          email: email('pedidoFallido', { motivo }),
        },
      ];
    default:
      return [];
  }
}

export const clienteSubscriber: NotificationSubscriber = {
  nombre: 'cliente',
  handlers: {
    [EventTypes.USUARIO_REGISTRADO]: (event: DomainEvent<UsuarioRegistradoPayload>) =>
      event.payload.rol === 'CLIENTE'
        ? [{ email: { to: event.payload.email, template: 'bienvenida', data: { nombre: event.payload.nombre } } }]
        : [],

    [EventTypes.PEDIDO_CREADO]: (event: DomainEvent<PedidoCreadoPayload>) => {
      const { pedido } = event.payload;
      return [
        {
          inApp: {
            userId: pedido.clienteId,
            titulo: 'Pedido registrado',
            mensaje: `Tu pedido ${pedido.folio} espera el pago.`,
            tipo: 'pedido.creado',
            folio: pedido.folio,
          },
          email: {
            to: pedido.clienteEmail,
            template: 'pedidoCreado',
            folio: pedido.folio,
            data: {
              nombre: pedido.clienteNombre,
              folio: pedido.folio,
              origen: pedido.origen.direccion,
              destino: pedido.destino.direccion,
              medioPreferido: pedido.medioPreferido,
              total: pedido.total,
            },
          },
        },
      ];
    },

    [EventTypes.PEDIDO_ESTADO_CAMBIADO]: onStatusChanged,

    [EventTypes.PAGO_RECHAZADO]: (event: DomainEvent<PagoRechazadoPayload>) => [
      {
        inApp: {
          userId: event.payload.clienteId,
          titulo: 'Pago rechazado',
          mensaje: `${event.payload.motivo}. Intenta con otra tarjeta.`,
          tipo: 'pago.rechazado',
          folio: event.payload.folio,
        },
      },
    ],

    [EventTypes.PAGO_ACREDITADO]: (event: DomainEvent<PagoAcreditadoPayload>) => [
      {
        inApp: {
          userId: event.payload.clienteId,
          titulo: 'Pago confirmado',
          mensaje: `Recibimos tu pago del pedido ${event.payload.folio}.`,
          tipo: 'pago.acreditado',
          folio: event.payload.folio,
        },
      },
    ],

    [EventTypes.PAGO_REEMBOLSADO]: (event: DomainEvent<PagoReembolsadoPayload>) => [
      {
        email: {
          to: event.payload.clienteEmail,
          template: 'reembolso',
          folio: event.payload.folio,
          data: { nombre: event.payload.clienteNombre, folio: event.payload.folio, monto: event.payload.monto },
        },
        inApp: {
          userId: event.payload.clienteId,
          titulo: 'Reembolso procesado',
          mensaje: `Reembolsamos el pedido ${event.payload.folio}.`,
          tipo: 'pago.reembolsado',
          folio: event.payload.folio,
        },
      },
    ],

    [EventTypes.ENVIO_LLEGO_DESTINO]: (event: DomainEvent<EnvioLlegoDestinoPayload>) => [
      {
        inApp: {
          userId: event.payload.clienteId,
          titulo: 'Tu repartidor llegó',
          mensaje: `El repartidor está en el destino del pedido ${event.payload.folio}.`,
          tipo: 'envio.llego',
          folio: event.payload.folio,
        },
      },
    ],
  },
};

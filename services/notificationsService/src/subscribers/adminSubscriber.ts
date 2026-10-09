import {
  EventTypes,
  type DomainEvent,
  type OptimizacionCompletadaPayload,
  type PedidoCreadoPayload,
  type PedidoEstadoCambiadoPayload,
  type UsuarioRegistradoPayload,
} from '@rumbo/shared';
import type { NotificationSubscriber } from './subscriberTypes.js';

const toAdmins = (titulo: string, mensaje: string, tipo: string, folio?: string) => ({
  inApp: { userId: null, titulo, mensaje, tipo, folio },
});

export const adminSubscriber: NotificationSubscriber = {
  nombre: 'administracion',
  handlers: {
    [EventTypes.USUARIO_REGISTRADO]: (event: DomainEvent<UsuarioRegistradoPayload>) => [
      toAdmins('Nueva cuenta', `${event.payload.nombre} (${event.payload.rol.toLowerCase()})`, 'usuario.registrado'),
    ],

    [EventTypes.PEDIDO_CREADO]: (event: DomainEvent<PedidoCreadoPayload>) => [
      toAdmins(
        'Nuevo pedido',
        `${event.payload.pedido.folio} de ${event.payload.pedido.clienteNombre}`,
        'pedido.creado',
        event.payload.pedido.folio,
      ),
    ],

    [EventTypes.PEDIDO_ESTADO_CAMBIADO]: (event: DomainEvent<PedidoEstadoCambiadoPayload>) => {
      const { pedido, nuevo, motivo } = event.payload;
      if (nuevo === 'FALLIDO') {
        return [toAdmins('Entrega fallida', `${pedido.folio}: ${motivo ?? 'sin motivo'}`, 'pedido.fallido', pedido.folio)];
      }
      if (nuevo === 'PAGADO') {
        return [toAdmins('Pedido listo para asignar', `${pedido.folio} entró al pool`, 'pedido.pagado', pedido.folio)];
      }
      if (nuevo === 'ENTREGADO') {
        return [toAdmins('Entrega completada', `${pedido.folio} entregado`, 'pedido.entregado', pedido.folio)];
      }
      return [];
    },

    [EventTypes.OPTIMIZACION_COMPLETADA]: (event: DomainEvent<OptimizacionCompletadaPayload>) =>
      event.payload.tipo === 'REAL'
        ? [
            toAdmins(
              'Asignación optimizada',
              `El algoritmo genético asignó ${event.payload.asignados} envíos (${event.payload.mejoraVsGreedyPct.toFixed(1)}% mejor que el método voraz).`,
              'optimizacion',
            ),
          ]
        : [],
  },
};

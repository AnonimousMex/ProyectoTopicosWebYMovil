import { EventTypes, type DomainEvent, type PedidoEstadoCambiadoPayload } from '@rumbo/shared';
import { authClient, logger } from '../lib/infrastructure.js';
import type { Notice, NotificationSubscriber } from './subscriberTypes.js';

interface UserInfo {
  id: string;
  email: string;
  name: string;
}

async function findUser(userId: string): Promise<UserInfo | null> {
  try {
    return await authClient.get<UserInfo>(`/internal/usuarios/${userId}`);
  } catch (error) {
    // Sin el servicio de identidad no hay correo, pero el aviso en la app sí sale.
    logger.warn({ err: error, userId }, 'No se pudo obtener el correo del repartidor');
    return null;
  }
}

export const repartidorSubscriber: NotificationSubscriber = {
  nombre: 'repartidor',
  handlers: {
    [EventTypes.PEDIDO_ESTADO_CAMBIADO]: async (event: DomainEvent<PedidoEstadoCambiadoPayload>): Promise<Notice[]> => {
      const { pedido, nuevo, actor } = event.payload;
      if (!pedido.repartidorId) return [];

      if (nuevo === 'ASIGNADO') {
        const user = await findUser(pedido.repartidorId);
        return [
          {
            inApp: {
              userId: pedido.repartidorId,
              titulo: 'Nueva entrega asignada',
              mensaje: `${pedido.folio}: ${pedido.origen.direccion} → ${pedido.destino.direccion}`,
              tipo: 'entrega.asignada',
              folio: pedido.folio,
            },
            ...(user
              ? {
                  email: {
                    to: user.email,
                    template: 'nuevaEntregaRepartidor',
                    folio: pedido.folio,
                    data: {
                      nombre: user.name,
                      folio: pedido.folio,
                      origen: pedido.origen.direccion,
                      destino: pedido.destino.direccion,
                      pesoKg: pedido.pesoKg,
                      secuencia: 1,
                    },
                  },
                }
              : {}),
          },
        ];
      }

      if (nuevo === 'CANCELADO' && actor.id !== pedido.repartidorId) {
        return [
          {
            inApp: {
              userId: pedido.repartidorId,
              titulo: 'Entrega cancelada',
              mensaje: `El pedido ${pedido.folio} fue cancelado; ya no está en tu ruta.`,
              tipo: 'entrega.cancelada',
              folio: pedido.folio,
            },
          },
        ];
      }
      return [];
    },
  },
};

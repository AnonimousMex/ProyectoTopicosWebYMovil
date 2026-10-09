import { OrderStatusLabels, UrgenciaLabels, type PedidoSnapshot, type Role } from '@rumbo/shared';
import { stateOf } from '../domain/orderStates.js';
import type { Order, OrderStatusHistory } from '../generated/prisma/index.js';

/**
 * Presentadores: el MISMO pedido, pintado según quién lo pide.
 *  - app:     JSON mínimo (folio, estado, eta) para el teléfono.
 *  - panel:   detalle completo con datos de mapa e historial.
 *  - reporte: fila plana para gerencia (JSON o CSV).
 *  - snapshot: foto que viaja en los eventos.
 */

function etaIso(order: Order): string | null {
  if (order.status === 'ENTREGADO' || order.status === 'CANCELADO' || order.status === 'FALLIDO') return null;
  const base = order.assignedAt ?? order.paidAt ?? order.createdAt;
  const minutes = order.etaMinutos ?? order.minutosEstimados;
  return new Date(base.getTime() + minutes * 60_000).toISOString();
}

export const orderPresenters = {
  app(order: Order) {
    return {
      folio: order.folio,
      estado: order.status,
      estadoTexto: OrderStatusLabels[order.status],
      eta: etaIso(order),
      destino: order.destinoDireccion,
      total: order.total,
      medio: order.medioId ?? order.medioPreferido ?? order.sugerenciaMedio,
      creado: order.createdAt.toISOString(),
    };
  },

  panel(order: Order & { history?: OrderStatusHistory[] }, role?: Role) {
    return {
      ...this.app(order),
      id: order.id,
      cliente: { id: order.clienteId, nombre: order.clienteNombre, email: order.clienteEmail },
      destinatario: { nombre: order.destinatarioNombre, telefono: order.destinatarioTelefono },
      origen: { direccion: order.origenDireccion, lat: order.origenLat, lng: order.origenLng },
      destinoPunto: { direccion: order.destinoDireccion, lat: order.destinoLat, lng: order.destinoLng },
      paquete: {
        pesoKg: order.pesoKg,
        largoCm: order.largoCm,
        anchoCm: order.anchoCm,
        altoCm: order.altoCm,
        volumenL: order.volumenL,
        fragil: order.fragil,
      },
      urgencia: order.urgencia,
      urgenciaTexto: UrgenciaLabels[order.urgencia as keyof typeof UrgenciaLabels] ?? order.urgencia,
      fechaLimite: order.fechaLimite.toISOString(),
      extras: order.extras,
      valorDeclarado: order.valorDeclarado,
      notas: order.notas,
      medioPreferido: order.medioPreferido,
      medioAsignado: order.medioId,
      repartidor: order.repartidorId ? { id: order.repartidorId, nombre: order.repartidorNombre } : null,
      sugerencia: order.sugerenciaMedio
        ? {
            medio: order.sugerenciaMedio,
            motivo: order.sugerenciaMotivo,
            proveedor: order.sugerenciaProveedor,
            confianza: order.sugerenciaConfianza,
          }
        : null,
      ruta: {
        distanciaKm: order.distanciaKm,
        minutosEstimados: order.minutosEstimados,
        etaMinutos: order.etaMinutos,
        polilinea: order.polilinea,
        estimada: order.rutaEstimada,
      },
      precio: order.precio,
      fechas: {
        creado: order.createdAt,
        pagado: order.paidAt,
        asignado: order.assignedAt,
        recolectado: order.pickedUpAt,
        enCamino: order.inTransitAt,
        entregado: order.deliveredAt,
        cerrado: order.closedAt,
      },
      historial: (order.history ?? []).map((item) => ({
        de: item.from,
        a: item.to,
        aTexto: OrderStatusLabels[item.to],
        actorRol: item.actorRol,
        motivo: item.motivo,
        fecha: item.createdAt,
      })),
      accionesDisponibles: role ? stateOf(order.status).siguientes(role) : [],
    };
  },

  reportRow(order: Order) {
    const minutosEntrega =
      order.deliveredAt && order.paidAt ? Math.round((order.deliveredAt.getTime() - order.paidAt.getTime()) / 60_000) : null;
    return {
      folio: order.folio,
      fecha: order.createdAt.toISOString(),
      cliente: order.clienteNombre,
      estado: OrderStatusLabels[order.status],
      medio: order.medioId ?? order.medioPreferido ?? '',
      repartidor: order.repartidorNombre ?? '',
      urgencia: order.urgencia,
      distanciaKm: order.distanciaKm,
      pesoKg: order.pesoKg,
      total: order.total,
      minutosEntrega,
      aTiempo: order.deliveredAt ? order.deliveredAt <= order.fechaLimite : null,
    };
  },

  toCsv(rows: Array<Record<string, unknown>>): string {
    if (rows.length === 0) return '';
    const headers = Object.keys(rows[0]);
    const escape = (value: unknown) => {
      const text = value === null || value === undefined ? '' : String(value);
      // Neutraliza fórmulas al abrir en Excel (CSV injection).
      const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
      return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
    };
    return [headers.join(','), ...rows.map((row) => headers.map((header) => escape(row[header])).join(','))].join('\n');
  },

  snapshot(order: Order): PedidoSnapshot {
    return {
      orderId: order.id,
      folio: order.folio,
      clienteId: order.clienteId,
      clienteNombre: order.clienteNombre,
      clienteEmail: order.clienteEmail,
      repartidorId: order.repartidorId,
      repartidorNombre: order.repartidorNombre,
      status: order.status,
      medioId: order.medioId,
      medioPreferido: order.medioPreferido,
      total: order.total,
      origen: { direccion: order.origenDireccion, lat: order.origenLat, lng: order.origenLng, lugarId: order.origenLugarId },
      destino: { direccion: order.destinoDireccion, lat: order.destinoLat, lng: order.destinoLng, lugarId: order.destinoLugarId },
      pesoKg: order.pesoKg,
      volumenL: order.volumenL,
      fragil: order.fragil,
      urgencia: order.urgencia as PedidoSnapshot['urgencia'],
      fechaLimite: order.fechaLimite.toISOString(),
      extras: order.extras,
      sugerencia: order.sugerenciaMedio
        ? { medio: order.sugerenciaMedio, motivo: order.sugerenciaMotivo ?? '', proveedor: order.sugerenciaProveedor ?? '' }
        : null,
      etaMinutos: order.etaMinutos,
      distanciaKm: order.distanciaKm,
      createdAt: order.createdAt.toISOString(),
    };
  },
};

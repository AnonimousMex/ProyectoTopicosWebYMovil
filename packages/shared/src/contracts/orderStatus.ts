export const OrderStatuses = [
  'PENDIENTE_PAGO',
  'PAGADO',
  'ASIGNADO',
  'RECOLECTADO',
  'EN_CAMINO',
  'ENTREGADO',
  'CANCELADO',
  'FALLIDO',
] as const;

export type OrderStatus = (typeof OrderStatuses)[number];

export const OrderStatusLabels: Record<OrderStatus, string> = {
  PENDIENTE_PAGO: 'Pendiente de pago',
  PAGADO: 'Pagado',
  ASIGNADO: 'Asignado',
  RECOLECTADO: 'Recolectado',
  EN_CAMINO: 'En camino',
  ENTREGADO: 'Entregado',
  CANCELADO: 'Cancelado',
  FALLIDO: 'Entrega fallida',
};

export const Urgencias = ['NORMAL', 'ALTA', 'CRITICA'] as const;
export type Urgencia = (typeof Urgencias)[number];

export const UrgenciaLabels: Record<Urgencia, string> = {
  NORMAL: 'Normal',
  ALTA: 'Alta',
  CRITICA: 'Crítica',
};

/** Peso que el algoritmo genético da al retraso según urgencia. */
export const UrgenciaPeso: Record<Urgencia, number> = {
  NORMAL: 1,
  ALTA: 2.5,
  CRITICA: 5,
};

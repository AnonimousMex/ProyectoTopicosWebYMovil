import { ConflictError, ForbiddenError, OrderStatusLabels, type OrderStatus, type Role } from '@rumbo/shared';

type TimestampField = 'paidAt' | 'assignedAt' | 'pickedUpAt' | 'inTransitAt' | 'deliveredAt' | 'closedAt';

/**
 * Patrón State: cada estado del pedido conoce a qué estados puede pasar y
 * quién puede pedirlo. Las reglas viven aquí y no regadas en controladores.
 */
abstract class OrderState {
  abstract readonly status: OrderStatus;
  /** destino → roles que pueden provocar la transición. */
  protected abstract readonly transitions: Partial<Record<OrderStatus, Role[]>>;
  /** Campo de fecha que se marca al ENTRAR a este estado. */
  readonly timestampField: TimestampField | null = null;

  get esTerminal(): boolean {
    return Object.keys(this.transitions).length === 0;
  }

  siguientes(role: Role): OrderStatus[] {
    return (Object.entries(this.transitions) as Array<[OrderStatus, Role[]]>)
      .filter(([, roles]) => roles.includes(role))
      .map(([status]) => status);
  }

  assertTransition(target: OrderStatus, role: Role): void {
    const roles = this.transitions[target];
    if (!roles) {
      throw new ConflictError(
        `Un pedido "${OrderStatusLabels[this.status]}" no puede pasar a "${OrderStatusLabels[target]}"`,
        'TRANSICION_INVALIDA',
      );
    }
    if (!roles.includes(role)) {
      throw new ForbiddenError(`Tu rol no puede cambiar el pedido a "${OrderStatusLabels[target]}"`);
    }
  }
}

class PendientePago extends OrderState {
  readonly status = 'PENDIENTE_PAGO' as const;
  protected readonly transitions = {
    PAGADO: ['SERVICE'] as Role[],
    CANCELADO: ['CLIENTE', 'ADMIN'] as Role[],
  };
}

class Pagado extends OrderState {
  readonly status = 'PAGADO' as const;
  readonly timestampField = 'paidAt' as const;
  protected readonly transitions = {
    ASIGNADO: ['SERVICE'] as Role[],
    CANCELADO: ['CLIENTE', 'ADMIN'] as Role[],
  };
}

class Asignado extends OrderState {
  readonly status = 'ASIGNADO' as const;
  readonly timestampField = 'assignedAt' as const;
  protected readonly transitions = {
    RECOLECTADO: ['REPARTIDOR', 'ADMIN'] as Role[],
    CANCELADO: ['ADMIN'] as Role[],
  };
}

class Recolectado extends OrderState {
  readonly status = 'RECOLECTADO' as const;
  readonly timestampField = 'pickedUpAt' as const;
  protected readonly transitions = {
    EN_CAMINO: ['REPARTIDOR', 'ADMIN'] as Role[],
    FALLIDO: ['REPARTIDOR', 'ADMIN'] as Role[],
  };
}

class EnCamino extends OrderState {
  readonly status = 'EN_CAMINO' as const;
  readonly timestampField = 'inTransitAt' as const;
  protected readonly transitions = {
    ENTREGADO: ['REPARTIDOR', 'ADMIN'] as Role[],
    FALLIDO: ['REPARTIDOR', 'ADMIN'] as Role[],
  };
}

class Entregado extends OrderState {
  readonly status = 'ENTREGADO' as const;
  readonly timestampField = 'deliveredAt' as const;
  protected readonly transitions = {};
}

class Cancelado extends OrderState {
  readonly status = 'CANCELADO' as const;
  readonly timestampField = 'closedAt' as const;
  protected readonly transitions = {};
}

class Fallido extends OrderState {
  readonly status = 'FALLIDO' as const;
  readonly timestampField = 'closedAt' as const;
  protected readonly transitions = {};
}

const states: Record<OrderStatus, OrderState> = {
  PENDIENTE_PAGO: new PendientePago(),
  PAGADO: new Pagado(),
  ASIGNADO: new Asignado(),
  RECOLECTADO: new Recolectado(),
  EN_CAMINO: new EnCamino(),
  ENTREGADO: new Entregado(),
  CANCELADO: new Cancelado(),
  FALLIDO: new Fallido(),
};

export function stateOf(status: OrderStatus): OrderState {
  return states[status];
}

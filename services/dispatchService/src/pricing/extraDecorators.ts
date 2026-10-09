import { roundMoney, type PriceBreakdown, type PriceComponent, type PriceContext } from './priceComponent.js';

export interface ExtraConfig {
  id: string;
  nombre: string;
  tipo: string;
  valor: number;
  minimo: number;
}

/**
 * Decorator: cada extra envuelve al cálculo anterior y agrega su línea.
 * Seguro, urgente o frágil se combinan en cualquier orden sin un `if` por
 * combinación.
 */
abstract class ExtraDecorator implements PriceComponent {
  constructor(
    protected readonly inner: PriceComponent,
    protected readonly extra: ExtraConfig,
  ) {}

  calcular(context: PriceContext): PriceBreakdown {
    const previous = this.inner.calcular(context);
    const monto = roundMoney(Math.max(this.extra.minimo, this.monto(context, previous)));
    return {
      lineas: [...previous.lineas, { concepto: this.extra.nombre, monto, extraId: this.extra.id }],
      subtotal: roundMoney(previous.subtotal + monto),
    };
  }

  protected abstract monto(context: PriceContext, previous: PriceBreakdown): number;
}

/** Seguro: porcentaje del valor declarado. */
export class SeguroDecorator extends ExtraDecorator {
  protected monto(context: PriceContext): number {
    return context.valorDeclarado * (this.extra.valor / 100);
  }
}

/** Urgente: recargo porcentual sobre lo acumulado. */
export class UrgenteDecorator extends ExtraDecorator {
  protected monto(_context: PriceContext, previous: PriceBreakdown): number {
    return previous.subtotal * (this.extra.valor / 100);
  }
}

/** Monto fijo (frágil, entrega en mano, etc.). */
export class FijoDecorator extends ExtraDecorator {
  protected monto(): number {
    return this.extra.valor;
  }
}

/** Selección de decorador por TIPO: un extra nuevo creado en el panel funciona sin código. */
export const decoratorByTipo: Record<string, new (inner: PriceComponent, extra: ExtraConfig) => PriceComponent> = {
  PORCENTAJE_VALOR: SeguroDecorator,
  PORCENTAJE_TOTAL: UrgenteDecorator,
  FIJO: FijoDecorator,
};

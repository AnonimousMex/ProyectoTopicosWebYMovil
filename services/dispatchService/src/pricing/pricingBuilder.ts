import { decoratorByTipo, type ExtraConfig } from './extraDecorators.js';
import { TarifaBase, roundMoney, type PriceComponent, type PriceContext } from './priceComponent.js';

// Los porcentajes sobre el total van al final para aplicarse sobre todo lo anterior.
const ORDEN_TIPO: Record<string, number> = { FIJO: 0, PORCENTAJE_VALOR: 1, PORCENTAJE_TOTAL: 2 };

export function buildPriceCalculator(selected: string[], catalog: ExtraConfig[]): PriceComponent {
  const extras = catalog
    .filter((extra) => selected.includes(extra.id))
    .sort((a, b) => (ORDEN_TIPO[a.tipo] ?? 0) - (ORDEN_TIPO[b.tipo] ?? 0));

  return extras.reduce<PriceComponent>((component, extra) => {
    const Decorator = decoratorByTipo[extra.tipo] ?? decoratorByTipo.FIJO;
    return new Decorator(component, extra);
  }, new TarifaBase());
}

export function quotePrice(selected: string[], catalog: ExtraConfig[], context: PriceContext) {
  const breakdown = buildPriceCalculator(selected, catalog).calcular(context);
  const iva = roundMoney(breakdown.subtotal * 0.16);
  return {
    lineas: breakdown.lineas,
    subtotal: breakdown.subtotal,
    iva,
    total: roundMoney(breakdown.subtotal + iva),
  };
}

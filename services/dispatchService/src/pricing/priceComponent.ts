import type { Paquete, PerfilMedio } from '../domain/dispatchTypes.js';

export interface PriceContext {
  perfil: PerfilMedio;
  paquete: Paquete;
  distanciaKm: number;
  valorDeclarado: number;
}

export interface PriceLine {
  concepto: string;
  monto: number;
  extraId?: string;
}

export interface PriceBreakdown {
  lineas: PriceLine[];
  subtotal: number;
}

/** Componente del patrón Decorator: la tarifa base y cada extra cumplen esta interfaz. */
export interface PriceComponent {
  calcular(context: PriceContext): PriceBreakdown;
}

const money = (value: number) => Math.round(value * 100) / 100;

/** Componente concreto: tarifa del medio (base + km + kg). */
export class TarifaBase implements PriceComponent {
  calcular({ perfil, paquete, distanciaKm }: PriceContext): PriceBreakdown {
    const lineas: PriceLine[] = [
      { concepto: `Banderazo ${perfil.nombre}`, monto: money(perfil.costoBase) },
      { concepto: `${distanciaKm.toFixed(1)} km`, monto: money(perfil.costoPorKm * distanciaKm) },
      { concepto: `${paquete.pesoKg} kg`, monto: money(perfil.costoPorKg * paquete.pesoKg) },
    ];
    return { lineas, subtotal: money(lineas.reduce((sum, line) => sum + line.monto, 0)) };
  }
}

export const roundMoney = money;

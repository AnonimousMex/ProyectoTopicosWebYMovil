import { randomUUID } from 'node:crypto';

export interface CardData {
  numero: string;
  titular: string;
  expiracion: string;
  cvv: string;
}

export type ChargeResult =
  | { aprobado: true; referencia: string; marca: string; ultimos4: string }
  | { aprobado: false; motivo: string; marca: string; ultimos4: string };

/**
 * Puerto hacia la pasarela de pagos (Adapter). Hoy es un simulador; mañana
 * puede ser Stripe, Conekta u OpenPay sin tocar el servicio de pagos.
 */
export interface PaymentGateway {
  readonly nombre: string;
  charge(card: CardData, monto: number): Promise<ChargeResult>;
  refund(referencia: string, monto: number): Promise<{ ok: boolean }>;
}

export function luhnValid(numero: string): boolean {
  let sum = 0;
  let double = false;
  for (let i = numero.length - 1; i >= 0; i -= 1) {
    let digit = Number(numero[i]);
    if (double) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    double = !double;
  }
  return sum % 10 === 0;
}

export function cardBrand(numero: string): string {
  if (/^4/.test(numero)) return 'Visa';
  if (/^5[1-5]|^2[2-7]/.test(numero)) return 'Mastercard';
  if (/^3[47]/.test(numero)) return 'American Express';
  return 'Tarjeta';
}

/** Tarjetas de prueba con resultado fijo (como en las pasarelas reales). */
export const TARJETAS_PRUEBA: Record<string, string | null> = {
  '4242424242424242': null,
  '5555555555554444': null,
  '4000000000000002': 'Tarjeta rechazada por el banco emisor',
  '4000000000009995': 'Fondos insuficientes',
  '4000000000000069': 'Tarjeta vencida',
};

export class SimulatedCardGateway implements PaymentGateway {
  readonly nombre = 'Pasarela simulada Rumbo Pay';

  async charge(card: CardData, monto: number): Promise<ChargeResult> {
    await new Promise((resolve) => setTimeout(resolve, 700 + Math.random() * 500));
    const marca = cardBrand(card.numero);
    const ultimos4 = card.numero.slice(-4);

    if (!luhnValid(card.numero)) return { aprobado: false, motivo: 'Número de tarjeta inválido', marca, ultimos4 };
    const [mes, anio] = card.expiracion.split('/').map(Number);
    const vence = new Date(2000 + anio, mes, 0, 23, 59, 59);
    if (vence < new Date()) return { aprobado: false, motivo: 'Tarjeta vencida', marca, ultimos4 };
    if (monto <= 0) return { aprobado: false, motivo: 'Monto inválido', marca, ultimos4 };

    const forced = TARJETAS_PRUEBA[card.numero];
    if (forced) return { aprobado: false, motivo: forced, marca, ultimos4 };
    return { aprobado: true, referencia: `RP-${randomUUID().slice(0, 13).toUpperCase()}`, marca, ultimos4 };
  }

  async refund(): Promise<{ ok: boolean }> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return { ok: true };
  }
}

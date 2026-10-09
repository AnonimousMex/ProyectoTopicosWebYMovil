import { describe, expect, it } from 'vitest';
import { SimulatedCardGateway, cardBrand, luhnValid } from '../src/gateways/paymentGateway.js';

const card = (numero: string, expiracion = '12/30') => ({ numero, titular: 'Prueba', expiracion, cvv: '123' });

describe('Pasarela simulada', () => {
  it('valida Luhn y detecta la marca', () => {
    expect(luhnValid('4242424242424242')).toBe(true);
    expect(luhnValid('4242424242424241')).toBe(false);
    expect(cardBrand('5555555555554444')).toBe('Mastercard');
  });

  it('aprueba la tarjeta de prueba y rechaza las de error', async () => {
    const gateway = new SimulatedCardGateway();
    expect((await gateway.charge(card('4242424242424242'), 100)).aprobado).toBe(true);
    const rechazo = await gateway.charge(card('4000000000009995'), 100);
    expect(rechazo.aprobado).toBe(false);
    expect(rechazo.aprobado === false && rechazo.motivo).toBe('Fondos insuficientes');
    expect((await gateway.charge(card('4242424242424242', '01/20'), 100)).aprobado).toBe(false);
  }, 10_000);
});

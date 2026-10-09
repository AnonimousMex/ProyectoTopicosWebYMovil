import { describe, expect, it } from 'vitest';
import { quotePrice } from '../src/pricing/pricingBuilder.js';
import { getMedioStrategy, hasCustomStrategy } from '../src/strategies/medios/medioRegistry.js';
import { perfil, tramo } from './fixtures.js';

const paquete = { pesoKg: 1, volumenL: 3, fragil: false, urgencia: 'NORMAL' as const };

describe('Estrategias por medio (sin switch)', () => {
  it('el dron vuela en línea recta e ignora el tráfico', () => {
    const dron = getMedioStrategy('dron');
    const evaluation = dron.evaluar(paquete, tramo({ factorTrafico: 2.4 }), perfil('dron', { sensibilidadTrafico: 0 }));
    expect(evaluation.distanciaKm).toBe(4);
    expect(evaluation.factible).toBe(true);
  });

  it('el dron no entra a la zona de exclusión del Centro Histórico', () => {
    const evaluation = getMedioStrategy('dron').evaluar(paquete, tramo({ zonaDestino: 'centro' }), perfil('dron'));
    expect(evaluation.factible).toBe(false);
    expect(evaluation.motivos.join()).toMatch(/exclusión aérea/);
  });

  it('la bicicleta no sale de la zona urbana', () => {
    expect(getMedioStrategy('bicicleta').evaluar(paquete, tramo({ zonaDestino: 'periferia' }), perfil('bicicleta')).factible).toBe(false);
  });

  it('la moto no lleva frágiles pesados', () => {
    const evaluation = getMedioStrategy('motocicleta').evaluar({ ...paquete, pesoKg: 7, fragil: true }, tramo(), perfil('motocicleta'));
    expect(evaluation.factible).toBe(false);
  });

  it('el tráfico afecta más a la camioneta que a la moto', () => {
    const t = tramo({ factorTrafico: 2 });
    const camioneta = getMedioStrategy('camioneta').minutosTramo(t, perfil('camioneta', { sensibilidadTrafico: 1 }));
    const moto = getMedioStrategy('motocicleta').minutosTramo(t, perfil('motocicleta', { sensibilidadTrafico: 0.35 }));
    expect(camioneta).toBeGreaterThan(moto);
  });

  it('un medio nuevo dado de alta en la base funciona con la estrategia genérica', () => {
    const patineta = getMedioStrategy('patineta');
    expect(hasCustomStrategy('patineta')).toBe(false);
    expect(patineta.evaluar(paquete, tramo(), perfil('patineta', { pesoMaxKg: 5 })).factible).toBe(true);
    expect(patineta.evaluar({ ...paquete, pesoKg: 9 }, tramo(), perfil('patineta', { pesoMaxKg: 5 })).factible).toBe(false);
  });
});

describe('Precio con decoradores (extras)', () => {
  const catalog = [
    { id: 'SEGURO', nombre: 'Seguro', tipo: 'PORCENTAJE_VALOR', valor: 2.5, minimo: 15 },
    { id: 'URGENTE', nombre: 'Urgente', tipo: 'PORCENTAJE_TOTAL', valor: 35, minimo: 0 },
    { id: 'FRAGIL', nombre: 'Frágil', tipo: 'FIJO', valor: 39, minimo: 0 },
  ];
  const context = { perfil: perfil('motocicleta', { costoBase: 30, costoPorKm: 6, costoPorKg: 2 }), paquete, distanciaKm: 10, valorDeclarado: 2000 };

  it('tarifa base = banderazo + km + kg, más IVA', () => {
    const price = quotePrice([], catalog, context);
    expect(price.subtotal).toBe(92);
    expect(price.total).toBe(106.72);
  });

  it('los extras se combinan y el urgente se aplica sobre todo lo anterior', () => {
    const price = quotePrice(['URGENTE', 'SEGURO', 'FRAGIL'], catalog, context);
    // 92 + 39 (frágil) + 50 (2.5 % de 2000) = 181 → +35 % = 63.35
    expect(price.lineas.map((l) => l.extraId).filter(Boolean)).toEqual(['FRAGIL', 'SEGURO', 'URGENTE']);
    expect(price.subtotal).toBe(244.35);
  });

  it('el seguro respeta su monto mínimo', () => {
    const price = quotePrice(['SEGURO'], catalog, { ...context, valorDeclarado: 100 });
    expect(price.lineas.at(-1)?.monto).toBe(15);
  });
});

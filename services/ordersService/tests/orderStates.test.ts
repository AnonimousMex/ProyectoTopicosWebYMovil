import { describe, expect, it } from 'vitest';
import { stateOf } from '../src/domain/orderStates.js';

describe('Máquina de estados del pedido (patrón State)', () => {
  it('sólo el sistema marca un pedido como pagado', () => {
    expect(() => stateOf('PENDIENTE_PAGO').assertTransition('PAGADO', 'SERVICE')).not.toThrow();
    expect(() => stateOf('PENDIENTE_PAGO').assertTransition('PAGADO', 'CLIENTE')).toThrow(/rol/);
  });

  it('no permite saltarse pasos', () => {
    expect(() => stateOf('PAGADO').assertTransition('ENTREGADO', 'ADMIN')).toThrow(/no puede pasar/);
  });

  it('un pedido entregado es terminal', () => {
    expect(stateOf('ENTREGADO').esTerminal).toBe(true);
    expect(stateOf('ENTREGADO').siguientes('ADMIN')).toEqual([]);
  });

  it('el repartidor avanza la entrega; el cliente no', () => {
    expect(stateOf('ASIGNADO').siguientes('REPARTIDOR')).toEqual(['RECOLECTADO']);
    expect(stateOf('EN_CAMINO').siguientes('CLIENTE')).toEqual([]);
  });
});

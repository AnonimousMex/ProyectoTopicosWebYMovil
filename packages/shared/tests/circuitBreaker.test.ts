import { describe, expect, it } from 'vitest';
import { CircuitBreaker, CircuitOpenError } from '../src/http/circuitBreaker.js';

const fail = () => Promise.reject(new Error('caído'));

describe('Circuit breaker', () => {
  it('abre tras N fallas y rechaza al instante usando el respaldo', async () => {
    const breaker = new CircuitBreaker({ name: 'prueba-1', failureThreshold: 2, resetTimeoutMs: 60_000 });
    await breaker.execute(fail, () => 'respaldo');
    await breaker.execute(fail, () => 'respaldo');
    expect(breaker.currentState).toBe('ABIERTO');
    let llamado = false;
    const result = await breaker.execute(async () => {
      llamado = true;
      return 'real';
    }, () => 'respaldo');
    expect(result).toBe('respaldo');
    expect(llamado).toBe(false);
  });

  it('sin respaldo lanza CircuitOpenError', async () => {
    const breaker = new CircuitBreaker({ name: 'prueba-2', failureThreshold: 1, resetTimeoutMs: 60_000 });
    await expect(breaker.execute(fail)).rejects.toThrow('caído');
    await expect(breaker.execute(async () => 1)).rejects.toBeInstanceOf(CircuitOpenError);
  });

  it('pasa a semiabierto y se cierra si la prueba funciona', async () => {
    const breaker = new CircuitBreaker({ name: 'prueba-3', failureThreshold: 1, resetTimeoutMs: 20 });
    await breaker.execute(fail, () => null);
    await new Promise((r) => setTimeout(r, 30));
    expect(breaker.currentState).toBe('SEMIABIERTO');
    expect(await breaker.execute(async () => 'ok')).toBe('ok');
    expect(breaker.currentState).toBe('CERRADO');
  });
});

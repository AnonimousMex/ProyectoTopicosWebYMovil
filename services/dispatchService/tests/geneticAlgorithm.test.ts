import { describe, expect, it } from 'vitest';
import { FitnessEvaluator } from '../src/geneticAlgorithm/fitness.js';
import { GeneticEngine } from '../src/geneticAlgorithm/geneticEngine.js';
import { orderCrossover } from '../src/geneticAlgorithm/operators/crossover.js';
import { mutate } from '../src/geneticAlgorithm/operators/mutation.js';
import { Random } from '../src/geneticAlgorithm/random.js';
import { buildProblem } from './fixtures.js';

const params = { poblacion: 60, generaciones: 120, tasaCruce: 0.85, tasaMutacion: 0.3, elitismo: 2, torneo: 3, semilla: 7, paciencia: 0 };
const isPermutation = (genes: { e: number }[], n: number) => new Set(genes.map((g) => g.e)).size === n && genes.length === n;

describe('Operadores genéticos', () => {
  it('el cruce OX siempre produce una permutación válida', () => {
    const random = new Random(1);
    const a = Array.from({ length: 20 }, (_, e) => ({ e, v: 0 }));
    const b = random.shuffle(a.map((g) => ({ e: g.e, v: 1 })));
    for (let i = 0; i < 200; i += 1) expect(isPermutation(orderCrossover(a, b, random), 20)).toBe(true);
  });

  it('las mutaciones conservan cada envío exactamente una vez', () => {
    const random = new Random(3);
    const genes = Array.from({ length: 15 }, (_, e) => ({ e, v: e % 4 }));
    const compatibles = genes.map(() => [0, 1, 2, 3]);
    for (let i = 0; i < 500; i += 1) mutate(genes, random, compatibles, 4);
    expect(isPermutation(genes, 15)).toBe(true);
  });
});

describe('Función de aptitud', () => {
  it('castiga asignar un paquete pesado a un dron', () => {
    const problem = buildProblem(1);
    problem.envios[0].pesoKg = 10;
    const evaluator = new FitnessEvaluator(problem);
    const enDron = evaluator.evaluate([{ e: 0, v: 3 }]);
    const enCamioneta = evaluator.evaluate([{ e: 0, v: 0 }]);
    expect(enDron.violaciones).toBeGreaterThan(0);
    expect(enCamioneta.violaciones).toBe(0);
    expect(enDron.costo).toBeGreaterThan(enCamioneta.costo);
  });

  it('respeta el medio por el que pagó el cliente', () => {
    const problem = buildProblem(1);
    problem.envios[0].medioPreferido = 'camioneta';
    const evaluator = new FitnessEvaluator(problem);
    expect(evaluator.compatibles[0]).toEqual([0]);
  });
});

describe('Motor del algoritmo genético', () => {
  it('nunca es peor que la solución voraz y no deja violaciones evitables', () => {
    const result = new GeneticEngine(buildProblem(14), params).run();
    expect(result.mejor.solucion.costo).toBeLessThanOrEqual(result.greedy.solucion.costo);
    expect(result.mejor.solucion.violaciones).toBe(0);
    expect(isPermutation(result.mejor.genes, 14)).toBe(true);
  });

  it('es reproducible con la misma semilla', () => {
    const a = new GeneticEngine(buildProblem(10), params).run();
    const b = new GeneticEngine(buildProblem(10), params).run();
    expect(a.mejor.solucion.costo).toBe(b.mejor.solucion.costo);
  });

  it('emite una generación por iteración y la mejor nunca empeora', () => {
    const costos: number[] = [];
    new GeneticEngine(buildProblem(8), { ...params, generaciones: 40 }).run((frame) => costos.push(frame.mejorCosto));
    expect(costos).toHaveLength(41);
    for (let i = 1; i < costos.length; i += 1) expect(costos[i]).toBeLessThanOrEqual(costos[i - 1]);
  });
});

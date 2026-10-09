import type { FitnessEvaluator } from './fitness.js';
import type { Chromosome, GaProblem } from './gaTypes.js';

/**
 * Línea base "voraz": como lo haría una persona con el Excel de rutas.
 * Ordena por fecha límite y a cada envío le da el vehículo compatible que
 * termine antes. Sirve para medir cuánto mejora el algoritmo genético.
 */
export function greedyChromosome(problem: GaProblem, evaluator: FitnessEvaluator): Chromosome {
  const order = problem.envios.map((_, index) => index).sort(
    (a, b) => problem.envios[a].minutosLimite - problem.envios[b].minutosLimite,
  );
  const genes: Chromosome = [];
  const carga = problem.vehiculos.map(() => 0);

  for (const e of order) {
    let bestVehiculo = -1;
    let bestCosto = Infinity;
    const candidates = evaluator.compatibles[e].length
      ? evaluator.compatibles[e]
      : problem.vehiculos.map((_, index) => index);

    for (const v of candidates) {
      if (carga[v] >= problem.vehiculos[v].capacidad && evaluator.compatibles[e].length) continue;
      const trial = [...genes, { e, v }];
      const costo = evaluator.evaluate(trial).costo;
      if (costo < bestCosto) {
        bestCosto = costo;
        bestVehiculo = v;
      }
    }
    if (bestVehiculo < 0) bestVehiculo = candidates[0] ?? 0;
    carga[bestVehiculo] += 1;
    genes.push({ e, v: bestVehiculo });
  }
  return genes;
}

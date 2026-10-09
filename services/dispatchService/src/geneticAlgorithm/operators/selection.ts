import type { Individuo } from '../gaTypes.js';
import type { Random } from '../random.js';

/** Selección por torneo: k individuos al azar, gana el de menor costo. */
export function tournamentSelection(population: Individuo[], size: number, random: Random): Individuo {
  let best = population[random.int(population.length)];
  for (let i = 1; i < size; i += 1) {
    const rival = population[random.int(population.length)];
    if (rival.solucion.costo < best.solucion.costo) best = rival;
  }
  return best;
}

import type { Chromosome } from '../gaTypes.js';
import type { Random } from '../random.js';

export type MutationName = 'intercambio' | 'inversion' | 'reasignacion' | 'reubicacion';

/** Intercambia la posición de dos envíos (cambia el orden de visita). */
function swap(genes: Chromosome, random: Random) {
  const i = random.int(genes.length);
  const j = random.int(genes.length);
  [genes[i], genes[j]] = [genes[j], genes[i]];
}

/** Invierte un tramo del cromosoma (2-opt sobre la secuencia). */
function inversion(genes: Chromosome, random: Random) {
  let i = random.int(genes.length);
  let j = random.int(genes.length);
  if (i > j) [i, j] = [j, i];
  while (i < j) {
    [genes[i], genes[j]] = [genes[j], genes[i]];
    i += 1;
    j -= 1;
  }
}

/** Mueve un envío a otro vehículo, preferentemente uno compatible. */
function reassign(genes: Chromosome, random: Random, compatibles: number[][], totalVehiculos: number) {
  const gene = genes[random.int(genes.length)];
  const options = compatibles[gene.e];
  gene.v = options.length > 0 && random.next() < 0.9 ? random.pick(options) : random.int(totalVehiculos);
}

/** Saca un gen y lo inserta en otra posición. */
function relocate(genes: Chromosome, random: Random) {
  const from = random.int(genes.length);
  const [gene] = genes.splice(from, 1);
  genes.splice(random.int(genes.length + 1), 0, gene);
}

export function mutate(
  genes: Chromosome,
  random: Random,
  compatibles: number[][],
  totalVehiculos: number,
): MutationName {
  if (genes.length < 2) {
    reassign(genes, random, compatibles, totalVehiculos);
    return 'reasignacion';
  }
  const roll = random.next();
  if (roll < 0.4) {
    reassign(genes, random, compatibles, totalVehiculos);
    return 'reasignacion';
  }
  if (roll < 0.65) {
    swap(genes, random);
    return 'intercambio';
  }
  if (roll < 0.85) {
    inversion(genes, random);
    return 'inversion';
  }
  relocate(genes, random);
  return 'reubicacion';
}

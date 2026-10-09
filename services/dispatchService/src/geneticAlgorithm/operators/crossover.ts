import type { Chromosome } from '../gaTypes.js';
import type { Random } from '../random.js';

/**
 * Cruce por orden (OX) adaptado a genes (envío, vehículo).
 * El hijo hereda un segmento contiguo del padre A —con sus vehículos— y el
 * resto de los envíos en el orden y con la asignación del padre B. Así el
 * hijo siempre es una permutación válida (cada envío aparece una vez).
 */
export function orderCrossover(parentA: Chromosome, parentB: Chromosome, random: Random): Chromosome {
  const length = parentA.length;
  if (length < 2) return parentA.map((gene) => ({ ...gene }));

  let start = random.int(length);
  let end = random.int(length);
  if (start > end) [start, end] = [end, start];

  const child: Array<Chromosome[number] | null> = new Array(length).fill(null);
  const taken = new Set<number>();
  for (let i = start; i <= end; i += 1) {
    child[i] = { ...parentA[i] };
    taken.add(parentA[i].e);
  }

  let cursor = (end + 1) % length;
  for (let k = 0; k < length; k += 1) {
    const gene = parentB[(end + 1 + k) % length];
    if (taken.has(gene.e)) continue;
    child[cursor] = { ...gene };
    cursor = (cursor + 1) % length;
  }
  return child as Chromosome;
}

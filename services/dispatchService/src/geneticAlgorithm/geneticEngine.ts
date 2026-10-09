import { FitnessEvaluator } from './fitness.js';
import type { Chromosome, GaFrame, GaParams, GaProblem, GaResult, Individuo } from './gaTypes.js';
import { greedyChromosome } from './greedyBaseline.js';
import { orderCrossover } from './operators/crossover.js';
import { mutate } from './operators/mutation.js';
import { tournamentSelection } from './operators/selection.js';
import { Random } from './random.js';

const HISTOGRAM_BUCKETS = 20;

/**
 * Motor del algoritmo genético.
 *
 *  1. Población inicial: 1 solución voraz + soluciones guiadas por la IA + aleatorias.
 *  2. Cada generación: elitismo → selección por torneo → cruce OX → mutación.
 *  3. Aptitud = costo operativo + penalizaciones (tardanza, reglas del medio, capacidad).
 *
 * Es código puro (sin red ni base de datos): corre dentro de un worker y se
 * prueba con tests unitarios.
 */
export class GeneticEngine {
  private readonly random: Random;
  private readonly evaluator: FitnessEvaluator;

  constructor(
    private readonly problem: GaProblem,
    private readonly params: GaParams,
  ) {
    this.random = new Random(params.semilla);
    this.evaluator = new FitnessEvaluator(problem);
  }

  get compatibilidad() {
    return this.evaluator.compat;
  }

  run(onFrame?: (frame: GaFrame) => void): GaResult {
    const started = performance.now();
    const greedy = this.individual(greedyChromosome(this.problem, this.evaluator));

    if (this.problem.envios.length === 0 || this.problem.vehiculos.length === 0) {
      return { mejor: greedy, greedy, generaciones: 0, duracionMs: 0, mejoraVsGreedyPct: 0, detenidoPorPaciencia: false };
    }

    let population = this.initialPopulation(greedy.genes);
    let best = this.bestOf(population);
    let stagnant = 0;
    let generation = 0;
    let stoppedEarly = false;
    onFrame?.(this.frame(0, population, best, true, 0, 0));

    for (generation = 1; generation <= this.params.generaciones; generation += 1) {
      const sorted = [...population].sort((a, b) => a.solucion.costo - b.solucion.costo);
      const next: Individuo[] = sorted.slice(0, this.params.elitismo).map((ind) => this.clone(ind));
      let crosses = 0;
      let mutations = 0;

      while (next.length < this.params.poblacion) {
        const parentA = tournamentSelection(population, this.params.torneo, this.random);
        const parentB = tournamentSelection(population, this.params.torneo, this.random);
        let genes: Chromosome;
        if (this.random.next() < this.params.tasaCruce) {
          genes = orderCrossover(parentA.genes, parentB.genes, this.random);
          crosses += 1;
        } else {
          genes = parentA.genes.map((gene) => ({ ...gene }));
        }
        if (this.random.next() < this.params.tasaMutacion) {
          mutate(genes, this.random, this.evaluator.compatibles, this.problem.vehiculos.length);
          mutations += 1;
        }
        next.push(this.individual(genes));
      }

      population = next;
      const candidate = this.bestOf(population);
      const improved = candidate.solucion.costo < best.solucion.costo - 1e-6;
      if (improved) {
        best = this.clone(candidate);
        stagnant = 0;
      } else {
        stagnant += 1;
      }
      onFrame?.(this.frame(generation, population, best, improved, crosses, mutations));

      if (this.params.paciencia > 0 && stagnant >= this.params.paciencia) {
        stoppedEarly = true;
        break;
      }
    }

    const mejora = greedy.solucion.costo > 0 ? ((greedy.solucion.costo - best.solucion.costo) / greedy.solucion.costo) * 100 : 0;
    return {
      mejor: best,
      greedy,
      generaciones: Math.min(generation, this.params.generaciones),
      duracionMs: Math.round(performance.now() - started),
      mejoraVsGreedyPct: Math.round(mejora * 100) / 100,
      detenidoPorPaciencia: stoppedEarly,
    };
  }

  private initialPopulation(greedyGenes: Chromosome): Individuo[] {
    const population: Individuo[] = [this.individual(greedyGenes.map((gene) => ({ ...gene })))];
    const envios = this.problem.envios;
    const totalVehiculos = this.problem.vehiculos.length;

    while (population.length < this.params.poblacion) {
      const guidedByAi = population.length % 3 === 0;
      const order = this.random.shuffle(envios.map((_, index) => index));
      const genes = order.map((e) => {
        const compatibles = this.evaluator.compatibles[e];
        const sugeridos = compatibles.filter((v) => this.problem.vehiculos[v].medioId === envios[e].sugerencia);
        const pool = guidedByAi && sugeridos.length ? sugeridos : compatibles;
        return { e, v: pool.length ? this.random.pick(pool) : this.random.int(totalVehiculos) };
      });
      population.push(this.individual(genes));
    }
    return population;
  }

  private individual(genes: Chromosome): Individuo {
    return { genes, solucion: this.evaluator.evaluate(genes) };
  }

  private clone(individuo: Individuo): Individuo {
    return { genes: individuo.genes.map((gene) => ({ ...gene })), solucion: individuo.solucion };
  }

  private bestOf(population: Individuo[]): Individuo {
    return population.reduce((best, current) => (current.solucion.costo < best.solucion.costo ? current : best));
  }

  /** Diversidad = proporción de envíos asignados a distinto vehículo entre parejas al azar. */
  private diversity(population: Individuo[]): number {
    const samples = Math.min(30, population.length);
    const n = this.problem.envios.length;
    let total = 0;
    for (let s = 0; s < samples; s += 1) {
      const a = population[this.random.int(population.length)];
      const b = population[this.random.int(population.length)];
      const assignA = new Int32Array(n);
      a.genes.forEach((gene) => (assignA[gene.e] = gene.v));
      let different = 0;
      b.genes.forEach((gene) => {
        if (assignA[gene.e] !== gene.v) different += 1;
      });
      total += different / n;
    }
    return Math.round((total / samples) * 1000) / 1000;
  }

  private frame(
    generacion: number,
    population: Individuo[],
    best: Individuo,
    mejoro: boolean,
    cruces: number,
    mutaciones: number,
  ): GaFrame {
    const costs = population.map((ind) => ind.solucion.costo);
    const min = Math.min(...costs);
    const max = Math.max(...costs);
    const histograma = new Array(HISTOGRAM_BUCKETS).fill(0);
    const span = max - min || 1;
    for (const cost of costs) {
      histograma[Math.min(HISTOGRAM_BUCKETS - 1, Math.floor(((cost - min) / span) * HISTOGRAM_BUCKETS))] += 1;
    }
    return {
      generacion,
      mejorCosto: best.solucion.costo,
      costoPromedio: Math.round((costs.reduce((sum, cost) => sum + cost, 0) / costs.length) * 100) / 100,
      peorCosto: max,
      diversidad: this.diversity(population),
      factibles: population.filter((ind) => ind.solucion.violaciones === 0).length,
      histograma,
      cruces,
      mutaciones,
      mejoro,
      mejor: mejoro ? { genes: best.genes, solucion: best.solucion } : null,
    };
  }
}

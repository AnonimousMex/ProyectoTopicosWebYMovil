import { parentPort, workerData } from 'node:worker_threads';
import { GeneticEngine } from './geneticEngine.js';
import type { GaParams, GaProblem } from './gaTypes.js';

/**
 * Hilo de trabajo: el algoritmo genético es CPU intensivo; correrlo aquí
 * evita bloquear el event loop del servicio mientras evoluciona.
 */
const { problem, params } = workerData as { problem: GaProblem; params: GaParams };

try {
  const engine = new GeneticEngine(problem, params);
  const result = engine.run((frame) => parentPort?.postMessage({ type: 'frame', frame }));
  parentPort?.postMessage({ type: 'done', result, compatibilidad: engine.compatibilidad });
} catch (error) {
  parentPort?.postMessage({ type: 'error', message: (error as Error).message });
}

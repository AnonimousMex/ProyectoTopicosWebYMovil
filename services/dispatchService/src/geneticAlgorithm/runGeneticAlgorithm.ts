import { Worker } from 'node:worker_threads';
import type { GaFrame, GaParams, GaProblem, GaResult } from './gaTypes.js';

const extension = import.meta.url.endsWith('.ts') ? '.ts' : '.js';

export interface GaOutcome {
  result: GaResult;
  compatibilidad: string[][][];
}

/** Lanza el algoritmo en un worker thread y entrega cada generación por callback. */
export function runGeneticAlgorithm(
  problem: GaProblem,
  params: GaParams,
  onFrame: (frame: GaFrame) => void,
): Promise<GaOutcome> {
  return new Promise((resolve, reject) => {
    // En desarrollo el código es TypeScript: el hilo arranca con el cargador de tsx.
    const entry = extension === '.ts' ? './gaWorkerBootstrap.mjs' : './gaWorker.js';
    const worker = new Worker(new URL(entry, import.meta.url), { workerData: { problem, params } });
    const timeout = setTimeout(() => {
      void worker.terminate();
      reject(new Error('El algoritmo genético excedió el tiempo máximo (60 s)'));
    }, 60_000);

    worker.on('message', (message) => {
      if (message.type === 'frame') onFrame(message.frame);
      if (message.type === 'done') {
        clearTimeout(timeout);
        resolve({ result: message.result, compatibilidad: message.compatibilidad });
        void worker.terminate();
      }
      if (message.type === 'error') {
        clearTimeout(timeout);
        reject(new Error(message.message));
        void worker.terminate();
      }
    });
    worker.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

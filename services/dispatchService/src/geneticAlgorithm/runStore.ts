import { EventEmitter } from 'node:events';
import type { GaFrame } from './gaTypes.js';

export interface EscenarioVista {
  puntos: Array<{ lat: number; lng: number; etiqueta: string }>;
  envios: Array<{
    id: string;
    folio: string;
    origenIdx: number;
    destinoIdx: number;
    pesoKg: number;
    volumenL: number;
    fragil: boolean;
    urgencia: string;
    minutosLimite: number;
    medioPreferido: string | null;
    sugerencia: string | null;
  }>;
  vehiculos: Array<{ id: string; nombre: string; medioId: string; baseIdx: number; capacidad: number }>;
  medios: Record<string, { nombre: string; color: string; icono: string }>;
  matrizEstimada: boolean;
}

export interface RunState {
  id: string;
  tipo: 'SIMULACION' | 'REAL';
  estado: 'EN_CURSO' | 'COMPLETADA' | 'FALLIDA';
  velocidadMs: number;
  escenario: EscenarioVista;
  parametros: Record<string, unknown>;
  frames: GaFrame[];
  resultado: Record<string, unknown> | null;
  error: string | null;
  emitter: EventEmitter;
  createdAt: number;
}

const runs = new Map<string, RunState>();
const TTL_MS = 30 * 60_000;

/** Corridas en memoria para poder transmitirlas (y retransmitirlas) por SSE. */
export const runStore = {
  create(state: Omit<RunState, 'frames' | 'resultado' | 'error' | 'emitter' | 'createdAt' | 'estado'>): RunState {
    const run: RunState = {
      ...state,
      estado: 'EN_CURSO',
      frames: [],
      resultado: null,
      error: null,
      emitter: new EventEmitter(),
      createdAt: Date.now(),
    };
    run.emitter.setMaxListeners(50);
    runs.set(run.id, run);
    this.cleanup();
    return run;
  },

  get: (id: string) => runs.get(id),

  pushFrame(run: RunState, frame: GaFrame) {
    run.frames.push(frame);
    run.emitter.emit('cambio');
  },

  finish(run: RunState, resultado: Record<string, unknown>) {
    run.estado = 'COMPLETADA';
    run.resultado = resultado;
    run.emitter.emit('cambio');
  },

  fail(run: RunState, error: string) {
    run.estado = 'FALLIDA';
    run.error = error;
    run.emitter.emit('cambio');
  },

  hasActiveReal: () => [...runs.values()].some((run) => run.tipo === 'REAL' && run.estado === 'EN_CURSO'),

  cleanup() {
    const now = Date.now();
    for (const [id, run] of runs) if (now - run.createdAt > TTL_MS) runs.delete(id);
  },
};

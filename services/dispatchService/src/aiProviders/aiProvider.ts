import type { Paquete, Sugerencia, Tramo } from '../domain/dispatchTypes.js';

export interface ContextoIA {
  paquete: Paquete;
  tramo: Tramo & { nivelTrafico: number };
  minutosLimite: number;
  urgente: boolean;
  /** Medios activos y factibles para este paquete (la IA puede no saberlo). */
  mediosFactibles: string[];
}

export interface ResultadoProveedor {
  sugerencia: Sugerencia;
  /** Respuesta original del proveedor (JSON, XML u objeto) para auditoría en el panel. */
  respuestaOriginal: string;
}

/**
 * Puerto del dominio hacia cualquier IA (Adapter). Cada proveedor habla su
 * propio idioma; el adaptador lo traduce a Sugerencia{ medio, motivo }.
 * Mañana puede llegar otro proveedor: se escribe otro adaptador y listo.
 */
export interface AiProvider {
  readonly id: string;
  readonly nombre: string;
  readonly formato: 'JSON' | 'XML' | 'OBJETO';
  sugerir(contexto: ContextoIA): Promise<ResultadoProveedor>;
}

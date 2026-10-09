import type { Paquete, Tramo } from '../../domain/dispatchTypes.js';
import { BaseMedioStrategy } from './medioStrategy.js';

/** Bicicleta: barata y sin emisiones, sólo dentro de la zona urbana. */
export class BicicletaStrategy extends BaseMedioStrategy {
  readonly id = 'bicicleta';

  minutosServicio(): number {
    return 2;
  }

  protected reglasEspecificas(_paquete: Paquete, tramo: Tramo): string[] {
    return tramo.zonaOrigen === 'periferia' || tramo.zonaDestino === 'periferia'
      ? ['Fuera de la zona ciclista urbana']
      : [];
  }
}

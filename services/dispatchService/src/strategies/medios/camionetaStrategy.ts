import type { Tramo } from '../../domain/dispatchTypes.js';
import { BaseMedioStrategy } from './medioStrategy.js';

/** Camioneta: carga grande, pero el tráfico y estacionarse le cuestan. */
export class CamionetaStrategy extends BaseMedioStrategy {
  readonly id = 'camioneta';

  minutosServicio(tramo: Tramo): number {
    // Estacionarse en el Centro Histórico es lento.
    return tramo.zonaDestino === 'centro' || tramo.zonaOrigen === 'centro' ? 9 : 5;
  }
}

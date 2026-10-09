import type { Paquete, Tramo } from '../../domain/dispatchTypes.js';
import { BaseMedioStrategy } from './medioStrategy.js';

/** Dron: vuela en línea recta, ignora el tráfico, pero tiene reglas aéreas. */
export class DronStrategy extends BaseMedioStrategy {
  readonly id = 'dron';

  distanciaEfectiva(tramo: Tramo): number {
    return tramo.lineaRectaKm;
  }

  minutosServicio(): number {
    return 4; // despegue + aterrizaje
  }

  protected reglasEspecificas(paquete: Paquete, tramo: Tramo): string[] {
    const motivos: string[] = [];
    if (paquete.fragil) motivos.push('Los paquetes frágiles no se envían por dron');
    if (tramo.zonaOrigen === 'centro' || tramo.zonaDestino === 'centro') {
      motivos.push('Zona de exclusión aérea (Centro Histórico, patrimonio UNESCO)');
    }
    return motivos;
  }
}

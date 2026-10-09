import type { Paquete } from '../../domain/dispatchTypes.js';
import { BaseMedioStrategy } from './medioStrategy.js';

/** Motocicleta: esquiva el tráfico; no es segura para frágiles pesados. */
export class MotocicletaStrategy extends BaseMedioStrategy {
  readonly id = 'motocicleta';

  minutosServicio(): number {
    return 2;
  }

  protected reglasEspecificas(paquete: Paquete): string[] {
    return paquete.fragil && paquete.pesoKg > 5 ? ['Un paquete frágil de más de 5 kg no viaja seguro en moto'] : [];
  }
}

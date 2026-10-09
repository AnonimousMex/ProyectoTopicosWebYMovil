import { BicicletaStrategy } from './bicicletaStrategy.js';
import { CamionetaStrategy } from './camionetaStrategy.js';
import { DronStrategy } from './dronStrategy.js';
import { BaseMedioStrategy, type MedioStrategy } from './medioStrategy.js';
import { MotocicletaStrategy } from './motocicletaStrategy.js';

/** Medio dado de alta desde el panel sin reglas propias: usa sólo los parámetros de la base. */
class GenericMedioStrategy extends BaseMedioStrategy {
  constructor(readonly id: string) {
    super();
  }
}

/**
 * Registro (Factory + Registry) de estrategias. Para un medio nuevo con
 * reglas especiales: crear la clase y añadirla a esta lista. Para uno sin
 * reglas especiales: basta con darlo de alta en la base de datos.
 */
const strategies = new Map<string, MedioStrategy>(
  [new CamionetaStrategy(), new MotocicletaStrategy(), new BicicletaStrategy(), new DronStrategy()].map((strategy) => [
    strategy.id,
    strategy,
  ]),
);

export function getMedioStrategy(medioId: string): MedioStrategy {
  let strategy = strategies.get(medioId);
  if (!strategy) {
    strategy = new GenericMedioStrategy(medioId);
    strategies.set(medioId, strategy);
  }
  return strategy;
}

export function hasCustomStrategy(medioId: string): boolean {
  const strategy = strategies.get(medioId);
  return Boolean(strategy) && !(strategy instanceof GenericMedioStrategy);
}

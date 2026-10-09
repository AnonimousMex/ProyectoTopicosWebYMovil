import type { Evaluacion, Paquete, PerfilMedio, Tramo } from '../../domain/dispatchTypes.js';

/**
 * Strategy: cada medio sabe planear su propio tramo.
 * Reemplaza el `switch` de doscientas líneas: agregar un medio = crear una
 * clase y registrarla; ni el cotizador ni el algoritmo genético cambian.
 */
export interface MedioStrategy {
  readonly id: string;
  evaluar(paquete: Paquete, tramo: Tramo, perfil: PerfilMedio): Evaluacion;
  distanciaEfectiva(tramo: Tramo): number;
  minutosTramo(tramo: Tramo, perfil: PerfilMedio): number;
  /** Minutos de maniobra por parada (estacionarse, despegar, encadenar la bici…). */
  minutosServicio(tramo: Tramo): number;
  costoOperativo(km: number, minutos: number, perfil: PerfilMedio): number;
}

const COSTO_MINUTO_OPERADOR = 1.1;

/**
 * Template Method: la secuencia de evaluación es la misma para todos los
 * medios; las subclases sólo sobreescriben los pasos que las distinguen.
 */
export abstract class BaseMedioStrategy implements MedioStrategy {
  abstract readonly id: string;

  evaluar(paquete: Paquete, tramo: Tramo, perfil: PerfilMedio): Evaluacion {
    const motivos: string[] = [];
    const distanciaKm = this.distanciaEfectiva(tramo);

    if (paquete.pesoKg > perfil.pesoMaxKg) motivos.push(`Excede el peso máximo (${perfil.pesoMaxKg} kg)`);
    if (paquete.volumenL > perfil.volumenMaxL) motivos.push(`Excede el volumen máximo (${perfil.volumenMaxL} L)`);
    if (distanciaKm > perfil.distanciaMaxKm) motivos.push(`Fuera de alcance (máx. ${perfil.distanciaMaxKm} km)`);
    motivos.push(...this.reglasEspecificas(paquete, tramo, perfil));

    const minutos = this.minutosTramo(tramo, perfil) + this.minutosServicio(tramo) * 2;
    return {
      medioId: this.id,
      factible: motivos.length === 0,
      motivos,
      distanciaKm: round(distanciaKm),
      minutos: round(minutos, 1),
      costoOperativo: round(this.costoOperativo(distanciaKm, minutos, perfil)),
    };
  }

  /** Por defecto se circula por calles. */
  distanciaEfectiva(tramo: Tramo): number {
    return tramo.distanciaKm;
  }

  minutosTramo(tramo: Tramo, perfil: PerfilMedio): number {
    const km = this.distanciaEfectiva(tramo);
    const trafico = 1 + (tramo.factorTrafico - 1) * perfil.sensibilidadTrafico;
    return (km / perfil.velocidadKmh) * 60 * trafico;
  }

  minutosServicio(_tramo: Tramo): number {
    return 3;
  }

  costoOperativo(km: number, minutos: number, perfil: PerfilMedio): number {
    return km * perfil.costoOperativoKm + minutos * COSTO_MINUTO_OPERADOR;
  }

  /** Gancho para restricciones propias del medio. */
  protected reglasEspecificas(_paquete: Paquete, _tramo: Tramo, _perfil: PerfilMedio): string[] {
    return [];
  }
}

export const round = (value: number, digits = 2) => Number(value.toFixed(digits));

import { UrgenciaPeso } from '@rumbo/shared/contracts';
import type { Tramo } from '../domain/dispatchTypes.js';
import { getMedioStrategy } from '../strategies/medios/medioRegistry.js';
import type { Chromosome, GaProblem, Parada, RutaSolucion, Solucion } from './gaTypes.js';

export const PENALIZACION_VIOLACION = 2500;
const COSTO_MINUTO_TARDE = 6;
const BONO_SUGERENCIA_IA = 8;
const PESO_MAKESPAN = 0.4;

/**
 * Evaluador de aptitud. Precalcula, para cada medio, la matriz de tiempos y
 * kilómetros usando la MISMA estrategia que el cotizador: el algoritmo
 * genético no sabe de camionetas ni drones, sólo pregunta a la estrategia.
 */
export class FitnessEvaluator {
  private readonly tiempo = new Map<string, Float64Array>();
  private readonly km = new Map<string, Float64Array>();
  private readonly servicio = new Map<string, Float64Array>();
  /** compat[e][v] = motivos por los que el envío e no puede ir en el vehículo v. */
  readonly compat: string[][][];
  /** Vehículos sin violaciones estáticas para cada envío. */
  readonly compatibles: number[][];
  private readonly n: number;

  constructor(private readonly problem: GaProblem) {
    this.n = problem.puntos.length;
    const medios = new Set(problem.vehiculos.map((vehiculo) => vehiculo.medioId));
    for (const medioId of medios) this.precompute(medioId);

    this.compat = problem.envios.map((envio) =>
      problem.vehiculos.map((vehiculo) => {
        const perfil = problem.perfiles[vehiculo.medioId];
        const evaluacion = getMedioStrategy(vehiculo.medioId).evaluar(
          { pesoKg: envio.pesoKg, volumenL: envio.volumenL, fragil: envio.fragil, urgencia: envio.urgencia },
          this.tramo(envio.origenIdx, envio.destinoIdx),
          perfil,
        );
        const motivos = [...evaluacion.motivos];
        if (envio.medioPreferido && envio.medioPreferido !== vehiculo.medioId) {
          motivos.push(`El cliente pagó por ${envio.medioPreferido}`);
        }
        return motivos;
      }),
    );
    this.compatibles = this.compat.map((row) =>
      row.map((motivos, v) => (motivos.length === 0 ? v : -1)).filter((v) => v >= 0),
    );
  }

  private tramo(i: number, j: number): Tramo {
    const { matriz } = this.problem;
    return {
      distanciaKm: matriz.distancias[i][j],
      lineaRectaKm: matriz.lineaRecta[i][j],
      factorTrafico: matriz.trafico[i][j],
      zonaOrigen: matriz.zonas[i],
      zonaDestino: matriz.zonas[j],
    };
  }

  private precompute(medioId: string) {
    const strategy = getMedioStrategy(medioId);
    const perfil = this.problem.perfiles[medioId];
    const tiempo = new Float64Array(this.n * this.n);
    const km = new Float64Array(this.n * this.n);
    const servicio = new Float64Array(this.n);
    for (let i = 0; i < this.n; i += 1) {
      for (let j = 0; j < this.n; j += 1) {
        if (i === j) continue;
        const tramo = this.tramo(i, j);
        km[i * this.n + j] = strategy.distanciaEfectiva(tramo);
        tiempo[i * this.n + j] = strategy.minutosTramo(tramo, perfil);
      }
      servicio[i] = strategy.minutosServicio(this.tramo(i, i));
    }
    this.tiempo.set(medioId, tiempo);
    this.km.set(medioId, km);
    this.servicio.set(medioId, servicio);
  }

  /** Decodifica el cromosoma en rutas y calcula su costo total. */
  evaluate(genes: Chromosome): Solucion {
    const { envios, vehiculos, perfiles } = this.problem;
    const secuencias: number[][] = vehiculos.map(() => []);
    for (const gene of genes) secuencias[gene.v].push(gene.e);

    let costoOperativo = 0;
    let penalizacion = 0;
    let violaciones = 0;
    let tardias = 0;
    let makespan = 0;
    const rutas: RutaSolucion[] = [];

    for (let v = 0; v < vehiculos.length; v += 1) {
      const secuencia = secuencias[v];
      if (secuencia.length === 0) continue;
      const vehiculo = vehiculos[v];
      const medioId = vehiculo.medioId;
      const tiempo = this.tiempo.get(medioId)!;
      const km = this.km.get(medioId)!;
      const servicio = this.servicio.get(medioId)!;
      const strategy = getMedioStrategy(medioId);

      let posicion = vehiculo.baseIdx;
      let reloj = 0;
      let kmRuta = 0;
      const paradas: Parada[] = [];

      for (const e of secuencia) {
        const envio = envios[e];
        // Ir a recoger…
        reloj += tiempo[posicion * this.n + envio.origenIdx] + servicio[envio.origenIdx];
        kmRuta += km[posicion * this.n + envio.origenIdx];
        // …y llevar al destino.
        reloj += tiempo[envio.origenIdx * this.n + envio.destinoIdx] + servicio[envio.destinoIdx];
        kmRuta += km[envio.origenIdx * this.n + envio.destinoIdx];
        posicion = envio.destinoIdx;

        const minutosTarde = Math.max(0, reloj - envio.minutosLimite);
        if (minutosTarde > 0) {
          tardias += 1;
          penalizacion += minutosTarde * COSTO_MINUTO_TARDE * UrgenciaPeso[envio.urgencia] * (envio.urgente ? 1.5 : 1);
        }
        const motivos = this.compat[e][v].length;
        if (motivos > 0) {
          violaciones += motivos;
          penalizacion += motivos * PENALIZACION_VIOLACION;
        }
        if (envio.sugerencia === medioId) penalizacion -= BONO_SUGERENCIA_IA;
        paradas.push({ envio: e, llegadaMin: Math.round(reloj * 10) / 10, minutosTarde: Math.round(minutosTarde) });
      }

      const exceso = secuencia.length - vehiculo.capacidad;
      if (exceso > 0) {
        violaciones += exceso;
        penalizacion += exceso * PENALIZACION_VIOLACION;
      }

      const costoRuta = strategy.costoOperativo(kmRuta, reloj, perfiles[medioId]);
      costoOperativo += costoRuta;
      makespan = Math.max(makespan, reloj);
      rutas.push({
        vehiculo: v,
        paradas,
        km: Math.round(kmRuta * 100) / 100,
        minutos: Math.round(reloj * 10) / 10,
        costo: Math.round(costoRuta * 100) / 100,
      });
    }

    penalizacion += makespan * PESO_MAKESPAN;
    return {
      costo: Math.round((costoOperativo + penalizacion) * 100) / 100,
      costoOperativo: Math.round(costoOperativo * 100) / 100,
      penalizacion: Math.round(penalizacion * 100) / 100,
      violaciones,
      tardias,
      rutas,
    };
  }
}

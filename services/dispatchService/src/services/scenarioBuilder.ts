import type { Urgencia } from '@rumbo/shared/contracts';
import { InternalHeuristicProvider } from '../aiProviders/internalHeuristicProvider.js';
import type { LatLng, PerfilMedio } from '../domain/dispatchTypes.js';
import type { GaEnvio, GaProblem, GaVehiculo } from '../geneticAlgorithm/gaTypes.js';
import { Random } from '../geneticAlgorithm/random.js';
import type { EscenarioVista } from '../geneticAlgorithm/runStore.js';
import { logger, mapsClient } from '../lib/infrastructure.js';
import type { ScenarioInput } from '../schemas/simulationSchemas.js';
import { getMedioStrategy } from '../strategies/medios/medioRegistry.js';
import { catalogService } from './catalogService.js';
import { routeMetricsService } from './routeMetricsService.js';

interface LugarCatalogo {
  nombre: string;
  tipo: string;
  lat: number;
  lng: number;
  zonaId: string;
}

const PERFILES_PAQUETE = [
  { prob: 0.45, peso: [0.2, 2.5], volumen: [1, 6], nombre: 'sobre/caja chica' },
  { prob: 0.35, peso: [3, 12], volumen: [10, 40], nombre: 'caja mediana' },
  { prob: 0.15, peso: [15, 40], volumen: [60, 150], nombre: 'caja grande' },
  { prob: 0.05, peso: [60, 200], volumen: [200, 600], nombre: 'voluminoso' },
] as const;

const round = (value: number, digits = 2) => Number(value.toFixed(digits));

async function loadPlaces(random: Random): Promise<LugarCatalogo[]> {
  try {
    const catalogo = await mapsClient.get<{ lugares: LugarCatalogo[] }>('/api/mapas/catalogo');
    return catalogo.lugares;
  } catch (error) {
    logger.warn({ err: (error as Error).message }, 'Catálogo de mapas no disponible: puntos aleatorios en Morelia');
    return Array.from({ length: 40 }, (_, i) => ({
      nombre: `Punto ${i + 1}`,
      tipo: 'Simulado',
      lat: random.between(19.66, 19.74),
      lng: random.between(-101.23, -101.15),
      zonaId: 'desconocida',
    }));
  }
}

function pickPackage(random: Random) {
  let roll = random.next();
  for (const perfil of PERFILES_PAQUETE) {
    if (roll < perfil.prob) return perfil;
    roll -= perfil.prob;
  }
  return PERFILES_PAQUETE[0];
}

/**
 * Builder del escenario de simulación: genera pedidos y flota sintéticos
 * (reproducibles con la semilla) sobre lugares reales del catálogo de
 * Morelia, y arma la instancia del problema para el algoritmo genético.
 */
export async function buildSimulationScenario(input: ScenarioInput): Promise<{ problem: GaProblem; vista: EscenarioVista }> {
  const random = new Random(input.semilla);
  const lugares = await loadPlaces(random);
  const urbanos = lugares.filter((lugar) => lugar.zonaId !== 'periferia');
  const perfiles = await catalogService.activeMedios();
  const perfilMap = Object.fromEntries(perfiles.map((perfil) => [perfil.id, perfil])) as Record<string, PerfilMedio>;

  const puntos: Array<LatLng & { etiqueta: string }> = [];
  const addPoint = (lugar: LugarCatalogo, jitter = 0.0018) => {
    puntos.push({
      lat: round(lugar.lat + (random.next() - 0.5) * jitter, 6),
      lng: round(lugar.lng + (random.next() - 0.5) * jitter, 6),
      etiqueta: lugar.nombre,
    });
    return puntos.length - 1;
  };

  // Envíos: 90 % dentro de la ciudad, 10 % hacia municipios cercanos.
  const enviosBase = Array.from({ length: input.envios }, (_, index) => {
    const origen = random.pick(urbanos);
    let destino = random.next() < 0.9 ? random.pick(urbanos) : random.pick(lugares);
    while (destino === origen) destino = random.pick(lugares);
    const paquete = pickPackage(random);
    const urgencia: Urgencia =
      random.next() < input.porcentajeUrgentes ? (random.next() < 0.35 ? 'CRITICA' : 'ALTA') : 'NORMAL';
    const limites: Record<Urgencia, [number, number]> = { CRITICA: [35, 70], ALTA: [60, 130], NORMAL: [100, 300] };
    return {
      id: `sim-${index + 1}`,
      folio: `SIM-${String(index + 1).padStart(3, '0')}`,
      origenIdx: addPoint(origen),
      destinoIdx: addPoint(destino),
      pesoKg: round(random.between(paquete.peso[0], paquete.peso[1]), 1),
      volumenL: round(random.between(paquete.volumen[0], paquete.volumen[1]), 1),
      fragil: random.next() < 0.15,
      urgencia,
      urgente: urgencia === 'CRITICA' && random.next() < 0.5,
      minutosLimite: Math.round(random.between(...limites[urgencia])),
    };
  });

  const vehiculos: GaVehiculo[] = [];
  for (const [medioId, cantidad] of Object.entries(input.flota)) {
    const perfil = perfilMap[medioId];
    if (!perfil) continue;
    for (let i = 0; i < cantidad; i += 1) {
      vehiculos.push({
        id: `veh-${medioId}-${i + 1}`,
        nombre: `${perfil.nombre} ${i + 1}`,
        medioId,
        baseIdx: addPoint(random.pick(urbanos), 0.004),
        capacidad: perfil.capacidadPaquetes,
      });
    }
  }

  const matriz = await routeMetricsService.matrix(puntos, input.hora);

  // Sugerencia de la IA interna por envío (local, sin red) y preferencia ocasional del cliente.
  const internal = new InternalHeuristicProvider(async () => perfiles);
  const envios: GaEnvio[] = [];
  for (const base of enviosBase) {
    const tramo = {
      distanciaKm: matriz.distancias[base.origenIdx][base.destinoIdx],
      lineaRectaKm: matriz.lineaRecta[base.origenIdx][base.destinoIdx],
      factorTrafico: matriz.trafico[base.origenIdx][base.destinoIdx],
      zonaOrigen: matriz.zonas[base.origenIdx],
      zonaDestino: matriz.zonas[base.destinoIdx],
    };
    const paquete = { pesoKg: base.pesoKg, volumenL: base.volumenL, fragil: base.fragil, urgencia: base.urgencia };
    const factibles = perfiles
      .filter((perfil) => getMedioStrategy(perfil.id).evaluar(paquete, tramo, perfil).factible)
      .map((perfil) => perfil.id);
    const sugerencia = factibles.length
      ? (
          await internal.sugerir({
            paquete,
            tramo: { ...tramo, nivelTrafico: (tramo.factorTrafico - 1) / 1.4 },
            minutosLimite: base.minutosLimite,
            urgente: base.urgente,
            mediosFactibles: factibles,
          })
        ).sugerencia.medio
      : null;
    const conFlota = factibles.filter((id) => vehiculos.some((vehiculo) => vehiculo.medioId === id));
    const medioPreferido =
      conFlota.length && random.next() < input.porcentajePreferencia ? random.pick(conFlota) : null;
    envios.push({ ...base, sugerencia, medioPreferido });
  }

  const problem: GaProblem = { envios, vehiculos, perfiles: perfilMap, puntos, matriz };
  return { problem, vista: toVista(problem, puntos, perfiles, matriz.estimada) };
}

export function toVista(
  problem: GaProblem,
  puntos: Array<LatLng & { etiqueta?: string }>,
  perfiles: PerfilMedio[],
  matrizEstimada: boolean,
): EscenarioVista {
  return {
    puntos: puntos.map((punto) => ({ lat: punto.lat, lng: punto.lng, etiqueta: punto.etiqueta ?? '' })),
    envios: problem.envios.map((envio) => ({
      id: envio.id,
      folio: envio.folio,
      origenIdx: envio.origenIdx,
      destinoIdx: envio.destinoIdx,
      pesoKg: envio.pesoKg,
      volumenL: envio.volumenL,
      fragil: envio.fragil,
      urgencia: envio.urgencia,
      minutosLimite: Math.round(envio.minutosLimite),
      medioPreferido: envio.medioPreferido,
      sugerencia: envio.sugerencia,
    })),
    vehiculos: problem.vehiculos.map(({ id, nombre, medioId, baseIdx, capacidad }) => ({
      id,
      nombre,
      medioId,
      baseIdx,
      capacidad,
    })),
    medios: Object.fromEntries(
      perfiles.map((perfil) => [perfil.id, { nombre: perfil.nombre, color: perfil.color, icono: perfil.icono }]),
    ),
    matrizEstimada,
  };
}

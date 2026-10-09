import { randomUUID } from 'node:crypto';
import { ConflictError, EventTypes, NotFoundError, ValidationError, type EnvioAsignadoPayload, type SseConnection } from '@rumbo/shared';
import type { PerfilMedio } from '../domain/dispatchTypes.js';
import type { GaParams, GaProblem, GaResult } from '../geneticAlgorithm/gaTypes.js';
import { runGeneticAlgorithm } from '../geneticAlgorithm/runGeneticAlgorithm.js';
import { runStore, type RunState } from '../geneticAlgorithm/runStore.js';
import { logger, prisma } from '../lib/infrastructure.js';
import type { GaParamsInput, ScenarioInput } from '../schemas/simulationSchemas.js';
import { catalogService } from './catalogService.js';
import { routeMetricsService } from './routeMetricsService.js';
import { buildSimulationScenario, toVista } from './scenarioBuilder.js';
import type { Prisma } from '../generated/prisma/index.js';

function summarize(result: GaResult, problem: GaProblem) {
  return {
    mejor: result.mejor,
    greedy: { solucion: result.greedy.solucion },
    generaciones: result.generaciones,
    duracionMs: result.duracionMs,
    mejoraVsGreedyPct: result.mejoraVsGreedyPct,
    detenidoPorPaciencia: result.detenidoPorPaciencia,
    envios: problem.envios.length,
    vehiculos: problem.vehiculos.length,
  };
}

async function launch(run: RunState, problem: GaProblem, params: GaParams, onDone?: (result: GaResult, compatibilidad: string[][][]) => Promise<Record<string, unknown>>,
) {
  await prisma.optimizationRun.create({
    data: {
      id: run.id,
      tipo: run.tipo,
      estado: 'EN_CURSO',
      parametros: run.parametros as Prisma.InputJsonValue,
      envios: problem.envios.length,
      vehiculos: problem.vehiculos.length,
      creadoPor: (run.parametros.creadoPor as string) ?? null,
    },
  });

  runGeneticAlgorithm(problem, params, (frame) => runStore.pushFrame(run, frame))
    .then(async ({ result, compatibilidad }) => {
      const extra = onDone ? await onDone(result, compatibilidad) : {};
      const resumen = {
        ...summarize(result, problem),
        compatibles: compatibilidad.map((row) => row.filter((motivos) => motivos.length === 0).length),
        motivosIncompatibilidad: compatibilidad.map((row) => [...new Set(row.flat())].slice(0, 4)),
        ...extra,
      };
      runStore.finish(run, resumen);
      await prisma.optimizationRun.update({
        where: { id: run.id },
        data: {
          estado: 'COMPLETADA',
          costoTotal: result.mejor.solucion.costo,
          costoGreedy: result.greedy.solucion.costo,
          mejoraPct: result.mejoraVsGreedyPct,
          generaciones: result.generaciones,
          duracionMs: result.duracionMs,
          resumen: {
            violaciones: result.mejor.solucion.violaciones,
            tardias: result.mejor.solucion.tardias,
            rutas: result.mejor.solucion.rutas.length,
            ...(extra.asignados !== undefined ? { asignados: extra.asignados, sinAsignar: extra.sinAsignar } : {}),
          } as Prisma.InputJsonValue,
          finishedAt: new Date(),
        },
      });
      await prisma.outboxEvent.create({
        data: {
          type: EventTypes.OPTIMIZACION_COMPLETADA,
          payload: {
            runId: run.id,
            tipo: run.tipo,
            asignados: Number(extra.asignados ?? 0),
            costoTotal: result.mejor.solucion.costo,
            mejoraVsGreedyPct: result.mejoraVsGreedyPct,
          },
        },
      });
    })
    .catch(async (error: Error) => {
      logger.error({ err: error, runId: run.id }, 'Falló la corrida del algoritmo genético');
      runStore.fail(run, error.message);
      await prisma.optimizationRun.update({
        where: { id: run.id },
        data: { estado: 'FALLIDA', finishedAt: new Date(), resumen: { error: error.message } },
      });
    });
}

/** Construye la instancia REAL: envíos en pool + repartidores en turno. */
async function buildRealProblem() {
  const [envios, repartidores, perfiles] = await Promise.all([
    prisma.envio.findMany({ where: { status: 'EN_POOL' }, orderBy: { fechaLimite: 'asc' }, take: 80 }),
    prisma.repartidor.findMany({ where: { activo: true, disponible: true, medio: { activo: true } } }),
    catalogService.activeMedios(),
  ]);
  if (envios.length === 0) throw new ValidationError('No hay envíos pendientes en el pool');
  if (repartidores.length === 0) throw new ValidationError('No hay repartidores en turno');

  const carga = await prisma.envio.groupBy({
    by: ['repartidorId'],
    where: { status: { in: ['ASIGNADO', 'EN_RUTA'] }, repartidorId: { in: repartidores.map((r) => r.id) } },
    _count: true,
  });
  const cargaPor = new Map(carga.map((row) => [row.repartidorId, row._count]));
  const perfilMap = Object.fromEntries(perfiles.map((perfil) => [perfil.id, perfil])) as Record<string, PerfilMedio>;

  const puntos: Array<{ lat: number; lng: number; etiqueta: string }> = [];
  const add = (lat: number, lng: number, etiqueta: string) => puntos.push({ lat, lng, etiqueta }) - 1;

  const vehiculos = repartidores
    .filter((repartidor) => perfilMap[repartidor.medioId])
    .map((repartidor) => ({
      id: repartidor.id,
      nombre: repartidor.nombre,
      medioId: repartidor.medioId,
      baseIdx: add(repartidor.baseLat, repartidor.baseLng, repartidor.baseNombre),
      capacidad: Math.max(0, perfilMap[repartidor.medioId].capacidadPaquetes - (cargaPor.get(repartidor.id) ?? 0)),
    }));

  const gaEnvios = envios.map((envio) => ({
    id: envio.id,
    folio: envio.folio,
    pesoKg: envio.pesoKg,
    volumenL: envio.volumenL,
    fragil: envio.fragil,
    urgencia: envio.urgencia as GaProblem['envios'][number]['urgencia'],
    urgente: envio.extras.includes('URGENTE'),
    minutosLimite: Math.max(5, (envio.fechaLimite.getTime() - Date.now()) / 60_000),
    medioPreferido: envio.medioPreferido,
    sugerencia: envio.sugerenciaMedio,
    origenIdx: add(envio.origenLat, envio.origenLng, envio.origenDireccion),
    destinoIdx: add(envio.destinoLat, envio.destinoLng, envio.destinoDireccion),
  }));

  const matriz = await routeMetricsService.matrix(puntos);
  const problem: GaProblem = { envios: gaEnvios, vehiculos, perfiles: perfilMap, puntos, matriz };
  return { problem, vista: toVista(problem, puntos, perfiles, matriz.estimada), repartidores };
}

/** Aplica la mejor solución: asigna cada envío factible y publica envio.asignado vía outbox. */
async function applyAssignment(
  runId: string,
  problem: GaProblem,
  result: GaResult,
  compatibilidad: string[][][],
  nombres: Map<string, string>,
) {
  const asignados: string[] = [];
  const sinAsignar: Array<{ folio: string; motivo: string }> = [];

  await prisma.$transaction(async (tx) => {
    for (const ruta of result.mejor.solucion.rutas) {
      const vehiculo = problem.vehiculos[ruta.vehiculo];
      const offset = await tx.envio.count({
        where: { repartidorId: vehiculo.id, status: { in: ['ASIGNADO', 'EN_RUTA'] } },
      });
      let secuencia = offset;
      for (const [index, parada] of ruta.paradas.entries()) {
        const envio = problem.envios[parada.envio];
        const motivos = compatibilidad[parada.envio][ruta.vehiculo];
        if (motivos.length > 0) {
          // Ningún repartidor en turno puede llevarlo: se queda en el pool.
          sinAsignar.push({ folio: envio.folio, motivo: motivos[0] });
          continue;
        }
        if (index >= vehiculo.capacidad) {
          sinAsignar.push({ folio: envio.folio, motivo: 'Sin capacidad en la flota disponible' });
          continue;
        }
        secuencia += 1;
        const updated = await tx.envio.updateMany({
          where: { id: envio.id, status: 'EN_POOL' },
          data: {
            status: 'ASIGNADO',
            repartidorId: vehiculo.id,
            medioId: vehiculo.medioId,
            secuencia,
            etaMinutos: parada.llegadaMin,
            costoOperativo: Number((ruta.costo / ruta.paradas.length).toFixed(2)),
            runId,
            assignedAt: new Date(),
          },
        });
        if (updated.count === 0) continue;
        asignados.push(envio.folio);
        const payload: EnvioAsignadoPayload = {
          orderId: (await tx.envio.findUniqueOrThrow({ where: { id: envio.id } })).orderId,
          folio: envio.folio,
          repartidorId: vehiculo.id,
          repartidorNombre: nombres.get(vehiculo.id) ?? vehiculo.nombre,
          medioId: vehiculo.medioId,
          etaMinutos: Math.round(parada.llegadaMin),
          secuencia,
          runId,
        };
        await tx.outboxEvent.create({ data: { type: EventTypes.ENVIO_ASIGNADO, payload: payload as object } });
      }
    }
  });
  return { asignados: asignados.length, sinAsignar: sinAsignar.length, foliosSinAsignar: sinAsignar };
}

export const optimizationService = {
  async startSimulation(input: { escenario: ScenarioInput; parametros: GaParamsInput; velocidadMs: number }, userId: string) {
    const { problem, vista } = await buildSimulationScenario(input.escenario);
    if (problem.vehiculos.length === 0) throw new ValidationError('La flota del escenario está vacía');
    const run = runStore.create({
      id: randomUUID(),
      tipo: 'SIMULACION',
      velocidadMs: input.velocidadMs,
      escenario: vista,
      parametros: { ...input.parametros, escenario: input.escenario, creadoPor: userId },
    });
    await launch(run, problem, input.parametros);
    return { runId: run.id, escenario: vista };
  },

  async startRealOptimization(input: { parametros: GaParamsInput; velocidadMs: number }, userId: string) {
    if (runStore.hasActiveReal()) throw new ConflictError('Ya hay una optimización en curso', 'OPTIMIZACION_EN_CURSO');
    const { problem, vista, repartidores } = await buildRealProblem();
    const nombres = new Map(repartidores.map((repartidor) => [repartidor.id, repartidor.nombre]));
    const run = runStore.create({
      id: randomUUID(),
      tipo: 'REAL',
      velocidadMs: input.velocidadMs,
      escenario: vista,
      parametros: { ...input.parametros, creadoPor: userId },
    });
    await launch(run, problem, input.parametros, (result, compatibilidad) =>
      applyAssignment(run.id, problem, result, compatibilidad, nombres),
    );
    return { runId: run.id, escenario: vista };
  },

  /** Retransmite la corrida por SSE al ritmo elegido (velocidadMs por generación). */
  stream(runId: string, sse: SseConnection) {
    const run = runStore.get(runId);
    if (!run) throw new NotFoundError('La corrida ya no está disponible');

    sse.send('escenario', { runId: run.id, tipo: run.tipo, escenario: run.escenario, parametros: run.parametros });
    let cursor = 0;
    let closed = false;
    let timer: NodeJS.Timeout | null = null;

    const pump = () => {
      timer = null;
      if (closed) return;
      if (cursor < run.frames.length) {
        sse.send('generacion', run.frames[cursor]);
        cursor += 1;
        timer = setTimeout(pump, run.velocidadMs);
        return;
      }
      if (run.estado === 'COMPLETADA') {
        sse.send('resultado', run.resultado);
        sse.send('fin', { ok: true });
        sse.close();
        return;
      }
      if (run.estado === 'FALLIDA') {
        sse.send('falla', { message: run.error });
        sse.close();
        return;
      }
      run.emitter.once('cambio', pump);
    };

    sse.onClose(() => {
      closed = true;
      if (timer) clearTimeout(timer);
      run.emitter.removeListener('cambio', pump);
    });
    pump();
  },

  history: (tipo?: string) =>
    prisma.optimizationRun.findMany({
      where: tipo ? { tipo } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 30,
    }),
};

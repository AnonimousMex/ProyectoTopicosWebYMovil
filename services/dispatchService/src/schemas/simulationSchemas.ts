import { z } from 'zod';

export const gaParamsSchema = z.object({
  poblacion: z.number().int().min(10).max(400).default(80),
  generaciones: z.number().int().min(5).max(1500).default(150),
  tasaCruce: z.number().min(0).max(1).default(0.85),
  tasaMutacion: z.number().min(0).max(1).default(0.25),
  elitismo: z.number().int().min(0).max(20).default(2),
  torneo: z.number().int().min(2).max(10).default(3),
  semilla: z.number().int().min(1).max(2_147_483_647).default(2026),
  paciencia: z.number().int().min(0).max(1000).default(0),
});

export const scenarioSchema = z.object({
  envios: z.number().int().min(3).max(80).default(24),
  flota: z
    .record(z.string().max(40), z.number().int().min(0).max(20))
    .default({ camioneta: 2, motocicleta: 3, bicicleta: 2, dron: 1 })
    .refine((flota) => Object.values(flota).reduce((a, b) => a + b, 0) > 0, 'Agrega al menos un vehículo'),
  semilla: z.number().int().min(1).max(2_147_483_647).default(42),
  hora: z.number().int().min(0).max(23).optional(),
  porcentajeUrgentes: z.number().min(0).max(1).default(0.3),
  porcentajePreferencia: z.number().min(0).max(1).default(0.1),
});

export const simulationBodySchema = z.object({
  escenario: scenarioSchema.default({}),
  parametros: gaParamsSchema.default({}),
  velocidadMs: z.number().int().min(0).max(1000).default(40),
});

export const optimizeBodySchema = z.object({
  parametros: gaParamsSchema.default({}),
  velocidadMs: z.number().int().min(0).max(1000).default(25),
});

export const runIdParamsSchema = z.object({ runId: z.string().uuid() });

export const autoAssignSchema = z.object({
  activo: z.boolean(),
  intervaloSeg: z.number().int().min(30).max(3600).default(120),
});

export type GaParamsInput = z.infer<typeof gaParamsSchema>;
export type ScenarioInput = z.infer<typeof scenarioSchema>;

import { z } from 'zod';

// Caja aproximada del área metropolitana de Morelia (con margen).
export const latLngSchema = z.object({
  lat: z.number().min(19.4).max(20.1),
  lng: z.number().min(-101.6).max(-100.8),
});

const horaSchema = z.number().int().min(0).max(23).optional();

export const routeBodySchema = z.object({ origen: latLngSchema, destino: latLngSchema, hora: horaSchema });

export const matrixBodySchema = z.object({
  puntos: z.array(latLngSchema).min(1).max(250),
  hora: horaSchema,
});

export const trafficQuerySchema = z.object({
  hora: z.coerce.number().int().min(0).max(23).optional(),
});

export const chaosBodySchema = z.object({
  caido: z.boolean().optional(),
  tasaFallo: z.number().min(0).max(1).optional(),
  latenciaMs: z.number().int().min(0).max(10_000).optional(),
});

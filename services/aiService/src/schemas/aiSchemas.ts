import { z } from 'zod';

export const routeAiRequestSchema = z.object({
  parcel: z.object({
    weight_kg: z.number().positive().max(2000),
    volume_l: z.number().positive().max(5000),
    fragile: z.boolean().optional(),
  }),
  trip: z.object({ distance_km: z.number().min(0).max(500), straight_km: z.number().min(0).max(500) }),
  traffic_level: z.number().min(0).max(1),
  priority: z.enum(['LOW', 'MID', 'HIGH']),
  deadline_min: z.number().min(0),
});

export const providerParamsSchema = z.object({ proveedor: z.enum(['routeai', 'xmlbrain']) });

export const chaosBodySchema = z.object({
  caido: z.boolean().optional(),
  tasaFallo: z.number().min(0).max(1).optional(),
  latenciaMs: z.number().int().min(0).max(10_000).optional(),
});

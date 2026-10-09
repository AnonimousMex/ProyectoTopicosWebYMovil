import { z } from 'zod';

const medioFields = {
  nombre: z.string().trim().min(2).max(40),
  descripcion: z.string().trim().max(200),
  icono: z.string().trim().max(40),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Color hexadecimal #RRGGBB'),
  activo: z.boolean(),
  orden: z.number().int().min(0).max(100),
  velocidadKmh: z.number().positive().max(200),
  sensibilidadTrafico: z.number().min(0).max(1),
  costoBase: z.number().min(0).max(5000),
  costoPorKm: z.number().min(0).max(500),
  costoPorKg: z.number().min(0).max(500),
  costoOperativoKm: z.number().min(0).max(500),
  pesoMaxKg: z.number().positive().max(5000),
  volumenMaxL: z.number().positive().max(20000),
  distanciaMaxKm: z.number().positive().max(1000),
  capacidadPaquetes: z.number().int().min(1).max(100),
  emisionesGCO2Km: z.number().min(0).max(2000),
};

export const createMedioSchema = z.object({
  id: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z][a-z0-9-]{2,30}$/, 'Identificador en minúsculas, sin espacios'),
  ...medioFields,
});

export const updateMedioSchema = z.object(medioFields).partial();

export const upsertExtraSchema = z.object({
  nombre: z.string().trim().min(2).max(60),
  descripcion: z.string().trim().max(200),
  tipo: z.enum(['PORCENTAJE_VALOR', 'PORCENTAJE_TOTAL', 'FIJO']),
  valor: z.number().min(0).max(10_000),
  minimo: z.number().min(0).max(10_000).default(0),
  activo: z.boolean().default(true),
  orden: z.number().int().min(0).max(100).default(0),
});

export const idParamsSchema = z.object({ id: z.string().trim().min(1).max(64) });

export const updateRepartidorSchema = z.object({
  medioId: z.string().max(40).optional(),
  activo: z.boolean().optional(),
  disponible: z.boolean().optional(),
  baseNombre: z.string().trim().max(120).optional(),
  baseLat: z.number().min(19.4).max(20.1).optional(),
  baseLng: z.number().min(-101.6).max(-100.8).optional(),
});

export const myAvailabilitySchema = z.object({ disponible: z.boolean() });

export const updateAiProviderSchema = z.object({
  activo: z.boolean().optional(),
  prioridad: z.number().int().min(1).max(10).optional(),
});

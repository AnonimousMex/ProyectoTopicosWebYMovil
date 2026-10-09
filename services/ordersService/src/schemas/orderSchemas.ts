import { z } from 'zod';
import { OrderStatuses, Urgencias } from '@rumbo/shared/contracts';

const puntoSchema = z.object({
  direccion: z.string().trim().min(3, 'Escribe la dirección').max(200),
  lat: z.number().min(19.4).max(20.1, 'Fuera del área de servicio (Morelia)'),
  lng: z.number().min(-101.6).max(-100.8, 'Fuera del área de servicio (Morelia)'),
  lugarId: z.string().max(64).nullish(),
});

export const createOrderSchema = z.object({
  origen: puntoSchema,
  destino: puntoSchema,
  destinatarioNombre: z.string().trim().min(2, 'Nombre de quien recibe').max(80),
  destinatarioTelefono: z
    .string()
    .trim()
    .regex(/^\+?\d{10,13}$/, 'Teléfono a 10 dígitos')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  pesoKg: z.number().positive().max(500),
  largoCm: z.number().positive().max(300),
  anchoCm: z.number().positive().max(300),
  altoCm: z.number().positive().max(300),
  fragil: z.boolean().default(false),
  urgencia: z.enum(Urgencias).default('NORMAL'),
  fechaLimite: z.string().datetime({ offset: true }),
  extras: z.array(z.string().max(40)).max(10).default([]),
  valorDeclarado: z.number().min(0).max(500_000).default(0),
  /** null = "que Rumbo decida" (se toma la sugerencia de la IA). */
  medioPreferido: z.string().max(40).nullable().default(null),
  notas: z.string().trim().max(300).optional(),
});

export const listOrdersQuerySchema = z.object({
  status: z.enum(OrderStatuses).optional(),
  activos: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
  q: z.string().trim().max(40).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  vista: z.enum(['app', 'panel']).default('panel'),
});

export const folioParamsSchema = z.object({
  folio: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^RB-\d{4}-\d{6}$/, 'Folio inválido'),
});

export const orderViewQuerySchema = z.object({ vista: z.enum(['app', 'panel']).default('panel') });

export const changeStatusSchema = z.object({
  estado: z.enum(['RECOLECTADO', 'EN_CAMINO', 'ENTREGADO', 'FALLIDO']),
  motivo: z.string().trim().max(200).optional(),
});

export const cancelSchema = z.object({ motivo: z.string().trim().max(200).optional() });

export const reportQuerySchema = z.object({
  formato: z.enum(['json', 'csv']).default('json'),
  desde: z.string().datetime({ offset: true }).optional(),
  hasta: z.string().datetime({ offset: true }).optional(),
  status: z.enum(OrderStatuses).optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type ListOrdersQuery = z.infer<typeof listOrdersQuerySchema>;
export type ReportQuery = z.infer<typeof reportQuerySchema>;

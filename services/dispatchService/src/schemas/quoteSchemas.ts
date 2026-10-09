import { z } from 'zod';
import { Urgencias } from '@rumbo/shared/contracts';

export const puntoSchema = z.object({
  direccion: z.string().trim().min(3).max(200),
  lat: z.number().min(19.4).max(20.1, 'Fuera del área de servicio (Morelia)'),
  lng: z.number().min(-101.6).max(-100.8, 'Fuera del área de servicio (Morelia)'),
  lugarId: z.string().max(64).nullish(),
});

export const quoteSchema = z.object({
  origen: puntoSchema,
  destino: puntoSchema,
  pesoKg: z.number().positive('El peso debe ser mayor a 0').max(500, 'Máximo 500 kg'),
  largoCm: z.number().positive().max(300),
  anchoCm: z.number().positive().max(300),
  altoCm: z.number().positive().max(300),
  fragil: z.boolean().default(false),
  urgencia: z.enum(Urgencias).default('NORMAL'),
  fechaLimite: z.string().datetime({ offset: true, message: 'Fecha límite inválida' }),
  extras: z.array(z.string().max(40)).max(10).default([]),
  valorDeclarado: z.number().min(0).max(500_000).default(0),
});

export type QuoteInput = z.infer<typeof quoteSchema>;

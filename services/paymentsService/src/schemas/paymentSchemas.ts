import { z } from 'zod';

export const chargeSchema = z.object({
  folio: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^RB-\d{4}-\d{6}$/, 'Folio inválido'),
  tarjeta: z.object({
    numero: z
      .string()
      .transform((value) => value.replace(/[\s-]/g, ''))
      .pipe(z.string().regex(/^\d{15,16}$/, 'Número de tarjeta inválido')),
    titular: z.string().trim().min(3, 'Nombre como aparece en la tarjeta').max(80),
    expiracion: z.string().regex(/^(0[1-9]|1[0-2])\/\d{2}$/, 'Usa el formato MM/AA'),
    cvv: z.string().regex(/^\d{3,4}$/, 'CVV inválido'),
  }),
});

export const idempotencyKeySchema = z
  .string({ required_error: 'Falta el encabezado Idempotency-Key' })
  .min(8, 'Idempotency-Key inválida')
  .max(80);

export const folioParamsSchema = z.object({
  folio: z.string().trim().toUpperCase().regex(/^RB-\d{4}-\d{6}$/, 'Folio inválido'),
});

export type ChargeInput = z.infer<typeof chargeSchema>;

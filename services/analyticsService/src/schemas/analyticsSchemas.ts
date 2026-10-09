import { z } from 'zod';

export const summaryQuerySchema = z.object({ dias: z.coerce.number().int().min(1).max(90).default(14) });

export const eventsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(40),
  type: z.string().max(60).optional(),
});

export const auditQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(30),
  userId: z.string().max(64).optional(),
  metodo: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).optional(),
  soloErrores: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
});

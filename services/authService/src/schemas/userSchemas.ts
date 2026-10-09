import { z } from 'zod';
import { emailSchema, passwordSchema } from './authSchemas.js';

export const createUserSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: emailSchema,
  phone: z.string().trim().max(15).optional(),
  password: passwordSchema,
  role: z.enum(['CLIENTE', 'REPARTIDOR', 'ADMIN']),
});

export const updateUserSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  phone: z.string().trim().max(15).nullable().optional(),
  active: z.boolean().optional(),
});

export const listUsersQuerySchema = z.object({
  role: z.enum(['CLIENTE', 'REPARTIDOR', 'ADMIN']).optional(),
  q: z.string().trim().max(80).optional(),
});

export const userIdParamsSchema = z.object({ id: z.string().uuid('Identificador inválido') });
export const userIdsBodySchema = z.object({ ids: z.array(z.string()).max(200) });

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

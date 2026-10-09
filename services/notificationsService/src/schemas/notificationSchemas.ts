import { z } from 'zod';
import { emailTemplates } from '../templates/emailTemplates.js';

export const listNotificationsQuerySchema = z.object({
  soloNoLeidas: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
});

export const idParamsSchema = z.object({ id: z.string().uuid() });

export const listEmailsQuerySchema = z.object({
  status: z.enum(['PENDIENTE', 'ENVIADO', 'FALLIDO']).optional(),
});

export const testEmailSchema = z.object({ para: z.string().email() });

export const internalEmailSchema = z.object({
  para: z.string().email(),
  plantilla: z.string().refine((name) => name in emailTemplates, 'Plantilla desconocida'),
  datos: z.record(z.unknown()),
});

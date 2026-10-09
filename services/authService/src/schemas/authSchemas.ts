import { z } from 'zod';

export const emailSchema = z.string().trim().toLowerCase().email('Correo inválido').max(120);

export const passwordSchema = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .max(72, 'La contraseña es demasiado larga')
  .regex(/[a-z]/, 'Incluye al menos una minúscula')
  .regex(/[A-Z]/, 'Incluye al menos una mayúscula')
  .regex(/\d/, 'Incluye al menos un número');

const codeSchema = z.string().trim().regex(/^\d{6}$/, 'El código tiene 6 dígitos');

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Escribe tu nombre').max(80),
  email: emailSchema,
  phone: z
    .string()
    .trim()
    .regex(/^\+?\d{10,13}$/, 'Teléfono a 10 dígitos')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Escribe tu contraseña').max(72),
});

export const verifyEmailSchema = z.object({ email: emailSchema, code: codeSchema });
export const emailOnlySchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z.object({
  email: emailSchema,
  code: codeSchema,
  password: passwordSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

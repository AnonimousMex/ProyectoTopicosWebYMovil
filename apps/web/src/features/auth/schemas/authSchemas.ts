import { z } from 'zod';

const password = z
  .string()
  .min(8, 'Mínimo 8 caracteres')
  .regex(/[a-z]/, 'Incluye una minúscula')
  .regex(/[A-Z]/, 'Incluye una mayúscula')
  .regex(/\d/, 'Incluye un número');

export const loginSchema = z.object({
  email: z.string().email('Correo inválido'),
  password: z.string().min(1, 'Escribe tu contraseña'),
});

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, 'Escribe tu nombre'),
    email: z.string().email('Correo inválido'),
    phone: z.string().regex(/^(\d{10})?$/, 'Teléfono a 10 dígitos').optional(),
    password,
    confirm: z.string(),
  })
  .refine((data) => data.password === data.confirm, { path: ['confirm'], message: 'Las contraseñas no coinciden' });

export const codeSchema = z.object({ code: z.string().regex(/^\d{6}$/, 'El código tiene 6 dígitos') });

export const resetSchema = z
  .object({ code: z.string().regex(/^\d{6}$/, 'El código tiene 6 dígitos'), password, confirm: z.string() })
  .refine((data) => data.password === data.confirm, { path: ['confirm'], message: 'Las contraseñas no coinciden' });

export type LoginForm = z.infer<typeof loginSchema>;
export type RegisterForm = z.infer<typeof registerSchema>;
export type ResetForm = z.infer<typeof resetSchema>;

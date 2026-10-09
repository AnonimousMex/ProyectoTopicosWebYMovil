import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Role } from '../contracts/roles.js';

/**
 * Contexto de identidad firmado.
 *
 * El gateway valida el JWT UNA sola vez y reenvía a cada microservicio el
 * contexto del usuario firmado con HMAC (INTERNAL_SERVICE_SECRET). Los
 * servicios no saben nada de JWT ni de caducidades: sólo verifican la firma.
 * Las llamadas servicio→servicio usan el mismo mecanismo con rol SERVICE.
 */
export interface AuthContext {
  userId: string;
  role: Role;
  email: string;
  name: string;
  requestId: string;
  issuedAt: number;
}

export const CONTEXT_HEADER = 'x-rumbo-context';
export const SIGNATURE_HEADER = 'x-rumbo-signature';
const MAX_AGE_MS = 60_000;

function getSecret(): string {
  const secret = process.env.INTERNAL_SERVICE_SECRET;
  if (!secret) throw new Error('Falta INTERNAL_SERVICE_SECRET');
  return secret;
}

function sign(value: string): string {
  return createHmac('sha256', getSecret()).update(value).digest('base64url');
}

export function signContext(context: Omit<AuthContext, 'issuedAt'>): Record<string, string> {
  const encoded = Buffer.from(JSON.stringify({ ...context, issuedAt: Date.now() })).toString('base64url');
  return { [CONTEXT_HEADER]: encoded, [SIGNATURE_HEADER]: sign(encoded) };
}

export function serviceContextHeaders(serviceName: string, requestId = 'interno'): Record<string, string> {
  return signContext({
    userId: `servicio:${serviceName}`,
    role: 'SERVICE',
    email: '',
    name: serviceName,
    requestId,
  });
}

export function verifyContext(encoded: string | undefined, signature: string | undefined): AuthContext | null {
  if (!encoded || !signature) return null;
  const expected = Buffer.from(sign(encoded));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;

  try {
    const context = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as AuthContext;
    if (Date.now() - context.issuedAt > MAX_AGE_MS) return null;
    return context;
  } catch {
    return null;
  }
}

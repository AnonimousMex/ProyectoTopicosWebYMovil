import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const envPath = resolve(repoRoot, '.env');

if (existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Falta la variable de entorno ${name} (revisa .env en la raíz)`);
  }
  return value;
}

export function optionalEnv(name: string, fallback = ''): string {
  return process.env[name] ?? fallback;
}

export function numberEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const parsed = Number(raw);
  if (Number.isNaN(parsed)) throw new Error(`La variable ${name} debe ser numérica`);
  return parsed;
}

export function portFromUrl(url: string): number {
  return Number(new URL(url).port);
}

export const isProduction = process.env.NODE_ENV === 'production';

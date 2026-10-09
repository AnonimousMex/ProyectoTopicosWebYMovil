import { createHash, randomInt } from 'node:crypto';
import { TooManyRequestsError, ValidationError } from '@rumbo/shared';
import { env } from '../config/env.js';
import { logger, notificationsClient, prisma } from '../lib/infrastructure.js';
import type { CodePurpose, User } from '../generated/prisma/index.js';

const hashCode = (userId: string, code: string) => createHash('sha256').update(`${userId}:${code}`).digest('hex');

const templateByPurpose: Record<CodePurpose, string> = {
  VERIFICAR_CORREO: 'codigoVerificacion',
  RESTABLECER_CONTRASENA: 'codigoRecuperacion',
};

export const verificationService = {
  /**
   * Genera un código de 6 dígitos (sólo se guarda su hash) y pide al servicio
   * de notificaciones que lo envíe. Si notificaciones está caído, el código
   * sigue siendo válido y el usuario puede pedir reenvío: el alta no se rompe.
   */
  async sendCode(user: Pick<User, 'id' | 'email' | 'name'>, purpose: CodePurpose): Promise<{ enviado: boolean }> {
    const recent = await prisma.verificationCode.count({
      where: { userId: user.id, purpose, createdAt: { gt: new Date(Date.now() - 60_000) } },
    });
    if (recent >= 2) throw new TooManyRequestsError('Espera un minuto antes de pedir otro código');

    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    await prisma.verificationCode.updateMany({
      where: { userId: user.id, purpose, usedAt: null },
      data: { usedAt: new Date() },
    });
    await prisma.verificationCode.create({
      data: {
        userId: user.id,
        purpose,
        codeHash: hashCode(user.id, code),
        expiresAt: new Date(Date.now() + env.codeTtlMinutes * 60_000),
      },
    });

    try {
      await notificationsClient.post('/internal/correos', {
        para: user.email,
        plantilla: templateByPurpose[purpose],
        datos: { nombre: user.name, codigo: code, minutos: env.codeTtlMinutes },
      });
      return { enviado: true };
    } catch (error) {
      logger.warn({ err: error, userId: user.id }, 'No se pudo enviar el código por correo');
      if (!env.isProduction) logger.info(`[desarrollo] Código ${purpose} para ${user.email}: ${code}`);
      return { enviado: false };
    }
  },

  async consumeCode(userId: string, purpose: CodePurpose, code: string): Promise<void> {
    const current = await prisma.verificationCode.findFirst({
      where: { userId, purpose, usedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (!current || current.expiresAt < new Date()) {
      throw new ValidationError('El código expiró, pide uno nuevo');
    }
    if (current.attempts >= env.codeMaxAttempts) {
      throw new TooManyRequestsError('Demasiados intentos, pide un código nuevo');
    }
    if (current.codeHash !== hashCode(userId, code)) {
      await prisma.verificationCode.update({ where: { id: current.id }, data: { attempts: { increment: 1 } } });
      throw new ValidationError('Código incorrecto');
    }
    await prisma.verificationCode.update({ where: { id: current.id }, data: { usedAt: new Date() } });
  },
};

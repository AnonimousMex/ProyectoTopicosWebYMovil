import bcrypt from 'bcryptjs';
import { AppError, ConflictError, EventTypes, UnauthorizedError, type UsuarioRegistradoPayload } from '@rumbo/shared';
import { env } from '../config/env.js';
import { prisma } from '../lib/infrastructure.js';
import { publicUserSelect, userRepository } from '../repositories/userRepository.js';
import type { LoginInput, RegisterInput, ResetPasswordInput } from '../schemas/authSchemas.js';
import { tokenService } from './tokenService.js';
import { verificationService } from './verificationService.js';

interface ClientInfo {
  ip?: string;
  userAgent?: string;
}

// Hash de referencia para igualar tiempos cuando el correo no existe.
const DUMMY_HASH = bcrypt.hashSync('rumbo-dummy-password', 10);

export const authService = {
  async register(input: RegisterInput) {
    const existing = await userRepository.findByEmail(input.email);
    if (existing) throw new ConflictError('Ya existe una cuenta con ese correo', 'CORREO_EN_USO');

    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: { name: input.name, email: input.email, phone: input.phone, passwordHash, role: 'CLIENTE' },
      });
      const payload: UsuarioRegistradoPayload = {
        userId: created.id,
        email: created.email,
        nombre: created.name,
        rol: created.role,
      };
      await tx.outboxEvent.create({ data: { type: EventTypes.USUARIO_REGISTRADO, payload: payload as object } });
      return created;
    });

    const { enviado } = await verificationService.sendCode(user, 'VERIFICAR_CORREO');
    return { email: user.email, codigoEnviado: enviado };
  },

  async verifyEmail(email: string, code: string) {
    const user = await userRepository.findByEmail(email);
    if (!user) throw new AppError(400, 'VALIDACION', 'Código incorrecto');
    if (user.emailVerified) return { verificado: true };
    await verificationService.consumeCode(user.id, 'VERIFICAR_CORREO', code);
    await userRepository.update(user.id, { emailVerified: true });
    return { verificado: true };
  },

  async resendVerification(email: string) {
    const user = await userRepository.findByEmail(email);
    // Misma respuesta exista o no la cuenta (evita enumerar correos).
    if (user && !user.emailVerified) await verificationService.sendCode(user, 'VERIFICAR_CORREO');
    return { ok: true };
  },

  async login(input: LoginInput, client: ClientInfo) {
    const user = await userRepository.findByEmail(input.email);
    const valid = await bcrypt.compare(input.password, user?.passwordHash ?? DUMMY_HASH);

    if (!user) throw new UnauthorizedError('Correo o contraseña incorrectos');

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60_000);
      throw new AppError(423, 'CUENTA_BLOQUEADA', `Cuenta bloqueada por intentos fallidos. Intenta en ${minutes} min.`);
    }

    if (!valid) {
      const failedLogins = user.failedLogins + 1;
      const lock = failedLogins >= env.maxFailedLogins;
      await userRepository.update(user.id, {
        failedLogins: lock ? 0 : failedLogins,
        lockedUntil: lock ? new Date(Date.now() + env.lockMinutes * 60_000) : null,
      });
      throw new UnauthorizedError(
        lock
          ? `Demasiados intentos. Cuenta bloqueada ${env.lockMinutes} minutos.`
          : 'Correo o contraseña incorrectos',
      );
    }

    if (!user.active) throw new AppError(403, 'CUENTA_INACTIVA', 'Tu cuenta está desactivada');
    if (!user.emailVerified) {
      throw new AppError(403, 'CORREO_NO_VERIFICADO', 'Verifica tu correo antes de entrar', { email: user.email });
    }

    await userRepository.update(user.id, { failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() });
    const tokens = await tokenService.issue(user, client);
    const publicUser = await userRepository.findPublicById(user.id);
    return { ...tokens, user: publicUser! };
  },

  async refresh(refreshToken: string | undefined, client: ClientInfo) {
    if (!refreshToken) throw new UnauthorizedError('Sesión expirada, vuelve a entrar');
    const rotated = await tokenService.rotate(refreshToken, client);
    const publicUser = await prisma.user.findUnique({ where: { id: rotated.user.id }, select: publicUserSelect });
    return { ...rotated, user: publicUser! };
  },

  logout: (refreshToken: string | undefined) => tokenService.revoke(refreshToken),

  async forgotPassword(email: string) {
    const user = await userRepository.findByEmail(email);
    if (user?.active) await verificationService.sendCode(user, 'RESTABLECER_CONTRASENA');
    return { ok: true };
  },

  async resetPassword(input: ResetPasswordInput) {
    const user = await userRepository.findByEmail(input.email);
    if (!user) throw new AppError(400, 'VALIDACION', 'Código incorrecto');
    await verificationService.consumeCode(user.id, 'RESTABLECER_CONTRASENA', input.code);
    await userRepository.update(user.id, {
      passwordHash: await bcrypt.hash(input.password, 12),
      failedLogins: 0,
      lockedUntil: null,
      emailVerified: true,
    });
    await tokenService.revokeAllForUser(user.id);
    return { ok: true };
  },
};

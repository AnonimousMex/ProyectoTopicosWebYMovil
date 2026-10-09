import { createHash, randomBytes, randomUUID } from 'node:crypto';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { UnauthorizedError } from '@rumbo/shared';
import { env } from '../config/env.js';
import { logger, prisma } from '../lib/infrastructure.js';
import type { User } from '../generated/prisma/index.js';

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
}

interface ClientInfo {
  ip?: string;
  userAgent?: string;
}

const REUSE_GRACE_MS = 10_000;

const hash = (value: string) => createHash('sha256').update(value).digest('hex');

function signAccessToken(user: Pick<User, 'id' | 'role' | 'email' | 'name'>): string {
  return jwt.sign({ role: user.role, email: user.email, name: user.name }, env.jwtAccessSecret, {
    subject: user.id,
    expiresIn: env.accessTokenTtl as SignOptions['expiresIn'],
    issuer: 'rumbo-auth',
    audience: 'rumbo',
  });
}

async function createRefreshToken(userId: string, familyId: string, client: ClientInfo) {
  const refreshToken = randomBytes(48).toString('base64url');
  const refreshExpiresAt = new Date(Date.now() + env.refreshTokenTtlDays * 24 * 60 * 60 * 1000);
  await prisma.refreshToken.create({
    data: {
      userId,
      familyId,
      tokenHash: hash(refreshToken),
      expiresAt: refreshExpiresAt,
      ip: client.ip,
      userAgent: client.userAgent?.slice(0, 250),
    },
  });
  return { refreshToken, refreshExpiresAt };
}

export const tokenService = {
  async issue(user: User, client: ClientInfo): Promise<IssuedTokens> {
    const { refreshToken, refreshExpiresAt } = await createRefreshToken(user.id, randomUUID(), client);
    return { accessToken: signAccessToken(user), refreshToken, refreshExpiresAt };
  },

  /**
   * Rotación de refresh tokens con detección de reutilización: si alguien
   * presenta un token ya rotado, se revoca toda la familia (posible robo).
   */
  async rotate(presented: string, client: ClientInfo): Promise<IssuedTokens & { user: User }> {
    const stored = await prisma.refreshToken.findUnique({
      where: { tokenHash: hash(presented) },
      include: { user: true },
    });
    if (!stored) throw new UnauthorizedError('Sesión expirada, vuelve a entrar');

    if (stored.revokedAt) {
      // Carrera legítima (dos pestañas o peticiones simultáneas): no es robo.
      if (Date.now() - stored.revokedAt.getTime() < REUSE_GRACE_MS) {
        throw new UnauthorizedError('Sesión renovada en otra pestaña, reintenta');
      }
      await prisma.refreshToken.updateMany({
        where: { familyId: stored.familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      logger.warn({ userId: stored.userId }, 'Reutilización de refresh token detectada: familia revocada');
      throw new UnauthorizedError('Sesión inválida, vuelve a entrar');
    }
    if (stored.expiresAt < new Date() || !stored.user.active) {
      throw new UnauthorizedError('Sesión expirada, vuelve a entrar');
    }

    await prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
    const { refreshToken, refreshExpiresAt } = await createRefreshToken(stored.userId, stored.familyId, client);
    return { user: stored.user, accessToken: signAccessToken(stored.user), refreshToken, refreshExpiresAt };
  },

  async revoke(presented: string | undefined): Promise<void> {
    if (!presented) return;
    const stored = await prisma.refreshToken.findUnique({ where: { tokenHash: hash(presented) } });
    if (!stored) return;
    await prisma.refreshToken.updateMany({
      where: { familyId: stored.familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },

  async revokeAllForUser(userId: string): Promise<void> {
    await prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
  },
};

import { prisma } from '../lib/infrastructure.js';
import type { Prisma, Role, User } from '../generated/prisma/index.js';

export type PublicUser = Pick<
  User,
  'id' | 'email' | 'name' | 'phone' | 'role' | 'emailVerified' | 'active' | 'createdAt' | 'lastLoginAt'
>;

export const publicUserSelect = {
  id: true,
  email: true,
  name: true,
  phone: true,
  role: true,
  emailVerified: true,
  active: true,
  createdAt: true,
  lastLoginAt: true,
} satisfies Prisma.UserSelect;

export const userRepository = {
  findByEmail: (email: string) => prisma.user.findUnique({ where: { email } }),

  findById: (id: string) => prisma.user.findUnique({ where: { id } }),

  findPublicById: (id: string) => prisma.user.findUnique({ where: { id }, select: publicUserSelect }),

  findPublicByIds: (ids: string[]) =>
    prisma.user.findMany({ where: { id: { in: ids } }, select: publicUserSelect }),

  list: (filters: { role?: Role; q?: string }) =>
    prisma.user.findMany({
      where: {
        role: filters.role,
        ...(filters.q
          ? {
              OR: [
                { name: { contains: filters.q, mode: 'insensitive' } },
                { email: { contains: filters.q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      select: publicUserSelect,
      orderBy: { createdAt: 'desc' },
      take: 200,
    }),

  update: (id: string, data: Prisma.UserUpdateInput) => prisma.user.update({ where: { id }, data }),
};

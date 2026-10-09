import bcrypt from 'bcryptjs';
import { ConflictError, EventTypes, NotFoundError } from '@rumbo/shared';
import { prisma } from '../lib/infrastructure.js';
import { publicUserSelect, userRepository } from '../repositories/userRepository.js';
import type { CreateUserInput, UpdateUserInput } from '../schemas/userSchemas.js';
import type { Role } from '../generated/prisma/index.js';
import { tokenService } from './tokenService.js';

export const userService = {
  list: (filters: { role?: Role; q?: string }) => userRepository.list(filters),

  async getById(id: string) {
    const user = await userRepository.findPublicById(id);
    if (!user) throw new NotFoundError('Usuario no encontrado');
    return user;
  },

  getManyByIds: (ids: string[]) => userRepository.findPublicByIds(ids),

  async create(input: CreateUserInput) {
    if (await userRepository.findByEmail(input.email)) {
      throw new ConflictError('Ya existe una cuenta con ese correo', 'CORREO_EN_USO');
    }
    const { password, ...data } = input;
    const passwordHash = await bcrypt.hash(password, 12);
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { ...data, passwordHash, emailVerified: true },
        select: publicUserSelect,
      });
      await tx.outboxEvent.create({
        data: {
          type: EventTypes.USUARIO_REGISTRADO,
          payload: { userId: user.id, email: user.email, nombre: user.name, rol: user.role },
        },
      });
      return user;
    });
  },

  async update(id: string, input: UpdateUserInput) {
    await this.getById(id);
    const user = await prisma.user.update({ where: { id }, data: input, select: publicUserSelect });
    if (input.active === false) await tokenService.revokeAllForUser(id);
    return user;
  },
};

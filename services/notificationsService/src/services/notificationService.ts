import type { Role } from '@rumbo/shared';
import { channels, prisma, realtime } from '../lib/infrastructure.js';

export interface InAppNotification {
  /** null = para todos los administradores. */
  userId: string | null;
  titulo: string;
  mensaje: string;
  tipo: string;
  folio?: string | null;
}

export const notificationService = {
  async create(notification: InAppNotification) {
    const saved = await prisma.notification.create({
      data: {
        audience: notification.userId ? 'USUARIO' : 'ADMINS',
        userId: notification.userId,
        titulo: notification.titulo,
        mensaje: notification.mensaje,
        tipo: notification.tipo,
        folio: notification.folio ?? null,
      },
    });
    await realtime.publish(notification.userId ? channels.user(notification.userId) : channels.admins, saved);
    return saved;
  },

  list(userId: string, role: Role, onlyUnread: boolean) {
    return prisma.notification.findMany({
      where: {
        OR: [{ userId }, ...(role === 'ADMIN' ? [{ audience: 'ADMINS' as const }] : [])],
        ...(onlyUnread ? { leida: false } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  },

  async unreadCount(userId: string, role: Role) {
    return prisma.notification.count({
      where: { OR: [{ userId }, ...(role === 'ADMIN' ? [{ audience: 'ADMINS' as const }] : [])], leida: false },
    });
  },

  async markRead(id: string, userId: string, role: Role) {
    await prisma.notification.updateMany({
      where: { id, OR: [{ userId }, ...(role === 'ADMIN' ? [{ audience: 'ADMINS' as const }] : [])] },
      data: { leida: true },
    });
  },

  async markAllRead(userId: string, role: Role) {
    await prisma.notification.updateMany({
      where: { OR: [{ userId }, ...(role === 'ADMIN' ? [{ audience: 'ADMINS' as const }] : [])], leida: false },
      data: { leida: true },
    });
  },
};

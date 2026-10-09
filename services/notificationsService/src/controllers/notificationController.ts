import type { Request, Response } from 'express';
import { openSse, requireAuth } from '@rumbo/shared';
import { channels, realtime } from '../lib/infrastructure.js';
import { notificationService } from '../services/notificationService.js';

export const notificationController = {
  async list(req: Request, res: Response) {
    const auth = requireAuth(req);
    const onlyUnread = (req.query as unknown as { soloNoLeidas: boolean }).soloNoLeidas;
    res.json(await notificationService.list(auth.userId, auth.role, onlyUnread));
  },

  async unreadCount(req: Request, res: Response) {
    const auth = requireAuth(req);
    res.json({ noLeidas: await notificationService.unreadCount(auth.userId, auth.role) });
  },

  async markRead(req: Request, res: Response) {
    const auth = requireAuth(req);
    await notificationService.markRead(req.params.id, auth.userId, auth.role);
    res.status(204).end();
  },

  async markAllRead(req: Request, res: Response) {
    const auth = requireAuth(req);
    await notificationService.markAllRead(auth.userId, auth.role);
    res.status(204).end();
  },

  /** Canal SSE: el navegador recibe cada aviso nuevo sin consultar. */
  async stream(req: Request, res: Response) {
    const auth = requireAuth(req);
    const sse = openSse(req, res);
    sse.send('listo', { ok: true });

    const forward = (data: string) => sse.send('notificacion', data);
    const unsubscribers = [await realtime.listen(channels.user(auth.userId), forward)];
    if (auth.role === 'ADMIN') unsubscribers.push(await realtime.listen(channels.admins, forward));
    sse.onClose(() => unsubscribers.forEach((unsubscribe) => void unsubscribe()));
  },
};

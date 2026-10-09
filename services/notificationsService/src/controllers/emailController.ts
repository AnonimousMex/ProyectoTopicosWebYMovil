import type { Request, Response } from 'express';
import { NotFoundError, requireAuth } from '@rumbo/shared';
import { emailService } from '../services/emailService.js';

export const emailController = {
  async list(req: Request, res: Response) {
    res.json({ driver: emailService.driver, correos: await emailService.list(req.query) });
  },

  async retry(req: Request, res: Response) {
    const log = await emailService.retry(req.params.id);
    if (!log) throw new NotFoundError('Correo no encontrado');
    res.json({ id: log.id, status: log.status, lastError: log.lastError });
  },

  async sendTest(req: Request, res: Response) {
    const auth = requireAuth(req);
    const log = await emailService.sendNow({
      to: req.body.para,
      template: 'bienvenida',
      data: { nombre: auth.name },
    });
    res.json({ status: log.status, driver: log.driver, error: log.lastError });
  },

  /** Interno: correos transaccionales (códigos) que el llamador necesita confirmar. */
  async sendInternal(req: Request, res: Response) {
    const log = await emailService.sendNow({ to: req.body.para, template: req.body.plantilla, data: req.body.datos });
    if (log.status !== 'ENVIADO') {
      res.status(502).json({ error: { code: 'CORREO_FALLIDO', message: log.lastError ?? 'No se pudo enviar' } });
      return;
    }
    res.json({ enviado: true });
  },
};

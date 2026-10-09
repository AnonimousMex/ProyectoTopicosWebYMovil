import type { Request, Response } from 'express';
import type { Role } from '../generated/prisma/index.js';
import { userService } from '../services/userService.js';

export const userController = {
  async list(req: Request, res: Response) {
    res.json(await userService.list(req.query as { role?: Role; q?: string }));
  },

  async create(req: Request, res: Response) {
    res.status(201).json(await userService.create(req.body));
  },

  async update(req: Request, res: Response) {
    res.json(await userService.update(req.params.id, req.body));
  },

  // --- Internos (servicio → servicio) ---
  async getInternal(req: Request, res: Response) {
    res.json(await userService.getById(req.params.id));
  },

  async getManyInternal(req: Request, res: Response) {
    res.json(await userService.getManyByIds(req.body.ids));
  },
};

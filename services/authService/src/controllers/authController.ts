import type { CookieOptions, Request, Response } from 'express';
import { env } from '../config/env.js';
import { authService } from '../services/authService.js';
import { userService } from '../services/userService.js';
import { requireAuth } from '@rumbo/shared';

const cookieOptions = (expires?: Date): CookieOptions => ({
  httpOnly: true,
  secure: env.isProduction,
  sameSite: 'strict',
  path: '/api/auth',
  expires,
});

const clientInfo = (req: Request) => ({ ip: req.ip, userAgent: req.header('user-agent') });

export const authController = {
  async register(req: Request, res: Response) {
    res.status(201).json(await authService.register(req.body));
  },

  async verifyEmail(req: Request, res: Response) {
    res.json(await authService.verifyEmail(req.body.email, req.body.code));
  },

  async resendVerification(req: Request, res: Response) {
    res.json(await authService.resendVerification(req.body.email));
  },

  async login(req: Request, res: Response) {
    const result = await authService.login(req.body, clientInfo(req));
    res.cookie(env.refreshCookieName, result.refreshToken, cookieOptions(result.refreshExpiresAt));
    res.json({ accessToken: result.accessToken, user: result.user });
  },

  async refresh(req: Request, res: Response) {
    try {
      const result = await authService.refresh(req.cookies?.[env.refreshCookieName], clientInfo(req));
      res.cookie(env.refreshCookieName, result.refreshToken, cookieOptions(result.refreshExpiresAt));
      res.json({ accessToken: result.accessToken, user: result.user });
    } catch (error) {
      res.clearCookie(env.refreshCookieName, cookieOptions());
      throw error;
    }
  },

  async logout(req: Request, res: Response) {
    await authService.logout(req.cookies?.[env.refreshCookieName]);
    res.clearCookie(env.refreshCookieName, cookieOptions());
    res.status(204).end();
  },

  async forgotPassword(req: Request, res: Response) {
    res.json(await authService.forgotPassword(req.body.email));
  },

  async resetPassword(req: Request, res: Response) {
    res.json(await authService.resetPassword(req.body));
  },

  async me(req: Request, res: Response) {
    res.json(await userService.getById(requireAuth(req).userId));
  },
};

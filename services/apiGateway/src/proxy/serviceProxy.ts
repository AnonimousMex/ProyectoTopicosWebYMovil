import type { ClientRequest, IncomingMessage } from 'node:http';
import type { Request, RequestHandler } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { CONTEXT_HEADER, SIGNATURE_HEADER, signContext } from '@rumbo/shared';
import { logger } from '../lib/infrastructure.js';

/**
 * Proxy hacia un microservicio. Antes de reenviar:
 *  - borra cualquier encabezado de identidad que venga del navegador (anti-suplantación),
 *  - agrega la identidad verificada y firmada,
 *  - quita el Authorization (los servicios no necesitan el JWT).
 */
export function serviceProxy(prefix: string, target: string): RequestHandler {
  return createProxyMiddleware<Request>({
    target,
    changeOrigin: true,
    pathFilter: (path) => path === prefix || path.startsWith(`${prefix}/`),
    proxyTimeout: 30_000,
    on: {
      proxyReq: (proxyReq: ClientRequest, req: Request) => {
        proxyReq.removeHeader(CONTEXT_HEADER);
        proxyReq.removeHeader(SIGNATURE_HEADER);
        proxyReq.removeHeader('authorization');
        proxyReq.setHeader('x-request-id', req.requestId ?? '');
        if (req.auth) {
          const headers = signContext({
            userId: req.auth.userId,
            role: req.auth.role,
            email: req.auth.email,
            name: req.auth.name,
            requestId: req.requestId ?? '',
          });
          for (const [key, value] of Object.entries(headers)) proxyReq.setHeader(key, value);
        }
        // Las cookies sólo le sirven al servicio de identidad (refresh token).
        if (!prefix.startsWith('/api/auth')) proxyReq.removeHeader('cookie');
      },
      proxyRes: (proxyRes: IncomingMessage) => {
        if (String(proxyRes.headers['content-type'] ?? '').includes('text/event-stream')) {
          proxyRes.headers['x-accel-buffering'] = 'no';
          proxyRes.headers['cache-control'] = 'no-cache, no-transform';
        }
      },
      error: (error, _req, res) => {
        logger.warn({ err: error.message, prefix }, 'Microservicio no disponible');
        const response = res as unknown as import('node:http').ServerResponse;
        if (!response.headersSent && typeof response.writeHead === 'function') {
          response.writeHead(503, { 'Content-Type': 'application/json' });
          response.end(
            JSON.stringify({
              error: { code: 'SERVICIO_NO_DISPONIBLE', message: 'Este módulo no está disponible en este momento' },
            }),
          );
        }
      },
    },
  });
}

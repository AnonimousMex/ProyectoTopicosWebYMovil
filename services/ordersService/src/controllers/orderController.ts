import type { Request, Response } from 'express';
import { requireAuth } from '@rumbo/shared';
import { orderPresenters } from '../presenters/orderPresenters.js';
import { orderRepository } from '../repositories/orderRepository.js';
import type { ListOrdersQuery, ReportQuery } from '../schemas/orderSchemas.js';
import { orderService } from '../services/orderService.js';
import { renderShippingLabel } from '../services/shippingLabelService.js';

export const orderController = {
  async create(req: Request, res: Response) {
    const auth = requireAuth(req);
    const key = req.header('idempotency-key')?.slice(0, 80);
    const { order, repetido } = await orderService.create(req.body, auth, key);
    res.status(repetido ? 200 : 201).json(orderPresenters.panel(order, auth.role));
  },

  async list(req: Request, res: Response) {
    const auth = requireAuth(req);
    const query = req.query as unknown as ListOrdersQuery;
    const result = await orderRepository.list(query, auth);
    const present = query.vista === 'app' ? orderPresenters.app.bind(orderPresenters) : (order: (typeof result.items)[number]) => orderPresenters.panel(order, auth.role);
    res.json({ ...result, items: result.items.map(present) });
  },

  async summary(req: Request, res: Response) {
    const rows = await orderRepository.countByStatus(requireAuth(req));
    res.json(Object.fromEntries(rows.map((row) => [row.status, row._count])));
  },

  async detail(req: Request, res: Response) {
    const auth = requireAuth(req);
    const order = await orderRepository.findByFolio(req.params.folio, auth);
    res.json(req.query.vista === 'app' ? orderPresenters.app(order) : orderPresenters.panel(order, auth.role));
  },

  async changeStatus(req: Request, res: Response) {
    const auth = requireAuth(req);
    const order = await orderService.changeStatus(req.params.folio, req.body.estado, auth, req.body.motivo);
    res.json(orderPresenters.panel(order, auth.role));
  },

  async cancel(req: Request, res: Response) {
    const auth = requireAuth(req);
    const order = await orderService.cancel(req.params.folio, auth, req.body.motivo);
    res.json(orderPresenters.panel(order, auth.role));
  },

  async label(req: Request, res: Response) {
    const order = await orderRepository.findByFolio(req.params.folio, requireAuth(req));
    const pdf = await renderShippingLabel(order);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="guia-${order.folio}.pdf"`);
    res.send(pdf);
  },

  /** Reporte de gerencia: mismas consultas que el seguimiento, otro presentador. */
  async report(req: Request, res: Response) {
    const query = req.query as unknown as ReportQuery;
    const rows = (await orderRepository.forReport(query)).map((order) => orderPresenters.reportRow(order));
    if (query.formato === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="reporte-pedidos.csv"');
      res.send(`﻿${orderPresenters.toCsv(rows)}`);
      return;
    }
    res.json({ total: rows.length, filas: rows });
  },

  async internalDetail(req: Request, res: Response) {
    const order = await orderRepository.findByFolio(req.params.folio);
    res.json(orderPresenters.snapshot(order));
  },
};

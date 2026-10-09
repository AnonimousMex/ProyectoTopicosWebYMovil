import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { OrderStatusLabels, UrgenciaLabels } from '@rumbo/shared';
import { env } from '../config/env.js';
import type { Order } from '../generated/prisma/index.js';

const money = (value: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);

/**
 * Guía de envío en PDF.
 *
 * El trámite real es: autenticar → consultar un pedido existente → generar
 * un archivo. Por eso es UNA función: sin Event Sourcing, sin CQRS, sin
 * Redux global. Saber decir que no a la ceremonia también es diseño.
 */
export async function renderShippingLabel(order: Order): Promise<Buffer> {
  const trackingUrl = `${env.webUrl}/app/pedidos/${order.folio}`;
  const qr = await QRCode.toBuffer(trackingUrl, { margin: 1, width: 220, color: { dark: '#0B1020' } });

  const doc = new PDFDocument({ size: 'A6', layout: 'landscape', margin: 18 });
  const chunks: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))));

  const width = doc.page.width;
  doc.rect(0, 0, width, 42).fill('#0B1020');
  doc.circle(28, 21, 6).fill('#FF5A1F');
  doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(16).text('Rumbo', 40, 13);
  doc.font('Helvetica').fontSize(9).fillColor('#CBD5E1').text('Guía de envío', width - 140, 10, { width: 122, align: 'right' });
  doc.font('Helvetica-Bold').fontSize(12).fillColor('#FFFFFF').text(order.folio, width - 200, 22, { width: 182, align: 'right' });

  doc.fillColor('#0F172A');
  const left = 18;
  let y = 56;
  const block = (label: string, value: string, x = left, w = 260) => {
    doc.font('Helvetica').fontSize(7).fillColor('#64748B').text(label.toUpperCase(), x, y, { width: w });
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#0F172A').text(value, x, y + 9, { width: w });
    y = doc.y + 6;
  };

  block('Remitente', `${order.clienteNombre}\n${order.origenDireccion}`);
  block('Destinatario', `${order.destinatarioNombre}${order.destinatarioTelefono ? ` · ${order.destinatarioTelefono}` : ''}\n${order.destinoDireccion}`);
  block(
    'Paquete',
    `${order.pesoKg} kg · ${order.largoCm}×${order.anchoCm}×${order.altoCm} cm${order.fragil ? ' · FRÁGIL' : ''}`,
  );
  block(
    'Servicio',
    `${(order.medioId ?? order.medioPreferido ?? order.sugerenciaMedio ?? 'Por asignar').toUpperCase()} · Urgencia ${
      UrgenciaLabels[order.urgencia as keyof typeof UrgenciaLabels] ?? order.urgencia
    }${order.extras.length ? ` · ${order.extras.join(', ')}` : ''}`,
  );

  doc.image(qr, width - 128, 54, { width: 110 });
  doc.font('Helvetica').fontSize(7).fillColor('#64748B').text('Escanea para rastrear', width - 128, 168, { width: 110, align: 'center' });
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#0F172A').text(money(order.total), width - 128, 182, { width: 110, align: 'center' });
  doc.font('Helvetica').fontSize(7).fillColor('#64748B').text(
    `Estado: ${OrderStatusLabels[order.status]} · Límite ${order.fechaLimite.toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}`,
    left,
    doc.page.height - 26,
  );
  doc.end();
  return done;
}

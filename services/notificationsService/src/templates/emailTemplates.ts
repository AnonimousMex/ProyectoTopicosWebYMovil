import { env } from '../config/env.js';
import { detailTable, escapeHtml, renderLayout } from './emailLayout.js';

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

type Data = Record<string, any>;
type TemplateFn = (data: Data) => RenderedEmail;

const money = (value: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(value ?? 0));

const orderUrl = (folio: string) => `${env.webUrl}/app/pedidos/${encodeURIComponent(folio)}`;

const medioNombre: Record<string, string> = {
  camioneta: 'Camioneta',
  motocicleta: 'Motocicleta',
  bicicleta: 'Bicicleta',
  dron: 'Dron',
};
const nombreMedio = (id?: string | null) => (id ? (medioNombre[id] ?? id) : 'Por asignar');

function codeEmail(subject: string, titulo: string, intro: string, data: Data): RenderedEmail {
  const html = renderLayout({
    preheader: `Tu código es ${data.codigo}`,
    titulo,
    cuerpoHtml: `<p>Hola ${escapeHtml(data.nombre)},</p><p>${intro}</p>
      <p style="margin:24px 0;text-align:center;"><span style="display:inline-block;font-size:34px;font-weight:800;letter-spacing:10px;background:#0B1020;color:#FFFFFF;padding:14px 22px;border-radius:14px;">${escapeHtml(data.codigo)}</span></p>
      <p style="font-size:13px;color:#64748B;">El código expira en ${escapeHtml(data.minutos)} minutos. Si no fuiste tú, ignora este correo.</p>`,
  });
  return { subject, html, text: `${intro}\nCódigo: ${data.codigo} (expira en ${data.minutos} min).` };
}

/**
 * Registro de plantillas: agregar un correo nuevo = agregar una entrada.
 * Los suscriptores sólo eligen plantilla y datos.
 */
export const emailTemplates: Record<string, TemplateFn> = {
  codigoVerificacion: (data) =>
    codeEmail('Verifica tu correo — Rumbo', 'Confirma tu correo', 'Usa este código para activar tu cuenta en Rumbo:', data),

  codigoRecuperacion: (data) =>
    codeEmail(
      'Código para restablecer tu contraseña — Rumbo',
      'Restablece tu contraseña',
      'Recibimos una solicitud para cambiar tu contraseña. Tu código es:',
      data,
    ),

  bienvenida: (data) => ({
    subject: '¡Te damos la bienvenida a Rumbo!',
    text: `Hola ${data.nombre}, confirma tu correo con el código que te enviamos para activar tu cuenta.`,
    html: renderLayout({
      preheader: 'Tu cuenta ya está lista',
      titulo: `¡Hola, ${data.nombre}! Ya casi terminas`,
      cuerpoHtml:
        '<p>Confirma tu correo con el código de 6 dígitos que te enviamos y listo. Después registra tu primer envío: nuestra IA te recomendará el mejor medio entre camioneta, moto, bici o dron.</p>',
      cta: { texto: 'Crear mi primer envío', url: `${env.webUrl}/app/nuevo` },
    }),
  }),

  pedidoCreado: (data) => ({
    subject: `Recibimos tu pedido ${data.folio}`,
    text: `Tu pedido ${data.folio} quedó registrado. Total: ${money(data.total)}. Completa el pago para asignarlo.`,
    html: renderLayout({
      preheader: `Pedido ${data.folio} registrado`,
      titulo: 'Tu pedido quedó registrado',
      cuerpoHtml: `<p>Hola ${escapeHtml(data.nombre)}, ya tenemos tu pedido. En cuanto se acredite el pago lo asignamos.</p>
        ${detailTable([
          ['Folio', data.folio],
          ['Origen', data.origen],
          ['Destino', data.destino],
          ['Medio preferido', data.medioPreferido ? nombreMedio(data.medioPreferido) : 'Que Rumbo decida'],
          ['Total', money(data.total)],
        ])}`,
      cta: { texto: 'Pagar ahora', url: orderUrl(data.folio) },
    }),
  }),

  pagoAcreditado: (data) => ({
    subject: `Pago confirmado — ${data.folio}`,
    text: `Recibimos tu pago de ${money(data.monto)} para el pedido ${data.folio}.`,
    html: renderLayout({
      preheader: `Pago de ${money(data.monto)} acreditado`,
      titulo: 'Pago confirmado ✓',
      acento: '#10B981',
      cuerpoHtml: `<p>Hola ${escapeHtml(data.nombre)}, tu pago fue acreditado. Nuestro algoritmo ya está buscando al mejor repartidor.</p>
        ${detailTable([
          ['Folio', data.folio],
          ['Monto', money(data.monto)],
          ['Destino', data.destino],
        ])}`,
      cta: { texto: 'Ver mi pedido', url: orderUrl(data.folio) },
    }),
  }),

  pedidoAsignado: (data) => ({
    subject: `Tu pedido ${data.folio} ya tiene repartidor`,
    text: `${data.repartidor} llevará tu pedido en ${nombreMedio(data.medio)}. ETA aprox. ${data.eta} min.`,
    html: renderLayout({
      preheader: `Asignado a ${data.repartidor}`,
      titulo: 'Ya tienes repartidor',
      acento: '#6366F1',
      cuerpoHtml: `<p>Hola ${escapeHtml(data.nombre)}, tu pedido fue asignado.</p>
        ${detailTable([
          ['Folio', data.folio],
          ['Repartidor', data.repartidor],
          ['Medio', nombreMedio(data.medio)],
          ['Tiempo estimado', `${data.eta} min`],
        ])}`,
      cta: { texto: 'Seguir mi pedido', url: orderUrl(data.folio) },
    }),
  }),

  pedidoEnCamino: (data) => ({
    subject: `Tu pedido ${data.folio} va en camino 🚀`,
    text: `Tu pedido ${data.folio} va en camino. Síguelo en tiempo real: ${orderUrl(data.folio)}`,
    html: renderLayout({
      preheader: 'Síguelo en tiempo real',
      titulo: 'Tu pedido va en camino',
      cuerpoHtml: `<p>Hola ${escapeHtml(data.nombre)}, tu paquete ya salió hacia <strong>${escapeHtml(data.destino)}</strong>. Puedes ver al repartidor moverse en el mapa.</p>`,
      cta: { texto: 'Ver en el mapa', url: orderUrl(data.folio) },
    }),
  }),

  pedidoEntregado: (data) => ({
    subject: `Pedido ${data.folio} entregado ✓`,
    text: `Tu pedido ${data.folio} fue entregado. ¡Gracias por usar Rumbo!`,
    html: renderLayout({
      preheader: '¡Entregado!',
      titulo: '¡Entregado!',
      acento: '#10B981',
      cuerpoHtml: `<p>Hola ${escapeHtml(data.nombre)}, tu pedido <strong>${escapeHtml(data.folio)}</strong> fue entregado en ${escapeHtml(data.destino)}.</p><p>¡Gracias por confiar en Rumbo!</p>`,
      cta: { texto: 'Ver detalle', url: orderUrl(data.folio) },
    }),
  }),

  pedidoCancelado: (data) => ({
    subject: `Pedido ${data.folio} cancelado`,
    text: `Tu pedido ${data.folio} fue cancelado. ${data.motivo ?? ''}`,
    html: renderLayout({
      preheader: 'Pedido cancelado',
      titulo: 'Tu pedido fue cancelado',
      acento: '#EF4444',
      cuerpoHtml: `<p>Hola ${escapeHtml(data.nombre)}, el pedido <strong>${escapeHtml(data.folio)}</strong> fue cancelado.</p>${
        data.motivo ? `<p>Motivo: ${escapeHtml(data.motivo)}</p>` : ''
      }<p>Si ya habías pagado, el reembolso se procesa automáticamente.</p>`,
    }),
  }),

  pedidoFallido: (data) => ({
    subject: `No pudimos entregar ${data.folio}`,
    text: `Hubo un problema con la entrega de ${data.folio}. Te contactaremos.`,
    html: renderLayout({
      preheader: 'Problema con la entrega',
      titulo: 'Hubo un problema con tu entrega',
      acento: '#EF4444',
      cuerpoHtml: `<p>Hola ${escapeHtml(data.nombre)}, el repartidor no pudo completar la entrega de <strong>${escapeHtml(data.folio)}</strong>.</p>${
        data.motivo ? `<p>Motivo: ${escapeHtml(data.motivo)}</p>` : ''
      }<p>Nuestro equipo se pondrá en contacto contigo.</p>`,
    }),
  }),

  reembolso: (data) => ({
    subject: `Reembolso procesado — ${data.folio}`,
    text: `Reembolsamos ${money(data.monto)} del pedido ${data.folio}.`,
    html: renderLayout({
      preheader: 'Reembolso en proceso',
      titulo: 'Reembolso procesado',
      cuerpoHtml: `<p>Hola ${escapeHtml(data.nombre)}, reembolsamos <strong>${money(data.monto)}</strong> del pedido ${escapeHtml(data.folio)}. Puede tardar unos días en reflejarse.</p>`,
    }),
  }),

  nuevaEntregaRepartidor: (data) => ({
    subject: `Nueva entrega asignada: ${data.folio}`,
    text: `Tienes una nueva entrega ${data.folio}: ${data.origen} → ${data.destino}.`,
    html: renderLayout({
      preheader: 'Tienes una nueva entrega',
      titulo: 'Nueva entrega asignada',
      acento: '#F59E0B',
      cuerpoHtml: `<p>Hola ${escapeHtml(data.nombre)}, el algoritmo de asignación te eligió para esta entrega:</p>
        ${detailTable([
          ['Folio', data.folio],
          ['Recolección', data.origen],
          ['Entrega', data.destino],
          ['Peso', `${data.pesoKg} kg`],
          ['Orden en tu ruta', `#${data.secuencia}`],
        ])}`,
      cta: { texto: 'Abrir mis entregas', url: `${env.webUrl}/repartidor` },
    }),
  }),
};

export function renderEmail(template: string, data: Data): RenderedEmail {
  const fn = emailTemplates[template];
  if (!fn) throw new Error(`Plantilla de correo desconocida: ${template}`);
  return fn(data);
}

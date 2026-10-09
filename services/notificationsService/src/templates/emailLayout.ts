export const escapeHtml = (value: unknown) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export interface LayoutParts {
  preheader: string;
  titulo: string;
  cuerpoHtml: string;
  cta?: { texto: string; url: string };
  acento?: string;
}

/** Marco visual común de todos los correos de Rumbo. */
export function renderLayout({ preheader, titulo, cuerpoHtml, cta, acento = '#FF5A1F' }: LayoutParts): string {
  return `<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(titulo)}</title></head>
<body style="margin:0;background:#F1F3F9;font-family:'Segoe UI',Helvetica,Arial,sans-serif;color:#0F172A;">
  <span style="display:none;max-height:0;overflow:hidden;">${escapeHtml(preheader)}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F1F3F9;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:18px;overflow:hidden;box-shadow:0 8px 30px rgba(15,23,42,.08);">
        <tr><td style="background:#0B1020;padding:22px 28px;">
          <table role="presentation" width="100%"><tr>
            <td style="font-size:22px;font-weight:800;color:#FFFFFF;letter-spacing:-.5px;">
              <span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${acento};margin-right:8px;"></span>Rumbo
            </td>
            <td align="right" style="font-size:12px;color:#94A3B8;">Entregas inteligentes</td>
          </tr></table>
        </td></tr>
        <tr><td style="height:4px;background:linear-gradient(90deg,${acento},#6366F1);"></td></tr>
        <tr><td style="padding:32px 28px 8px;">
          <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#0F172A;">${escapeHtml(titulo)}</h1>
          <div style="font-size:15px;line-height:1.6;color:#334155;">${cuerpoHtml}</div>
          ${
            cta
              ? `<p style="margin:28px 0 8px;"><a href="${escapeHtml(cta.url)}" style="display:inline-block;background:${acento};color:#FFFFFF;text-decoration:none;font-weight:700;padding:13px 24px;border-radius:12px;">${escapeHtml(cta.texto)}</a></p>`
              : ''
          }
        </td></tr>
        <tr><td style="padding:24px 28px 30px;font-size:12px;color:#94A3B8;border-top:1px solid #E2E8F0;">
          Recibes este correo porque tienes una cuenta en Rumbo. Este es un proyecto académico de demostración.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function detailTable(rows: Array<[string, unknown]>): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0;background:#F8FAFC;border-radius:12px;border:1px solid #E2E8F0;">
${rows
  .map(
    ([label, value], index) => `<tr>
  <td style="padding:10px 14px;font-size:13px;color:#64748B;${index ? 'border-top:1px solid #E2E8F0;' : ''}">${escapeHtml(label)}</td>
  <td style="padding:10px 14px;font-size:14px;font-weight:600;color:#0F172A;text-align:right;${index ? 'border-top:1px solid #E2E8F0;' : ''}">${escapeHtml(value)}</td>
</tr>`,
  )
  .join('')}
</table>`;
}

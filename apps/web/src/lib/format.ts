const currency = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
const tz = 'America/Mexico_City';

export const money = (value: number | null | undefined) => currency.format(Number(value ?? 0));

export const number = (value: number, digits = 0) =>
  new Intl.NumberFormat('es-MX', { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(value);

export const dateTime = (value: string | Date | null | undefined) =>
  value
    ? new Date(value).toLocaleString('es-MX', { timeZone: tz, day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
    : '—';

export const time = (value: string | Date | null | undefined) =>
  value ? new Date(value).toLocaleTimeString('es-MX', { timeZone: tz, hour: '2-digit', minute: '2-digit' }) : '—';

export const shortDate = (value: string) =>
  new Date(`${value}T12:00:00`).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });

export function relative(value: string | Date): string {
  const diff = (new Date(value).getTime() - Date.now()) / 60_000;
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat('es-MX', { numeric: 'auto' });
  if (abs < 1) return 'ahora';
  if (abs < 60) return rtf.format(Math.round(diff), 'minute');
  if (abs < 60 * 24) return rtf.format(Math.round(diff / 60), 'hour');
  return rtf.format(Math.round(diff / 1440), 'day');
}

export const minutes = (value: number | null | undefined) => {
  if (value === null || value === undefined) return '—';
  if (value < 60) return `${Math.round(value)} min`;
  return `${Math.floor(value / 60)} h ${Math.round(value % 60)} min`;
};

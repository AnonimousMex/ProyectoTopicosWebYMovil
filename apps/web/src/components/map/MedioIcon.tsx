import { medioColor } from '@/lib/medios';

/** Iconos propios para cada medio (los nuevos usan un paquete genérico). */
const paths: Record<string, string> = {
  camioneta:
    'M3 7h11v9H3zM14 10h4l3 3v3h-7zM6.5 18.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM17.5 18.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z',
  motocicleta:
    'M5 18a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 18a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM5 15h5l3-5h3l3 5M13 10l-1-3h-2M16 10h2',
  bicicleta: 'M5.5 17.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM18.5 17.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM5.5 14l4-6h5l4 6M9.5 8 12 14h-6.5M14 5h2.5',
  dron: 'M9 10h6v4H9zM4 6h4M16 6h4M6 6v4h3M18 6v4h-3M4.5 18 9 14M19.5 18 15 14M12 14v4',
};

export function MedioIcon({ medio, className = 'h-5 w-5', color }: { medio?: string | null; className?: string; color?: string }) {
  const d = (medio && paths[medio]) || 'M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10';
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={color ?? medioColor(medio)} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d={d} />
    </svg>
  );
}

export function medioIconSvg(medio: string | null | undefined, color: string, size = 18): string {
  const d = (medio && paths[medio]) || 'M3 7l9-4 9 4v10l-9 4-9-4z';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`;
}

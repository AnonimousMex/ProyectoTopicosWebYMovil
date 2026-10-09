/** Apariencia de cada medio. Los medios nuevos creados en el panel usan su color de la base. */
export const MEDIO_STYLE: Record<string, { nombre: string; color: string }> = {
  camioneta: { nombre: 'Camioneta', color: '#6366F1' },
  motocicleta: { nombre: 'Motocicleta', color: '#F97316' },
  bicicleta: { nombre: 'Bicicleta', color: '#22C55E' },
  dron: { nombre: 'Dron', color: '#06B6D4' },
};

export const medioNombre = (id?: string | null) => (id ? (MEDIO_STYLE[id]?.nombre ?? id) : 'Por asignar');
export const medioColor = (id?: string | null, fallback = '#64748B') => (id ? (MEDIO_STYLE[id]?.color ?? fallback) : fallback);

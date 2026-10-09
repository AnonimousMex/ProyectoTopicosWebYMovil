import { useMemo, useRef, useState } from 'react';
import { MapPin, Search } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { Lugar } from '@/types/api';
import { useCatalogo } from '../hooks/usePedidos';

export interface PlaceValue {
  direccion: string;
  lat: number;
  lng: number;
  lugarId?: string | null;
  nombre?: string;
}

const normalize = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/**
 * Buscador de direcciones sobre el catálogo del proveedor de mapas simulado.
 * El catálogo se descarga una vez y se filtra en el navegador: aunque el
 * "proveedor" esté caído, buscar direcciones sigue funcionando.
 */
export function PlacePicker({
  label,
  value,
  onChange,
  accent,
  error,
}: {
  label: string;
  value: PlaceValue | null;
  onChange: (value: PlaceValue) => void;
  accent: string;
  error?: string;
}) {
  const { data, isLoading } = useCatalogo();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const blurTimer = useRef<number | undefined>(undefined);

  const results = useMemo(() => {
    const lugares = data?.lugares ?? [];
    const q = normalize(query.trim());
    const filtered = q
      ? lugares.filter((lugar) => normalize(`${lugar.nombre} ${lugar.colonia} ${lugar.direccion}`).includes(q))
      : lugares;
    return filtered.slice(0, 8);
  }, [data, query]);

  const select = (lugar: Lugar) => {
    onChange({ direccion: `${lugar.nombre} — ${lugar.direccion}`, lat: lugar.lat, lng: lugar.lng, lugarId: lugar.id, nombre: lugar.nombre });
    setQuery('');
    setOpen(false);
  };

  return (
    <div className="relative">
      <span className="mb-1.5 block text-xs font-semibold text-slate-600">{label}</span>
      <div
        className={cn(
          'flex items-center gap-2.5 rounded-xl border bg-white px-3.5 transition focus-within:ring-4',
          error ? 'border-rose-400 focus-within:ring-rose-100' : 'border-slate-200 focus-within:border-brand-400 focus-within:ring-brand-100',
        )}
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: `${accent}1F`, color: accent }}>
          <MapPin className="h-3.5 w-3.5" />
        </span>
        <input
          className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
          placeholder={value ? value.nombre ?? value.direccion : 'Busca colonia, plaza, escuela…'}
          value={query}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            blurTimer.current = window.setTimeout(() => setOpen(false), 150);
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
        />
        <Search className="h-4 w-4 shrink-0 text-slate-300" />
      </div>
      {value && !open && <p className="mt-1 truncate text-xs text-slate-500">{value.direccion}</p>}
      {error && <p className="mt-1 text-xs font-medium text-rose-600">{error}</p>}
      {open && (
        <div className="absolute z-[700] mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-pop scrollbar-thin">
          {isLoading && <p className="px-4 py-3 text-sm text-slate-400">Cargando catálogo…</p>}
          {!isLoading && results.length === 0 && <p className="px-4 py-3 text-sm text-slate-400">Sin coincidencias en Morelia</p>}
          {results.map((lugar) => (
            <button
              key={lugar.id}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => select(lugar)}
              className="flex w-full items-start gap-3 px-4 py-2.5 text-left hover:bg-slate-50"
            >
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-slate-800">{lugar.nombre}</span>
                <span className="block truncate text-xs text-slate-500">
                  {lugar.tipo} · {lugar.colonia}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

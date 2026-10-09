import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Circle, Marker, Tooltip } from 'react-leaflet';
import { Radio } from 'lucide-react';
import { BaseMap, dotIcon, vehicleIcon } from '@/components/map/BaseMap';
import { MedioIcon } from '@/components/map/MedioIcon';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/Feedback';
import { PageHeader } from '@/components/ui/Misc';
import { api } from '@/lib/apiClient';
import { medioColor } from '@/lib/medios';
import type { Repartidor } from '@/types/api';
import { useFleetTracking } from '../hooks/useTracking';

interface Trafico {
  hora: number;
  zonas: Array<{ id: string; nombre: string; color: string; centroLat: number; centroLng: number; radioKm: number; nivel: number }>;
}

export function MapaEnVivoPage() {
  const posiciones = Object.values(useFleetTracking());
  const flota = useQuery({ queryKey: ['asignacion', 'flota'], queryFn: () => api.get<Repartidor[]>('/flota').then((r) => r.data) });
  const trafico = useQuery({
    queryKey: ['mapas', 'trafico'],
    queryFn: () => api.get<Trafico>('/mapas/trafico').then((r) => r.data),
    refetchInterval: 60_000,
    retry: false,
  });

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow="Tiempo real"
        title="Mapa en vivo"
        subtitle="Posición de cada repartidor en ruta (SSE) y tráfico por zona del proveedor de mapas simulado."
      />
      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <BaseMap className="h-[620px] shadow-card">
          {trafico.data?.zonas
            .filter((zona) => zona.id !== 'periferia')
            .map((zona) => (
              <Circle
                key={zona.id}
                center={[zona.centroLat, zona.centroLng]}
                radius={zona.radioKm * 1000}
                pathOptions={{ color: zona.nivel > 0.6 ? '#EF4444' : zona.nivel > 0.35 ? '#F59E0B' : '#10B981', weight: 1, fillOpacity: 0.08 + zona.nivel * 0.12 }}
              >
                <Tooltip>
                  {zona.nombre}: tráfico {Math.round(zona.nivel * 100)}%
                </Tooltip>
              </Circle>
            ))}
          {flota.data
            ?.filter((r) => r.disponible)
            .map((r) => (
              <Marker key={r.id} position={[r.baseLat, r.baseLng]} icon={dotIcon(medioColor(r.medioId), 12)}>
                <Tooltip>
                  {r.nombre} · base {r.baseNombre}
                </Tooltip>
              </Marker>
            ))}
          {posiciones.map((posicion) => (
            <Marker key={posicion.folio} position={[posicion.lat, posicion.lng]} icon={vehicleIcon(posicion.medioId, medioColor(posicion.medioId), posicion.status === 'EN_CAMINO')}>
              <Tooltip direction="top" offset={[0, -16]}>
                {posicion.folio} · {posicion.repartidorNombre} · {Math.round(posicion.progreso * 100)}%
              </Tooltip>
            </Marker>
          ))}
        </BaseMap>
        <Card>
          <CardHeader title={`En ruta (${posiciones.length})`} icon={<Radio className="h-4 w-4 text-emerald-500" />} subtitle={trafico.error ? 'Mapa de tráfico no disponible' : `Tráfico de las ${trafico.data?.hora ?? '—'}:00`} />
          <CardBody className="space-y-3">
            {posiciones.length === 0 && <EmptyState title="Nadie en ruta" description="Cuando un repartidor marque «En camino» aparecerá aquí." />}
            {posiciones.map((posicion) => (
              <Link key={posicion.folio} to={`/panel/pedidos/${posicion.folio}`} className="block rounded-xl border border-slate-100 p-3 hover:border-brand-200">
                <div className="flex items-center gap-2">
                  <MedioIcon medio={posicion.medioId} className="h-4 w-4" />
                  <span className="font-mono text-xs font-bold text-slate-600">{posicion.folio}</span>
                  <span className="ml-auto text-xs text-slate-400">
                    {posicion.status === 'EN_CAMINO' ? `${Math.ceil(posicion.etaSeg / 60)} min` : posicion.status === 'EN_DESTINO' ? 'en destino' : 'por recolectar'}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">{posicion.repartidorNombre}</p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${posicion.progreso * 100}%`, backgroundColor: medioColor(posicion.medioId) }} />
                </div>
              </Link>
            ))}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

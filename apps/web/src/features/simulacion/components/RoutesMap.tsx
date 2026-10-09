import { useMemo } from 'react';
import { CircleMarker, Marker, Polyline, Tooltip } from 'react-leaflet';
import { BaseMap, boundsOf, vehicleIcon } from '@/components/map/BaseMap';
import type { Escenario, Solucion } from '../types';
import { routeColor } from '../types';

/** Rutas de la mejor solución: base → recoger → entregar → recoger → … */
export function RoutesMap({ escenario, solucion, className = 'h-[420px]' }: { escenario: Escenario; solucion: Solucion | null; className?: string }) {
  const bounds = useMemo(() => boundsOf(escenario.puntos.map((p) => [p.lat, p.lng] as [number, number])), [escenario]);
  const point = (idx: number) => [escenario.puntos[idx].lat, escenario.puntos[idx].lng] as [number, number];

  return (
    <BaseMap className={className} bounds={bounds}>
      {solucion?.rutas.map((ruta) => {
        const vehiculo = escenario.vehiculos[ruta.vehiculo];
        const path: [number, number][] = [point(vehiculo.baseIdx)];
        ruta.paradas.forEach((parada) => {
          const envio = escenario.envios[parada.envio];
          path.push(point(envio.origenIdx), point(envio.destinoIdx));
        });
        return <Polyline key={ruta.vehiculo} positions={path} pathOptions={{ color: routeColor(ruta.vehiculo), weight: 3.5, opacity: 0.9 }} />;
      })}
      {escenario.envios.map((envio, index) => (
        <CircleMarker
          key={`o-${envio.id}`}
          center={point(envio.origenIdx)}
          radius={4}
          pathOptions={{ color: '#0B1020', weight: 1.5, fillColor: 'white', fillOpacity: 1 }}
        >
          <Tooltip>
            Recoger envío {index + 1} · {envio.pesoKg} kg
          </Tooltip>
        </CircleMarker>
      ))}
      {escenario.envios.map((envio, index) => (
        <CircleMarker
          key={`d-${envio.id}`}
          center={point(envio.destinoIdx)}
          radius={5}
          pathOptions={{ color: 'white', weight: 1.5, fillColor: envio.urgencia === 'CRITICA' ? '#E11D48' : envio.urgencia === 'ALTA' ? '#F59E0B' : '#FF5A1F', fillOpacity: 1 }}
        >
          <Tooltip>
            Entregar envío {index + 1} · límite {envio.minutosLimite} min · {envio.urgencia.toLowerCase()}
          </Tooltip>
        </CircleMarker>
      ))}
      {escenario.vehiculos.map((vehiculo, index) => (
        <Marker key={vehiculo.id} position={point(vehiculo.baseIdx)} icon={vehicleIcon(vehiculo.medioId, routeColor(index), false)}>
          <Tooltip>{vehiculo.nombre}</Tooltip>
        </Marker>
      ))}
    </BaseMap>
  );
}

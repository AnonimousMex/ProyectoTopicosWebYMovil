import { Marker, Polyline, Tooltip } from 'react-leaflet';
import { BaseMap, boundsOf, pinIcon, vehicleIcon } from '@/components/map/BaseMap';
import { medioColor } from '@/lib/medios';
import type { Posicion, PuntoMapa } from '@/types/api';

/**
 * Mapa del pedido. La polilínea se guardó al cotizar, así que pintar un
 * pedido existente NO depende del proveedor de mapas: si se cae, esto sigue.
 */
export function OrderRouteMap({
  origen,
  destino,
  polilinea,
  medio,
  posicion,
  className = 'h-72',
}: {
  origen: PuntoMapa;
  destino: PuntoMapa;
  polilinea?: [number, number][] | null;
  medio?: string | null;
  posicion?: Posicion | null;
  className?: string;
}) {
  const line = polilinea && polilinea.length > 1 ? polilinea : ([[origen.lat, origen.lng], [destino.lat, destino.lng]] as [number, number][]);
  const color = medioColor(medio, '#FF5A1F');
  const traveled = posicion && posicion.progreso > 0 ? cutAt(line, posicion) : null;

  return (
    <BaseMap className={className} bounds={boundsOf(line)}>
      <Polyline positions={line} pathOptions={{ color: '#0B1020', weight: 7, opacity: 0.12 }} />
      <Polyline positions={line} pathOptions={{ color, weight: 4, opacity: 0.85, dashArray: '8 8' }} />
      {traveled && <Polyline positions={traveled} pathOptions={{ color, weight: 5, opacity: 1 }} />}
      <Marker position={[origen.lat, origen.lng]} icon={pinIcon('#0B1020', 'A')}>
        <Tooltip>Recolección: {origen.direccion}</Tooltip>
      </Marker>
      <Marker position={[destino.lat, destino.lng]} icon={pinIcon('#FF5A1F', 'B')}>
        <Tooltip>Entrega: {destino.direccion}</Tooltip>
      </Marker>
      {posicion && (
        <Marker position={[posicion.lat, posicion.lng]} icon={vehicleIcon(posicion.medioId ?? medio, color, posicion.status === 'EN_CAMINO')} zIndexOffset={1000}>
          <Tooltip permanent direction="top" offset={[0, -18]}>
            {posicion.repartidorNombre ?? 'Repartidor'}
          </Tooltip>
        </Marker>
      )}
    </BaseMap>
  );
}

/** Tramo recorrido: puntos de la ruta hasta la posición actual. */
function cutAt(line: [number, number][], posicion: Posicion): [number, number][] {
  let best = 0;
  let bestDistance = Infinity;
  line.forEach(([lat, lng], index) => {
    const distance = (lat - posicion.lat) ** 2 + (lng - posicion.lng) ** 2;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = index;
    }
  });
  return [...line.slice(0, best + 1), [posicion.lat, posicion.lng]];
}

import { useEffect, type ReactNode } from 'react';
import L, { type LatLngBoundsExpression, type LatLngExpression } from 'leaflet';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import { cn } from '@/lib/cn';
import { medioIconSvg } from './MedioIcon';

export const MORELIA: LatLngExpression = [19.7008, -101.1844];

/**
 * Mapa base con teselas gratuitas de OpenStreetMap (sin API de pago ni llave).
 * Los cálculos de ruta, distancia y tráfico vienen de nuestro proveedor simulado.
 */
export function BaseMap({
  children,
  className,
  center = MORELIA,
  zoom = 13,
  bounds,
}: {
  children?: ReactNode;
  className?: string;
  center?: LatLngExpression;
  zoom?: number;
  bounds?: LatLngBoundsExpression | null;
}) {
  return (
    <div className={cn('relative overflow-hidden rounded-2xl', className)}>
      <MapContainer center={center} zoom={zoom} scrollWheelZoom className="h-full w-full" zoomControl={false} attributionControl>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        {bounds && <FitBounds bounds={bounds} />}
        {children}
      </MapContainer>
    </div>
  );
}

function FitBounds({ bounds }: { bounds: LatLngBoundsExpression }) {
  const map = useMap();
  const key = JSON.stringify(bounds);
  useEffect(() => {
    map.fitBounds(bounds, { padding: [36, 36], maxZoom: 15 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key]);
  return null;
}

export function pinIcon(color: string, label?: string) {
  return L.divIcon({
    className: 'rumbo-marker',
    iconSize: [28, 36],
    iconAnchor: [14, 34],
    html: `<div style="position:relative;width:28px;height:36px">
      <svg viewBox="0 0 28 36" width="28" height="36"><path d="M14 35s11-11.3 11-20A11 11 0 0 0 3 15c0 8.7 11 20 11 20z" fill="${color}" stroke="white" stroke-width="2"/></svg>
      <span style="position:absolute;top:6px;left:0;width:28px;text-align:center;color:white;font:700 11px 'Plus Jakarta Sans',sans-serif">${label ?? ''}</span>
    </div>`,
  });
}

export function vehicleIcon(medio: string | null | undefined, color: string, pulse = true) {
  return L.divIcon({
    className: 'rumbo-marker',
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    html: `<div style="position:relative;width:38px;height:38px">
      ${pulse ? `<span style="position:absolute;inset:0;border-radius:999px;background:${color};opacity:.35;animation:pulse-ring 1.8s infinite"></span>` : ''}
      <span style="position:absolute;inset:4px;border-radius:999px;background:white;border:2.5px solid ${color};display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(15,23,42,.25)">${medioIconSvg(medio, color, 17)}</span>
    </div>`,
  });
}

export function dotIcon(color: string, size = 10) {
  return L.divIcon({
    className: 'rumbo-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<span style="display:block;width:${size}px;height:${size}px;border-radius:999px;background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.3)"></span>`,
  });
}

export function boundsOf(points: Array<[number, number]>): LatLngBoundsExpression | null {
  if (points.length === 0) return null;
  return L.latLngBounds(points.map(([lat, lng]) => L.latLng(lat, lng)));
}

import { useMemo } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { number } from '@/lib/format';
import type { GaFrame } from '../types';

const axis = { fontSize: 11, fill: '#94A3B8' };

/** Muestrea a ≤300 puntos para que la gráfica siga fluida con muchas generaciones. */
function sample(frames: GaFrame[]) {
  if (frames.length <= 300) return frames;
  const step = Math.ceil(frames.length / 300);
  return frames.filter((_, index) => index % step === 0 || index === frames.length - 1);
}

export function FitnessChart({ frames, greedy }: { frames: GaFrame[]; greedy?: number | null }) {
  const data = useMemo(
    () => sample(frames).map((f) => ({ gen: f.generacion, mejor: f.mejorCosto, promedio: f.costoPromedio, greedy: greedy ?? undefined })),
    [frames, greedy],
  );
  // El promedio inicial es enorme; se recorta para que se vea cómo baja el mejor costo.
  const domain = useMemo(() => {
    const best = data.map((d) => d.mejor);
    if (best.length === 0) return [0, 1];
    const min = Math.min(...best, greedy ?? Infinity);
    const max = Math.max(best[0], greedy ?? 0);
    return [Math.floor(min * 0.96), Math.ceil(max * 1.25)];
  }, [data, greedy]);
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="#EEF2F7" vertical={false} />
        <XAxis dataKey="gen" tick={axis} tickLine={false} axisLine={false} />
        <YAxis tick={axis} tickLine={false} axisLine={false} width={56} domain={domain} allowDataOverflow tickFormatter={(v) => number(v)} />
        <Tooltip
          contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 12 }}
          formatter={(value, name) => [number(Number(value), 1), name === 'mejor' ? 'Mejor costo' : name === 'promedio' ? 'Promedio población' : 'Método voraz']}
          labelFormatter={(gen) => `Generación ${gen}`}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} formatter={(name) => (name === 'mejor' ? 'Mejor costo' : name === 'promedio' ? 'Promedio' : 'Voraz (Excel)')} />
        <Line type="monotone" dataKey="promedio" stroke="#CBD5E1" strokeWidth={1.5} dot={false} isAnimationActive={false} />
        <Line type="stepAfter" dataKey="mejor" stroke="#FF5A1F" strokeWidth={2.5} dot={false} isAnimationActive={false} />
        {greedy && <Line dataKey="greedy" stroke="#6366F1" strokeDasharray="6 6" strokeWidth={1.5} dot={false} isAnimationActive={false} />}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function DiversityChart({ frames, poblacion }: { frames: GaFrame[]; poblacion: number }) {
  const data = useMemo(
    () => sample(frames).map((f) => ({ gen: f.generacion, diversidad: Math.round(f.diversidad * 100), factibles: Math.round((f.factibles / poblacion) * 100) })),
    [frames, poblacion],
  );
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="div" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#6366F1" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#6366F1" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="fac" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#10B981" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#EEF2F7" vertical={false} />
        <XAxis dataKey="gen" tick={axis} tickLine={false} axisLine={false} />
        <YAxis tick={axis} tickLine={false} axisLine={false} width={44} domain={[0, 100]} unit="%" />
        <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} labelFormatter={(gen) => `Generación ${gen}`} formatter={(v, n) => [`${v}%`, n === 'diversidad' ? 'Diversidad genética' : 'Soluciones factibles']} />
        <Area type="monotone" dataKey="diversidad" stroke="#6366F1" fill="url(#div)" strokeWidth={2} isAnimationActive={false} />
        <Area type="monotone" dataKey="factibles" stroke="#10B981" fill="url(#fac)" strokeWidth={2} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function PopulationHistogram({ frame }: { frame: GaFrame | null }) {
  const data = (frame?.histograma ?? new Array(20).fill(0)).map((count, index) => ({ bucket: index, count }));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <XAxis dataKey="bucket" tick={false} axisLine={{ stroke: '#E2E8F0' }} />
        <YAxis tick={axis} tickLine={false} axisLine={false} width={28} allowDecimals={false} />
        <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} formatter={(v) => [String(v), 'individuos']} labelFormatter={(b) => (b === 0 ? 'Más aptos' : b === 19 ? 'Menos aptos' : `Rango ${Number(b) + 1}`)} />
        <Bar dataKey="count" radius={[4, 4, 0, 0]} isAnimationActive={false}>
          {data.map((entry) => (
            <Cell key={entry.bucket} fill={`hsl(${18 + entry.bucket * 11}, 90%, ${55 + entry.bucket}%)`} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

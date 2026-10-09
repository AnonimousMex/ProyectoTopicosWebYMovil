import type { ReactNode } from 'react';
import { BrainCircuit, Dna, MapPinned, ShieldCheck } from 'lucide-react';
import { Logo } from './Logo';

const features = [
  { icon: Dna, title: 'Algoritmo genético', text: 'Asigna cada envío al mejor repartidor evolucionando miles de rutas.' },
  { icon: BrainCircuit, title: 'IA sin ataduras', text: 'Varios proveedores de IA; si uno cae, otro responde.' },
  { icon: MapPinned, title: 'Seguimiento en vivo', text: 'Ve al repartidor moverse por Morelia en tiempo real.' },
  { icon: ShieldCheck, title: 'Pagos seguros', text: 'Un clic repetido nunca genera un doble cargo.' },
];

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle?: ReactNode; children: ReactNode }) {
  return (
    <div className="grid min-h-full lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-ink-900 p-12 text-white lg:flex lg:flex-col">
        <div className="pointer-events-none absolute inset-0 opacity-40" style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, rgba(255,90,31,.35), transparent 40%), radial-gradient(circle at 80% 70%, rgba(99,102,241,.35), transparent 45%)' }} />
        <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.12]" aria-hidden>
          <defs>
            <pattern id="grid" width="44" height="44" patternUnits="userSpaceOnUse">
              <path d="M44 0H0V44" fill="none" stroke="white" strokeWidth="0.6" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          <path d="M60 620 C 220 520, 260 380, 420 360 S 620 200, 700 120" stroke="#FF5A1F" strokeWidth="3" fill="none" strokeDasharray="10 10" />
        </svg>
        <Logo dark />
        <div className="relative mt-auto max-w-md">
          <h2 className="text-4xl font-extrabold leading-tight tracking-tight">
            Cada paquete, en el <span className="text-brand-400">rumbo</span> correcto.
          </h2>
          <p className="mt-3 text-slate-300">Plataforma de entregas para Morelia con camioneta, moto, bici y dron.</p>
          <div className="mt-10 grid grid-cols-2 gap-4">
            {features.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <Icon className="h-5 w-5 text-brand-400" />
                <p className="mt-2 text-sm font-bold">{title}</p>
                <p className="mt-1 text-xs text-slate-400">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </aside>
      <main className="flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm animate-fade-up">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-slate-500">{subtitle}</p>}
          <div className="mt-7">{children}</div>
        </div>
      </main>
    </div>
  );
}

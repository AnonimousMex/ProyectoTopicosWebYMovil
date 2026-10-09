import { useState, type ComponentType } from 'react';
import { Link, NavLink, Navigate, Outlet, ScrollRestoration, useLocation } from 'react-router-dom';
import {
  Activity,
  BrainCircuit,
  ClipboardList,
  Dna,
  Home,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Map,
  Menu,
  PackagePlus,
  Package,
  ScrollText,
  Settings2,
  Truck,
  Users,
  Workflow,
  X,
} from 'lucide-react';
import type { UserRole } from '@rumbo/shared/contracts';
import { homeFor, useAuth } from '@/features/auth/hooks/AuthProvider';
import { NotificationBell } from '@/features/notificaciones/components/NotificationBell';
import { useNotificationStream } from '@/features/notificaciones/hooks/useNotifications';
import { PageLoader } from '@/components/ui/Feedback';
import { cn } from '@/lib/cn';
import { Logo } from './Logo';

/** Guardia de rutas por rol (la seguridad real está en el gateway; esto es UX). */
export function RequireRole({ role }: { role: UserRole }) {
  const { user, status } = useAuth();
  const location = useLocation();
  if (status === 'cargando') return <PageLoader label="Recuperando tu sesión…" />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (user.role !== role) return <Navigate to={homeFor(user.role)} replace />;
  return <Outlet />;
}

export function RootRedirect() {
  const { user, status } = useAuth();
  if (status === 'cargando') return <PageLoader />;
  return <Navigate to={user ? homeFor(user.role) : '/login'} replace />;
}

interface NavItem {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  end?: boolean;
}

const panelNav: Array<{ section: string; items: NavItem[] }> = [
  {
    section: 'Operación',
    items: [
      { to: '/panel', label: 'Tablero', icon: LayoutDashboard, end: true },
      { to: '/panel/pedidos', label: 'Pedidos', icon: Package },
      { to: '/panel/asignacion', label: 'Asignación', icon: Workflow },
      { to: '/panel/mapa', label: 'Mapa en vivo', icon: Map },
    ],
  },
  {
    section: 'Inteligencia',
    items: [
      { to: '/panel/simulacion', label: 'Algoritmo genético', icon: Dna },
      { to: '/panel/ia', label: 'Proveedores de IA', icon: BrainCircuit },
    ],
  },
  {
    section: 'Configuración',
    items: [
      { to: '/panel/flota', label: 'Flota', icon: Truck },
      { to: '/panel/medios', label: 'Medios y tarifas', icon: Settings2 },
      { to: '/panel/usuarios', label: 'Usuarios', icon: Users },
    ],
  },
  {
    section: 'Sistema',
    items: [
      { to: '/panel/sistema', label: 'Salud y resiliencia', icon: Activity },
      { to: '/panel/bitacora', label: 'Bitácora', icon: ScrollText },
    ],
  },
];

function UserChip({ dark }: { dark?: boolean }) {
  const { user, logout } = useAuth();
  if (!user) return null;
  return (
    <div className="flex items-center gap-3">
      <div className={cn('flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold', dark ? 'bg-white/10 text-white' : 'bg-brand-100 text-brand-700')}>
        {user.name.charAt(0)}
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn('truncate text-sm font-semibold', dark ? 'text-white' : 'text-ink-900')}>{user.name}</p>
        <p className={cn('truncate text-[11px]', dark ? 'text-slate-400' : 'text-slate-500')}>{user.email}</p>
      </div>
      <button onClick={() => void logout()} className={cn('rounded-lg p-2', dark ? 'text-slate-400 hover:bg-white/10 hover:text-white' : 'text-slate-400 hover:bg-slate-100')} aria-label="Cerrar sesión">
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  );
}

/** Panel web del administrador: barra lateral oscura + contenido. */
export function PanelLayout() {
  const [open, setOpen] = useState(false);
  useNotificationStream(true);

  const sidebar = (
    <div className="flex h-full flex-col bg-ink-900 px-4 py-5">
      <div className="flex items-center justify-between px-2">
        <Logo dark />
        <button className="text-slate-400 lg:hidden" onClick={() => setOpen(false)} aria-label="Cerrar menú">
          <X className="h-5 w-5" />
        </button>
      </div>
      <nav className="mt-8 flex-1 space-y-6 overflow-y-auto scrollbar-thin">
        {panelNav.map((group) => (
          <div key={group.section}>
            <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">{group.section}</p>
            <div className="space-y-0.5">
              {group.items.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition',
                      isActive ? 'bg-white/10 text-white shadow-inner' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon className={cn('h-4 w-4', isActive && 'text-brand-400')} />
                      {label}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="mt-4 border-t border-white/10 pt-4">
        <UserChip dark />
      </div>
    </div>
  );

  return (
    <div className="flex h-full">
      <aside className="hidden w-64 shrink-0 lg:block">{sidebar}</aside>
      {open && (
        <div className="fixed inset-0 z-[1150] lg:hidden">
          <div className="absolute inset-0 bg-ink-950/60" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72">{sidebar}</div>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200/70 bg-white/80 px-4 backdrop-blur lg:px-8">
          <div className="flex items-center gap-3">
            <button className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden" onClick={() => setOpen(true)} aria-label="Abrir menú">
              <Menu className="h-5 w-5" />
            </button>
            <span className="hidden items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 sm:flex">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" /> Panel de operaciones · Morelia
            </span>
          </div>
          <NotificationBell />
        </header>
        <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

/** App móvil (cliente o repartidor): encabezado + navegación inferior. */
export function MobileLayout({ variant }: { variant: 'cliente' | 'repartidor' }) {
  const { user } = useAuth();
  useNotificationStream(true);
  const nav: NavItem[] =
    variant === 'cliente'
      ? [
          { to: '/app', label: 'Inicio', icon: Home, end: true },
          { to: '/app/nuevo', label: 'Enviar', icon: PackagePlus },
          { to: '/app/pedidos', label: 'Mis envíos', icon: ClipboardList },
        ]
      : [
          { to: '/repartidor', label: 'Mi ruta', icon: ListChecks, end: true },
          { to: '/repartidor/historial', label: 'Entregas', icon: ClipboardList },
        ];

  return (
    <div className="mx-auto flex min-h-full max-w-2xl flex-col bg-surface">
      <header className="sticky top-0 z-[1100] flex items-center justify-between border-b border-slate-200/60 bg-white/85 px-4 py-3 backdrop-blur">
        <Link to={variant === 'cliente' ? '/app' : '/repartidor'}>
          <Logo />
        </Link>
        <div className="flex items-center gap-1">
          <NotificationBell />
          <MobileUserMenu />
        </div>
      </header>
      <ScrollRestoration />
      <main className="flex-1 px-4 pb-28 pt-5">
        {variant === 'repartidor' && user && (
          <p className="mb-1 text-xs font-bold uppercase tracking-wider text-brand-500">App del repartidor</p>
        )}
        <Outlet />
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-[1100] mx-auto max-w-2xl border-t border-slate-200 bg-white/95 px-6 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 backdrop-blur">
        <div className="flex justify-around">
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn('flex flex-col items-center gap-0.5 rounded-xl px-4 py-1.5 text-[11px] font-semibold transition', isActive ? 'text-brand-600' : 'text-slate-400')
              }
            >
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}

function MobileUserMenu() {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)} className="rounded-xl p-2.5 text-slate-500 hover:bg-slate-100" aria-label="Cuenta">
        <Menu className="h-5 w-5" />
      </button>
      {open && (
        <div className="absolute right-0 z-[900] mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-4 shadow-pop animate-fade-up">
          <UserChip />
        </div>
      )}
    </div>
  );
}

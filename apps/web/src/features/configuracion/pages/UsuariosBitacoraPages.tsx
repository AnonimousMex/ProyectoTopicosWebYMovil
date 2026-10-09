import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { RoleLabels, type UserRole } from '@rumbo/shared/contracts';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageLoader } from '@/components/ui/Feedback';
import { Field, Input, Select } from '@/components/ui/Input';
import { Badge, Modal, PageHeader, Segmented, Toggle } from '@/components/ui/Misc';
import { api, errorMessage } from '@/lib/apiClient';
import { dateTime } from '@/lib/format';
import type { Paginated, User } from '@/types/api';

const ROLE_COLOR: Record<UserRole, string> = { ADMIN: '#FF5A1F', REPARTIDOR: '#6366F1', CLIENTE: '#10B981' };

const createSchema = z.object({
  name: z.string().min(2, 'Nombre'),
  email: z.string().email('Correo inválido'),
  password: z.string().min(8, 'Mínimo 8').regex(/[A-Z]/, 'Una mayúscula').regex(/[a-z]/, 'Una minúscula').regex(/\d/, 'Un número'),
  role: z.enum(['CLIENTE', 'REPARTIDOR', 'ADMIN']),
});

export function UsuariosPage() {
  const queryClient = useQueryClient();
  const [role, setRole] = useState<'' | UserRole>('');
  const [open, setOpen] = useState(false);
  const users = useQuery({ queryKey: ['usuarios', role], queryFn: () => api.get<User[]>('/usuarios', { params: { role: role || undefined } }).then((r) => r.data) });
  const form = useForm<z.infer<typeof createSchema>>({ resolver: zodResolver(createSchema), defaultValues: { role: 'REPARTIDOR' } });

  const create = useMutation({
    mutationFn: (body: z.infer<typeof createSchema>) => api.post<User>('/usuarios', body).then((r) => r.data),
    onSuccess: (user) => {
      toast.success(user.role === 'REPARTIDOR' ? `${user.name} se agregó a la flota (vía evento)` : 'Usuario creado');
      setOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      setTimeout(() => queryClient.invalidateQueries({ queryKey: ['asignacion', 'flota'] }), 1500);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const toggle = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => api.patch(`/usuarios/${id}`, { active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['usuarios'] }),
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Usuarios"
        subtitle="Al crear un repartidor, el servicio de identidad publica un evento y el de despacho lo da de alta en la flota."
        actions={
          <Button onClick={() => setOpen(true)}>
            <UserPlus className="h-4 w-4" /> Nuevo usuario
          </Button>
        }
      />
      <div className="mb-4">
        <Segmented
          value={role}
          onChange={setRole}
          options={[
            { value: '', label: 'Todos' },
            { value: 'CLIENTE', label: 'Clientes' },
            { value: 'REPARTIDOR', label: 'Repartidores' },
            { value: 'ADMIN', label: 'Admins' },
          ]}
        />
      </div>
      {users.isLoading ? (
        <PageLoader />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-400">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Correo</th>
                <th className="px-4 py-3">Rol</th>
                <th className="px-4 py-3">Verificado</th>
                <th className="px-4 py-3">Último acceso</th>
                <th className="px-4 py-3">Activo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.data?.map((user) => (
                <tr key={user.id}>
                  <td className="px-4 py-3 font-semibold text-slate-800">{user.name}</td>
                  <td className="px-4 py-3 text-slate-500">{user.email}</td>
                  <td className="px-4 py-3">
                    <Badge color={ROLE_COLOR[user.role]}>{RoleLabels[user.role]}</Badge>
                  </td>
                  <td className="px-4 py-3">{user.emailVerified ? '✓' : '—'}</td>
                  <td className="px-4 py-3 text-slate-500">{dateTime(user.lastLoginAt)}</td>
                  <td className="px-4 py-3">
                    <Toggle checked={user.active} onChange={(active) => toggle.mutate({ id: user.id, active })} label="Activo" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title="Nuevo usuario">
        <form className="space-y-4" onSubmit={form.handleSubmit((values) => create.mutate(values))}>
          <Field label="Nombre" error={form.formState.errors.name?.message}>
            <Input {...form.register('name')} />
          </Field>
          <Field label="Correo" error={form.formState.errors.email?.message} hint="Tip: appprueba695+nombre@gmail.com llega a la misma bandeja">
            <Input type="email" {...form.register('email')} />
          </Field>
          <Field label="Contraseña" error={form.formState.errors.password?.message}>
            <Input type="password" {...form.register('password')} />
          </Field>
          <Field label="Rol">
            <Select {...form.register('role')}>
              <option value="REPARTIDOR">Repartidor</option>
              <option value="CLIENTE">Cliente</option>
              <option value="ADMIN">Administrador</option>
            </Select>
          </Field>
          <Button type="submit" className="w-full" loading={create.isPending}>
            Crear
          </Button>
        </form>
      </Modal>
    </div>
  );
}

interface AuditRow {
  id: string;
  requestId: string;
  userId: string | null;
  rol: string | null;
  metodo: string;
  ruta: string;
  status: number;
  ip: string | null;
  duracionMs: number;
  createdAt: string;
}

export function BitacoraPage() {
  const [page, setPage] = useState(1);
  const [soloErrores, setSoloErrores] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ['bitacora', page, soloErrores],
    queryFn: () => api.get<Paginated<AuditRow>>('/bitacora', { params: { page, soloErrores } }).then((r) => r.data),
    refetchInterval: 10_000,
  });

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Bitácora de accesos"
        subtitle="La escribe el API Gateway una sola vez para todo el sistema: escrituras, errores y lecturas sensibles."
        actions={
          <label className="flex items-center gap-2 text-sm text-slate-600">
            Sólo errores <Toggle checked={soloErrores} onChange={(v) => { setSoloErrores(v); setPage(1); }} />
          </label>
        }
      />
      {isLoading ? (
        <PageLoader />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-400">
              <tr>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Método</th>
                <th className="px-4 py-3">Ruta</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Rol</th>
                <th className="px-4 py-3">IP</th>
                <th className="px-4 py-3 text-right">ms</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {data?.items.map((row) => (
                <tr key={row.id} className="text-slate-600">
                  <td className="px-4 py-2 font-sans">{dateTime(row.createdAt)}</td>
                  <td className="px-4 py-2 font-bold">{row.metodo}</td>
                  <td className="max-w-80 truncate px-4 py-2">{row.ruta}</td>
                  <td className="px-4 py-2">
                    <span className={row.status >= 500 ? 'text-rose-600' : row.status >= 400 ? 'text-amber-600' : 'text-emerald-600'}>{row.status}</span>
                  </td>
                  <td className="px-4 py-2">{row.rol ?? 'anónimo'}</td>
                  <td className="px-4 py-2">{row.ip}</td>
                  <td className="px-4 py-2 text-right">{row.duracionMs}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {data && (
            <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
              <span>{data.total} registros</span>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" disabled={page === 1} onClick={() => setPage(page - 1)}>
                  Anterior
                </Button>
                <Button size="sm" variant="secondary" disabled={page * data.pageSize >= data.total} onClick={() => setPage(page + 1)}>
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Star } from 'lucide-react';
import { toast } from 'sonner';
import { MedioIcon } from '@/components/map/MedioIcon';
import { Card } from '@/components/ui/Card';
import { PageLoader } from '@/components/ui/Feedback';
import { Select } from '@/components/ui/Input';
import { PageHeader, Toggle } from '@/components/ui/Misc';
import { api, errorMessage } from '@/lib/apiClient';
import type { Repartidor } from '@/types/api';
import { useCatalogo, useMedios } from '@/features/pedidos/hooks/usePedidos';

export function FlotaPage() {
  const queryClient = useQueryClient();
  const { data: flota, isLoading } = useQuery({ queryKey: ['asignacion', 'flota'], queryFn: () => api.get<Repartidor[]>('/flota').then((r) => r.data) });
  const { data: medios = [] } = useMedios();
  const { data: catalogo } = useCatalogo();

  const update = useMutation({
    mutationFn: ({ id, ...body }: { id: string } & Record<string, unknown>) => api.patch<Repartidor>(`/flota/${id}`, body).then((r) => r.data),
    onMutate: async ({ id, ...body }) => {
      await queryClient.cancelQueries({ queryKey: ['asignacion', 'flota'] });
      const previous = queryClient.getQueryData<Repartidor[]>(['asignacion', 'flota']);
      queryClient.setQueryData<Repartidor[]>(['asignacion', 'flota'], (old) => old?.map((r) => (r.id === id ? { ...r, ...body } : r)));
      return { previous };
    },
    onError: (error, _v, context) => {
      queryClient.setQueryData(['asignacion', 'flota'], context?.previous);
      toast.error(errorMessage(error));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['asignacion', 'flota'] }),
  });

  if (isLoading) return <PageLoader />;
  return (
    <div className="animate-fade-up">
      <PageHeader title="Flota de repartidores" subtitle="Cambia el medio, la base o el turno; el algoritmo genético usa estos datos en la siguiente corrida." />
      <Card className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-400">
            <tr>
              <th className="px-4 py-3">Repartidor</th>
              <th className="px-4 py-3">Medio</th>
              <th className="px-4 py-3">Base</th>
              <th className="px-4 py-3">Carga</th>
              <th className="px-4 py-3">Entregas</th>
              <th className="px-4 py-3">En turno</th>
              <th className="px-4 py-3">Activo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {flota?.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3">
                  <p className="font-semibold text-slate-800">{r.nombre}</p>
                  <p className="text-xs text-slate-500">{r.email}</p>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <MedioIcon medio={r.medioId} className="h-5 w-5" />
                    <Select className="h-9 w-36" value={r.medioId} onChange={(e) => update.mutate({ id: r.id, medioId: e.target.value })}>
                      {medios.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.nombre}
                        </option>
                      ))}
                    </Select>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Select
                    className="h-9 w-52"
                    value={catalogo?.lugares.find((l) => l.nombre === r.baseNombre)?.id ?? ''}
                    onChange={(e) => {
                      const lugar = catalogo?.lugares.find((l) => l.id === e.target.value);
                      if (lugar) update.mutate({ id: r.id, baseNombre: lugar.nombre, baseLat: lugar.lat, baseLng: lugar.lng });
                    }}
                  >
                    <option value="">{r.baseNombre}</option>
                    {catalogo?.lugares.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.nombre}
                      </option>
                    ))}
                  </Select>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {r.cargaActual}/{r.medio.capacidadPaquetes}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  <span className="flex items-center gap-1">
                    {r.entregasCompletadas} · <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {r.calificacion}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Toggle checked={r.disponible} onChange={(v) => update.mutate({ id: r.id, disponible: v })} label="En turno" />
                </td>
                <td className="px-4 py-3">
                  <Toggle checked={r.activo} onChange={(v) => update.mutate({ id: r.id, activo: v })} label="Activo" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

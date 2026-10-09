import { useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CreditCard, Lock, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Input';
import { api, errorMessage, newIdempotencyKey } from '@/lib/apiClient';
import { money } from '@/lib/format';

const schema = z.object({
  numero: z
    .string()
    .transform((value) => value.replace(/\s/g, ''))
    .pipe(z.string().regex(/^\d{15,16}$/, 'Número de 16 dígitos')),
  titular: z.string().trim().min(3, 'Como aparece en la tarjeta'),
  expiracion: z.string().regex(/^(0[1-9]|1[0-2])\/\d{2}$/, 'MM/AA'),
  cvv: z.string().regex(/^\d{3,4}$/, 'CVV'),
});

type PaymentFields = z.input<typeof schema>;

const TEST_CARDS = [
  { numero: '4242 4242 4242 4242', label: 'Aprobada' },
  { numero: '4000 0000 0000 0002', label: 'Rechazada' },
  { numero: '4000 0000 0000 9995', label: 'Sin fondos' },
];

/**
 * Formulario de pago. La llave de idempotencia se genera UNA vez por intento
 * y se reutiliza si el usuario da doble clic o la red reintenta: el servidor
 * devuelve la misma respuesta y nunca cobra dos veces.
 */
export function PaymentForm({ folio, total, titular, onPaid }: { folio: string; total: number; titular?: string; onPaid?: () => void }) {
  const queryClient = useQueryClient();
  const keyRef = useRef(newIdempotencyKey());
  const form = useForm<PaymentFields>({
    resolver: zodResolver(schema),
    defaultValues: { numero: '4242 4242 4242 4242', titular: titular ?? '', expiracion: '12/29', cvv: '123' },
  });
  const { errors } = form.formState;

  const pay = useMutation({
    mutationFn: (values: z.output<typeof schema>) =>
      api.post('/pagos', { folio, tarjeta: values }, { headers: { 'Idempotency-Key': keyRef.current } }).then((r) => r.data),
    onSuccess: () => {
      toast.success('¡Pago confirmado! Buscando al mejor repartidor…');
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      queryClient.invalidateQueries({ queryKey: ['bff'] });
      onPaid?.();
    },
    onError: (error) => {
      toast.error(errorMessage(error));
      // Pago rechazado = intento terminado: el siguiente intento lleva llave nueva.
      keyRef.current = newIdempotencyKey();
    },
  });

  return (
    <form className="space-y-4" noValidate onSubmit={form.handleSubmit((values) => pay.mutate(values as unknown as z.output<typeof schema>))}>
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-ink-900 via-ink-800 to-accent-600 p-5 text-white shadow-pop">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-brand-500/30 blur-2xl" />
        <div className="flex items-center justify-between">
          <CreditCard className="h-7 w-7 text-brand-400" />
          <span className="text-xs font-semibold text-slate-300">Rumbo Pay · simulado</span>
        </div>
        <p className="mt-6 font-mono text-lg tracking-[0.2em]">{form.watch('numero') || '•••• •••• •••• ••••'}</p>
        <div className="mt-3 flex justify-between text-xs text-slate-300">
          <span className="uppercase">{form.watch('titular') || 'TITULAR'}</span>
          <span>{form.watch('expiracion')}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {TEST_CARDS.map((card) => (
          <button
            key={card.numero}
            type="button"
            onClick={() => form.setValue('numero', card.numero)}
            className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:border-brand-300"
          >
            {card.label} ·••{card.numero.slice(-4)}
          </button>
        ))}
      </div>

      <Field label="Número de tarjeta" error={errors.numero?.message}>
        <Input inputMode="numeric" autoComplete="cc-number" maxLength={19} {...form.register('numero')} />
      </Field>
      <Field label="Titular" error={errors.titular?.message}>
        <Input autoComplete="cc-name" {...form.register('titular')} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Vence" error={errors.expiracion?.message}>
          <Input placeholder="MM/AA" autoComplete="cc-exp" maxLength={5} {...form.register('expiracion')} />
        </Field>
        <Field label="CVV" error={errors.cvv?.message}>
          <Input type="password" inputMode="numeric" autoComplete="cc-csc" maxLength={4} {...form.register('cvv')} />
        </Field>
      </div>
      <Button type="submit" size="lg" className="w-full" loading={pay.isPending}>
        <Lock className="h-4 w-4" /> Pagar {money(total)}
      </Button>
      <p className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
        <ShieldCheck className="h-3.5 w-3.5" /> No guardamos tu tarjeta. Un doble clic nunca genera dos cargos.
      </p>
    </form>
  );
}

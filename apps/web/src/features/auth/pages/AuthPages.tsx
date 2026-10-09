import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useSearchParams } from 'react-router-dom';
import { Truck, UserRound, Wrench } from 'lucide-react';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Input';
import { useForgotPassword, useLogin, useRegister, useResendCode, useResetPassword, useVerifyEmail } from '../hooks/useAuthMutations';
import { codeSchema, loginSchema, registerSchema, resetSchema, type LoginForm, type RegisterForm, type ResetForm } from '../schemas/authSchemas';

const DEMO = [
  { label: 'Cliente', icon: UserRound, email: 'appprueba695@gmail.com', password: 'Cliente123!' },
  { label: 'Repartidor', icon: Truck, email: 'appprueba695+jorge@gmail.com', password: 'Repartidor123!' },
  { label: 'Admin', icon: Wrench, email: 'appprueba695+admin@gmail.com', password: 'Admin123!' },
];

export function LoginPage() {
  const login = useLogin();
  const form = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });
  const { errors } = form.formState;

  return (
    <AuthLayout title="Entra a Rumbo" subtitle="Registra envíos, síguelos en vivo y administra tu flota.">
      <form className="space-y-4" onSubmit={form.handleSubmit((values) => login.mutate(values))} noValidate>
        <Field label="Correo" error={errors.email?.message}>
          <Input type="email" autoComplete="email" placeholder="tu@correo.com" aria-invalid={!!errors.email} {...form.register('email')} />
        </Field>
        <Field label="Contraseña" error={errors.password?.message}>
          <Input type="password" autoComplete="current-password" placeholder="••••••••" aria-invalid={!!errors.password} {...form.register('password')} />
        </Field>
        <div className="flex justify-end">
          <Link to="/olvide" className="text-xs font-semibold text-brand-600 hover:underline">
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
        <Button type="submit" size="lg" className="w-full" loading={login.isPending}>
          Entrar
        </Button>
      </form>

      <div className="mt-7">
        <p className="mb-2 text-center text-[11px] font-bold uppercase tracking-wider text-slate-400">Cuentas de demostración</p>
        <div className="grid grid-cols-3 gap-2">
          {DEMO.map(({ label, icon: Icon, email, password }) => (
            <button
              key={label}
              type="button"
              onClick={() => login.mutate({ email, password })}
              className="flex flex-col items-center gap-1 rounded-xl border border-slate-200 bg-white py-3 text-xs font-semibold text-slate-600 transition hover:border-brand-300 hover:text-brand-600"
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-6 text-center text-sm text-slate-500">
        ¿No tienes cuenta?{' '}
        <Link to="/registro" className="font-semibold text-brand-600 hover:underline">
          Crea una gratis
        </Link>
      </p>
    </AuthLayout>
  );
}

export function RegisterPage() {
  const register = useRegister();
  const form = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) });
  const { errors } = form.formState;

  return (
    <AuthLayout title="Crea tu cuenta" subtitle="Te enviaremos un código de 6 dígitos para confirmar tu correo.">
      <form
        className="space-y-4"
        noValidate
        onSubmit={form.handleSubmit(({ confirm: _confirm, phone, ...values }) => register.mutate({ ...values, phone: phone || undefined }))}
      >
        <Field label="Nombre completo" error={errors.name?.message}>
          <Input autoComplete="name" aria-invalid={!!errors.name} {...form.register('name')} />
        </Field>
        <Field label="Correo" error={errors.email?.message}>
          <Input type="email" autoComplete="email" aria-invalid={!!errors.email} {...form.register('email')} />
        </Field>
        <Field label="Teléfono (opcional)" error={errors.phone?.message}>
          <Input inputMode="numeric" maxLength={10} placeholder="4431234567" {...form.register('phone')} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Contraseña" error={errors.password?.message}>
            <Input type="password" autoComplete="new-password" aria-invalid={!!errors.password} {...form.register('password')} />
          </Field>
          <Field label="Confírmala" error={errors.confirm?.message}>
            <Input type="password" autoComplete="new-password" aria-invalid={!!errors.confirm} {...form.register('confirm')} />
          </Field>
        </div>
        <Button type="submit" size="lg" className="w-full" loading={register.isPending}>
          Crear cuenta
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">
        ¿Ya tienes cuenta?{' '}
        <Link to="/login" className="font-semibold text-brand-600 hover:underline">
          Entra aquí
        </Link>
      </p>
    </AuthLayout>
  );
}

export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const email = params.get('email') ?? '';
  const verify = useVerifyEmail();
  const resend = useResendCode();
  const form = useForm<{ code: string }>({ resolver: zodResolver(codeSchema) });

  return (
    <AuthLayout title="Verifica tu correo" subtitle={<>Escribe el código que enviamos a <strong className="text-slate-700">{email}</strong>.</>}>
      <form className="space-y-4" noValidate onSubmit={form.handleSubmit(({ code }) => verify.mutate({ email, code }))}>
        <Field label="Código de 6 dígitos" error={form.formState.errors.code?.message}>
          <Input inputMode="numeric" maxLength={6} autoFocus className="h-14 text-center font-mono text-2xl tracking-[0.5em]" {...form.register('code')} />
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={verify.isPending}>
          Verificar
        </Button>
        <Button type="button" variant="ghost" className="w-full" loading={resend.isPending} onClick={() => resend.mutate(email)}>
          Reenviar código
        </Button>
      </form>
    </AuthLayout>
  );
}

export function ForgotPasswordPage() {
  const forgot = useForgotPassword();
  const form = useForm<{ email: string }>({ resolver: zodResolver(loginSchema.pick({ email: true })) });
  return (
    <AuthLayout title="Recupera tu acceso" subtitle="Te mandaremos un código para crear una contraseña nueva.">
      <form className="space-y-4" noValidate onSubmit={form.handleSubmit(({ email }) => forgot.mutate(email))}>
        <Field label="Correo" error={form.formState.errors.email?.message}>
          <Input type="email" autoComplete="email" {...form.register('email')} />
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={forgot.isPending}>
          Enviar código
        </Button>
        <Link to="/login" className="block text-center text-sm font-semibold text-slate-500 hover:text-slate-700">
          Volver a entrar
        </Link>
      </form>
    </AuthLayout>
  );
}

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const email = params.get('email') ?? '';
  const reset = useResetPassword();
  const form = useForm<ResetForm>({ resolver: zodResolver(resetSchema) });
  const { errors } = form.formState;
  return (
    <AuthLayout title="Nueva contraseña" subtitle={<>Código enviado a <strong className="text-slate-700">{email}</strong>.</>}>
      <form className="space-y-4" noValidate onSubmit={form.handleSubmit(({ code, password }) => reset.mutate({ email, code, password }))}>
        <Field label="Código" error={errors.code?.message}>
          <Input inputMode="numeric" maxLength={6} className="text-center font-mono tracking-[0.4em]" {...form.register('code')} />
        </Field>
        <Field label="Contraseña nueva" error={errors.password?.message}>
          <Input type="password" autoComplete="new-password" {...form.register('password')} />
        </Field>
        <Field label="Confírmala" error={errors.confirm?.message}>
          <Input type="password" autoComplete="new-password" {...form.register('confirm')} />
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={reset.isPending}>
          Guardar contraseña
        </Button>
      </form>
    </AuthLayout>
  );
}

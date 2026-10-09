import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ApiError, errorMessage } from '@/lib/apiClient';
import { authApi } from '../api/authApi';
import { homeFor, useAuth } from './AuthProvider';

export function useLogin() {
  const { setSession } = useAuth();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: authApi.login,
    onSuccess: ({ accessToken, user }) => {
      setSession(accessToken, user);
      toast.success(`¡Hola, ${user.name.split(' ')[0]}!`);
      navigate(homeFor(user.role), { replace: true });
    },
    onError: (error, variables) => {
      if (error instanceof ApiError && error.code === 'CORREO_NO_VERIFICADO') {
        toast.info('Primero verifica tu correo');
        navigate(`/verificar?email=${encodeURIComponent(variables.email)}`);
        return;
      }
      toast.error(errorMessage(error));
    },
  });
}

export function useRegister() {
  const navigate = useNavigate();
  return useMutation({
    mutationFn: authApi.register,
    onSuccess: (data) => {
      toast.success(data.codigoEnviado ? 'Te enviamos un código a tu correo' : 'Cuenta creada; pide el código de nuevo');
      navigate(`/verificar?email=${encodeURIComponent(data.email)}`);
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useVerifyEmail() {
  const navigate = useNavigate();
  return useMutation({
    mutationFn: authApi.verifyEmail,
    onSuccess: () => {
      toast.success('Correo verificado. Ya puedes entrar');
      navigate('/login');
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useResendCode() {
  return useMutation({
    mutationFn: authApi.resendCode,
    onSuccess: () => toast.success('Si la cuenta existe, te llegará un código nuevo'),
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useForgotPassword() {
  const navigate = useNavigate();
  return useMutation({
    mutationFn: authApi.forgotPassword,
    onSuccess: (_data, email) => {
      toast.success('Si el correo está registrado, te llegará un código');
      navigate(`/restablecer?email=${encodeURIComponent(email)}`);
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useResetPassword() {
  const navigate = useNavigate();
  return useMutation({
    mutationFn: authApi.resetPassword,
    onSuccess: () => {
      toast.success('Contraseña actualizada');
      navigate('/login');
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

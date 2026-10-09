import { api } from '@/lib/apiClient';
import type { User } from '@/types/api';

export interface LoginResponse {
  accessToken: string;
  user: User;
}

export const authApi = {
  login: (body: { email: string; password: string }) => api.post<LoginResponse>('/auth/login', body).then((r) => r.data),
  register: (body: { name: string; email: string; phone?: string; password: string }) =>
    api.post<{ email: string; codigoEnviado: boolean }>('/auth/registro', body).then((r) => r.data),
  verifyEmail: (body: { email: string; code: string }) => api.post('/auth/verificar-correo', body).then((r) => r.data),
  resendCode: (email: string) => api.post('/auth/reenviar-codigo', { email }).then((r) => r.data),
  forgotPassword: (email: string) => api.post('/auth/olvide-contrasena', { email }).then((r) => r.data),
  resetPassword: (body: { email: string; code: string; password: string }) =>
    api.post('/auth/restablecer-contrasena', body).then((r) => r.data),
  logout: () => api.post('/auth/logout').then(() => undefined),
};

/**
 * El access token vive SÓLO en memoria (no en localStorage) para que un
 * script inyectado no pueda robarlo. La sesión se recupera con la cookie
 * httpOnly del refresh token.
 */
let accessToken: string | null = null;
const listeners = new Set<(token: string | null) => void>();

export const tokenStore = {
  get: () => accessToken,
  set(token: string | null) {
    accessToken = token;
    listeners.forEach((listener) => listener(token));
  },
  subscribe(listener: (token: string | null) => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

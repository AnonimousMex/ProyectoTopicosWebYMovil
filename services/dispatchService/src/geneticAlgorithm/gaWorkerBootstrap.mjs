// Arranque del worker en desarrollo: registra el cargador de TypeScript (tsx)
// dentro del hilo y luego carga el worker real.
import { register } from 'tsx/esm/api';

register();
await import('./gaWorker.ts');

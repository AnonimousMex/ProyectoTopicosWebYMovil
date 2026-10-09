/**
 * Arranca todos los microservicios (y el frontend) en una sola terminal,
 * con prefijo de color por servicio. Uso: npm run dev   |   npm run dev:services
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const withoutWeb = process.argv.includes('--sin-web');

const processes: Array<{ name: string; dir: string; color: number }> = [
  { name: 'gateway', dir: 'services/apiGateway', color: 36 },
  { name: 'auth', dir: 'services/authService', color: 35 },
  { name: 'pedidos', dir: 'services/ordersService', color: 33 },
  { name: 'pagos', dir: 'services/paymentsService', color: 32 },
  { name: 'despacho', dir: 'services/dispatchService', color: 34 },
  { name: 'mapas', dir: 'services/mapsService', color: 96 },
  { name: 'ia', dir: 'services/aiService', color: 95 },
  { name: 'notif', dir: 'services/notificationsService', color: 93 },
  { name: 'stats', dir: 'services/analyticsService', color: 92 },
  { name: 'tracking', dir: 'services/trackingService', color: 94 },
  ...(withoutWeb ? [] : [{ name: 'web', dir: 'apps/web', color: 91 }]),
];

const width = Math.max(...processes.map((proc) => proc.name.length));
const children: ChildProcess[] = [];

for (const proc of processes) {
  const child = spawn('npm', ['run', 'dev'], {
    cwd: resolve(root, proc.dir),
    env: { ...process.env, FORCE_COLOR: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  children.push(child);
  const prefix = `\x1b[${proc.color}m${proc.name.padEnd(width)} │\x1b[0m `;
  const forward = (stream: NodeJS.ReadableStream, out: NodeJS.WriteStream) => {
    let buffer = '';
    stream.on('data', (chunk: Buffer) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) if (line.trim()) out.write(`${prefix}${line}\n`);
    });
  };
  forward(child.stdout!, process.stdout);
  forward(child.stderr!, process.stderr);
  child.on('exit', (code) => process.stdout.write(`${prefix}terminó (código ${code})\n`));
}

const shutdown = () => {
  for (const child of children) child.kill('SIGINT');
  setTimeout(() => process.exit(0), 1500);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

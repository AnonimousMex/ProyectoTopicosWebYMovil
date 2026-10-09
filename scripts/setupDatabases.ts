/**
 * Aplica las migraciones de cada microservicio en SU base de datos y genera
 * los clientes de Prisma. Uso: npm run db:setup
 */
import { execSync } from 'node:child_process';
import { resolve } from 'node:path';
import '../packages/shared/src/config/loadEnv.js';

const servicesWithDatabase = [
  'authService',
  'ordersService',
  'paymentsService',
  'dispatchService',
  'mapsService',
  'notificationsService',
  'analyticsService',
];

for (const service of servicesWithDatabase) {
  const cwd = resolve(import.meta.dirname, '..', 'services', service);
  console.log(`\n▸ ${service}`);
  execSync('npx prisma migrate deploy', { cwd, stdio: 'inherit', env: process.env });
  execSync('npx prisma generate', { cwd, stdio: 'inherit', env: process.env });
}
console.log('\n✓ Bases de datos listas');

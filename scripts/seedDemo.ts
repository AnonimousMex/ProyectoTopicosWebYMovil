/**
 * Datos de demostración coherentes entre TODAS las bases (cada servicio
 * conserva su propia base; este script sólo es una herramienta de arranque).
 * Uso: npm run db:seed      (borra y vuelve a crear los datos demo)
 */
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { Redis } from 'ioredis';
import '../packages/shared/src/config/loadEnv.js';
import { PrismaClient as AuthDb } from '../services/authService/src/generated/prisma/index.js';
import { PrismaClient as OrdersDb } from '../services/ordersService/src/generated/prisma/index.js';
import { PrismaClient as PaymentsDb } from '../services/paymentsService/src/generated/prisma/index.js';
import { PrismaClient as DispatchDb } from '../services/dispatchService/src/generated/prisma/index.js';
import { PrismaClient as MapsDb } from '../services/mapsService/src/generated/prisma/index.js';
import { PrismaClient as NotificationsDb } from '../services/notificationsService/src/generated/prisma/index.js';
import { PrismaClient as AnalyticsDb } from '../services/analyticsService/src/generated/prisma/index.js';
import { lugaresSeed, zonasSeed } from '../services/mapsService/prisma/seedData.js';
import { haversineKm, simulateStreetPolyline } from '../services/mapsService/src/geo/geoMath.js';

const auth = new AuthDb();
const orders = new OrdersDb();
const payments = new PaymentsDb();
const dispatch = new DispatchDb();
const maps = new MapsDb();
const notifications = new NotificationsDb();
const analytics = new AnalyticsDb();

// ---------- PRNG determinista ----------
let seed = 20261008;
const rand = () => {
  seed = (seed + 0x6d2b79f5) >>> 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const pick = <T>(items: readonly T[]): T => items[Math.floor(rand() * items.length)];
const between = (min: number, max: number) => min + rand() * (max - min);
const round = (value: number, digits = 2) => Number(value.toFixed(digits));

// ---------- Catálogos ----------
const MEDIOS = [
  { id: 'camioneta', nombre: 'Camioneta', descripcion: 'Carga grande y voluminosa; sufre con el tráfico.', icono: 'truck', color: '#6366F1', orden: 1, velocidadKmh: 28, sensibilidadTrafico: 1, costoBase: 55, costoPorKm: 9.5, costoPorKg: 1.2, costoOperativoKm: 6.5, pesoMaxKg: 800, volumenMaxL: 3000, distanciaMaxKm: 80, capacidadPaquetes: 10, emisionesGCO2Km: 210 },
  { id: 'motocicleta', nombre: 'Motocicleta', descripcion: 'Rápida en tráfico, ideal para paquetes pequeños.', icono: 'motorbike', color: '#F97316', orden: 2, velocidadKmh: 34, sensibilidadTrafico: 0.35, costoBase: 32, costoPorKm: 6.5, costoPorKg: 2, costoOperativoKm: 3.2, pesoMaxKg: 15, volumenMaxL: 70, distanciaMaxKm: 35, capacidadPaquetes: 6, emisionesGCO2Km: 75 },
  { id: 'bicicleta', nombre: 'Bicicleta', descripcion: 'Económica y sin emisiones para trayectos cortos.', icono: 'bicycle', color: '#22C55E', orden: 3, velocidadKmh: 16, sensibilidadTrafico: 0.1, costoBase: 22, costoPorKm: 5.5, costoPorKg: 3, costoOperativoKm: 1.6, pesoMaxKg: 8, volumenMaxL: 40, distanciaMaxKm: 9, capacidadPaquetes: 4, emisionesGCO2Km: 0 },
  { id: 'dron', nombre: 'Dron', descripcion: 'Vuelo directo sin tráfico; sólo paquetes ligeros.', icono: 'drone', color: '#06B6D4', orden: 4, velocidadKmh: 55, sensibilidadTrafico: 0, costoBase: 70, costoPorKm: 12, costoPorKg: 15, costoOperativoKm: 4.5, pesoMaxKg: 2.5, volumenMaxL: 8, distanciaMaxKm: 14, capacidadPaquetes: 2, emisionesGCO2Km: 18 },
];

const EXTRAS = [
  { id: 'SEGURO', nombre: 'Seguro de mercancía', descripcion: 'Cubre el valor declarado del paquete (2.5 %).', tipo: 'PORCENTAJE_VALOR', valor: 2.5, minimo: 15, orden: 1 },
  { id: 'URGENTE', nombre: 'Entrega urgente', descripcion: 'Prioridad máxima en la asignación (+35 %).', tipo: 'PORCENTAJE_TOTAL', valor: 35, minimo: 0, orden: 2 },
  { id: 'FRAGIL', nombre: 'Manejo frágil', descripcion: 'Empaque y manejo especial.', tipo: 'FIJO', valor: 39, minimo: 0, orden: 3 },
];

const lugar = (nombre: string) => {
  const found = lugaresSeed.find((item) => item[0] === nombre);
  if (!found) throw new Error(`Lugar no encontrado: ${nombre}`);
  return { nombre: found[0], direccion: `${found[2]}, ${found[3]}, ${found[4]} Morelia, Mich.`, lat: found[5], lng: found[6] };
};

const REPARTIDORES = [
  { nombre: 'Luis Hernández', alias: 'luis', medioId: 'camioneta', base: 'Mercado de Abastos' },
  { nombre: 'Mariana López', alias: 'mariana', medioId: 'camioneta', base: 'Ciudad Universitaria UMSNH' },
  { nombre: 'Jorge Ramírez', alias: 'jorge', medioId: 'motocicleta', base: 'Catedral de Morelia' },
  { nombre: 'Fernanda Torres', alias: 'fernanda', medioId: 'motocicleta', base: 'Plaza Las Américas' },
  { nombre: 'Diego Morales', alias: 'diego', medioId: 'motocicleta', base: 'Instituto Tecnológico de Morelia' },
  { nombre: 'Sofía Castillo', alias: 'sofia', medioId: 'bicicleta', base: 'Plaza Valladolid' },
  { nombre: 'Andrés Ruiz', alias: 'andres', medioId: 'bicicleta', base: 'Bosque Cuauhtémoc' },
  { nombre: 'Valeria Núñez', alias: 'valeria', medioId: 'dron', base: 'Paseo Altozano' },
];

const CLIENTES = [
  { nombre: 'Cliente Rumbo', email: 'appprueba695@gmail.com', phone: '4431234567' },
  { nombre: 'Ana García', email: 'appprueba695+ana@gmail.com', phone: '4439876543' },
  { nombre: 'Carlos Méndez', email: 'appprueba695+carlos@gmail.com', phone: '4435551212' },
  { nombre: 'Lucía Pérez', email: 'appprueba695+lucia@gmail.com', phone: '4437778899' },
];

const DESTINATARIOS = ['María Fernández', 'José Luis Ortega', 'Paola Jiménez', 'Ricardo Silva', 'Daniela Cruz', 'Miguel Ángel Rojas', 'Gabriela Soto', 'Hugo Vargas'];

function zonaDe(lat: number, lng: number): string {
  const urbanas = zonasSeed.filter((zona) => zona.id !== 'periferia');
  let best = urbanas[0];
  let ratio = Infinity;
  for (const zona of urbanas) {
    const r = haversineKm({ lat, lng }, { lat: zona.centroLat, lng: zona.centroLng }) / zona.radioKm;
    if (r < ratio) {
      ratio = r;
      best = zona;
    }
  }
  return ratio <= 1.6 ? best.id : 'periferia';
}

function pickPackage() {
  const roll = rand();
  if (roll < 0.5) return { pesoKg: round(between(0.3, 2.3), 1), dims: [25, 18, 8] };
  if (roll < 0.82) return { pesoKg: round(between(3, 11), 1), dims: [40, 30, 25] };
  if (roll < 0.96) return { pesoKg: round(between(16, 38), 1), dims: [60, 45, 40] };
  return { pesoKg: round(between(60, 140), 1), dims: [110, 70, 60] };
}

function medioPara(pesoKg: number, volumenL: number, km: number, zonas: string[]) {
  const factibles = MEDIOS.filter(
    (medio) =>
      pesoKg <= medio.pesoMaxKg &&
      volumenL <= medio.volumenMaxL &&
      km <= medio.distanciaMaxKm &&
      !(medio.id === 'dron' && zonas.includes('centro')) &&
      !(medio.id === 'bicicleta' && zonas.includes('periferia')),
  );
  // Preferencia realista: motos dominan, luego camioneta, bici y dron.
  const pesos: Record<string, number> = { motocicleta: 5, camioneta: 3, bicicleta: 2, dron: 1.2 };
  const total = factibles.reduce((sum, medio) => sum + pesos[medio.id], 0);
  let roll = rand() * total;
  for (const medio of factibles) {
    roll -= pesos[medio.id];
    if (roll <= 0) return medio;
  }
  return factibles[0] ?? MEDIOS[0];
}

function precio(medio: (typeof MEDIOS)[number], km: number, pesoKg: number, extras: string[], valorDeclarado: number) {
  const lineas = [
    { concepto: `Banderazo ${medio.nombre}`, monto: medio.costoBase },
    { concepto: `${km.toFixed(1)} km`, monto: round(medio.costoPorKm * km) },
    { concepto: `${pesoKg} kg`, monto: round(medio.costoPorKg * pesoKg) },
  ];
  let subtotal = lineas.reduce((sum, line) => sum + line.monto, 0);
  if (extras.includes('FRAGIL')) {
    lineas.push({ concepto: 'Manejo frágil', monto: 39 });
    subtotal += 39;
  }
  if (extras.includes('SEGURO')) {
    const monto = round(Math.max(15, valorDeclarado * 0.025));
    lineas.push({ concepto: 'Seguro de mercancía', monto });
    subtotal += monto;
  }
  if (extras.includes('URGENTE')) {
    const monto = round(subtotal * 0.35);
    lineas.push({ concepto: 'Entrega urgente', monto });
    subtotal += monto;
  }
  subtotal = round(subtotal);
  const iva = round(subtotal * 0.16);
  return { medio: medio.id, lineas, subtotal, iva, total: round(subtotal + iva) };
}

async function reset() {
  await auth.$transaction([auth.verificationCode.deleteMany(), auth.refreshToken.deleteMany(), auth.outboxEvent.deleteMany(), auth.user.deleteMany()]);
  await orders.$transaction([orders.orderStatusHistory.deleteMany(), orders.order.deleteMany(), orders.folioCounter.deleteMany(), orders.outboxEvent.deleteMany(), orders.processedEvent.deleteMany()]);
  await payments.$transaction([payments.payment.deleteMany(), payments.idempotencyKey.deleteMany(), payments.outboxEvent.deleteMany(), payments.processedEvent.deleteMany()]);
  await dispatch.$transaction([
    dispatch.envio.deleteMany(),
    dispatch.repartidor.deleteMany(),
    dispatch.medio.deleteMany(),
    dispatch.extra.deleteMany(),
    dispatch.optimizationRun.deleteMany(),
    dispatch.aiProviderConfig.deleteMany(),
    dispatch.medioDesempeno.deleteMany(),
    dispatch.setting.deleteMany(),
    dispatch.outboxEvent.deleteMany(),
    dispatch.processedEvent.deleteMany(),
  ]);
  await maps.$transaction([maps.lugar.deleteMany(), maps.zona.deleteMany(), maps.chaosConfig.deleteMany()]);
  await notifications.$transaction([notifications.notification.deleteMany(), notifications.emailLog.deleteMany(), notifications.processedEvent.deleteMany()]);
  await analytics.$transaction([analytics.eventLog.deleteMany(), analytics.orderFact.deleteMany(), analytics.auditLog.deleteMany(), analytics.optimizationFact.deleteMany()]);

  const redis = new Redis(process.env.REDIS_URL!);
  const keys = [...(await redis.keys('rumbo:*')), ...(await redis.keys('tracking:*')), ...(await redis.keys('ia:*'))];
  if (keys.length) await redis.del(...keys);
  await redis.quit();
}

async function main() {
  console.log('▸ Limpiando datos anteriores…');
  await reset();

  // ---------- Mapas ----------
  console.log('▸ Mapas simulados de Morelia');
  await maps.zona.createMany({ data: zonasSeed });
  await maps.lugar.createMany({
    data: lugaresSeed.map(([nombre, tipo, direccion, colonia, cp, lat, lng]) => ({
      nombre,
      tipo,
      direccion,
      colonia,
      cp,
      lat,
      lng,
      zonaId: zonaDe(lat, lng),
    })),
  });
  await maps.chaosConfig.create({ data: { id: 'mapas', caido: false, tasaFallo: 0, latenciaMs: 0 } });

  // ---------- Usuarios ----------
  console.log('▸ Usuarios (contraseñas: Admin123! / Cliente123! / Repartidor123!)');
  const [adminHash, clienteHash, repartidorHash] = await Promise.all([
    bcrypt.hash('Admin123!', 12),
    bcrypt.hash('Cliente123!', 12),
    bcrypt.hash('Repartidor123!', 12),
  ]);
  await auth.user.create({
    data: { name: 'Administración Rumbo', email: 'appprueba695+admin@gmail.com', passwordHash: adminHash, role: 'ADMIN', emailVerified: true, phone: '4430000000' },
  });
  const clientes = [];
  for (const cliente of CLIENTES) {
    clientes.push(
      await auth.user.create({
        data: { name: cliente.nombre, email: cliente.email, phone: cliente.phone, passwordHash: clienteHash, role: 'CLIENTE', emailVerified: true },
      }),
    );
  }
  const repartidores = [];
  for (const repartidor of REPARTIDORES) {
    const user = await auth.user.create({
      data: {
        name: repartidor.nombre,
        email: `appprueba695+${repartidor.alias}@gmail.com`,
        passwordHash: repartidorHash,
        role: 'REPARTIDOR',
        emailVerified: true,
      },
    });
    repartidores.push({ ...repartidor, id: user.id, email: user.email });
  }

  // ---------- Despacho ----------
  console.log('▸ Medios, extras, proveedores de IA y flota');
  await dispatch.medio.createMany({ data: MEDIOS });
  await dispatch.extra.createMany({ data: EXTRAS });
  await dispatch.aiProviderConfig.createMany({
    data: [
      { id: 'routeai', nombre: 'RouteAI Cloud', formato: 'JSON', prioridad: 1, timeoutMs: 1500 },
      { id: 'xmlbrain', nombre: 'XmlBrain Logistics', formato: 'XML', prioridad: 2, timeoutMs: 1500 },
      { id: 'interno', nombre: 'Modelo interno Rumbo', formato: 'OBJETO', prioridad: 3, timeoutMs: 500 },
    ],
  });
  await dispatch.setting.create({ data: { key: 'autoAsignacion', value: { activo: false, intervaloSeg: 120, ultimaEjecucion: null } } });
  for (const repartidor of repartidores) {
    const base = lugar(repartidor.base);
    await dispatch.repartidor.create({
      data: {
        id: repartidor.id,
        nombre: repartidor.nombre,
        email: repartidor.email,
        medioId: repartidor.medioId,
        disponible: true,
        baseNombre: base.nombre,
        baseLat: base.lat,
        baseLng: base.lng,
        calificacion: round(between(4.5, 5), 1),
      },
    });
  }

  // ---------- Historial de pedidos ----------
  console.log('▸ Historial de pedidos (21 días) en pedidos, pagos, despacho y estadísticas');
  const urbanos = lugaresSeed.filter(([, tipo]) => tipo !== 'Municipio');
  const now = Date.now();
  const year = new Date().getFullYear();
  let folioNumber = 0;
  const desempeno = new Map<string, { entregas: number; aTiempo: number; tardias: number }>();

  type Plan = { createdAt: Date; status: 'ENTREGADO' | 'CANCELADO' | 'FALLIDO' | 'PAGADO' | 'ASIGNADO' | 'PENDIENTE_PAGO'; cliente: (typeof clientes)[number]; forceMedio?: string; repartidorAlias?: string };
  const plans: Plan[] = [];

  const horas = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
  const pesoHora = [3, 5, 6, 6, 7, 8, 7, 6, 6, 7, 8, 6, 3];
  const pickHour = () => {
    let roll = rand() * pesoHora.reduce((a, b) => a + b, 0);
    for (let i = 0; i < horas.length; i += 1) {
      roll -= pesoHora[i];
      if (roll <= 0) return horas[i];
    }
    return 12;
  };
  for (let i = 0; i < 140; i += 1) {
    const daysAgo = Math.floor(Math.pow(rand(), 0.8) * 21) + 1;
    const date = new Date(now - daysAgo * 86_400_000);
    date.setHours(pickHour(), Math.floor(rand() * 60), 0, 0);
    const roll = rand();
    plans.push({
      createdAt: date,
      status: roll < 0.88 ? 'ENTREGADO' : roll < 0.96 ? 'CANCELADO' : 'FALLIDO',
      cliente: i % 3 === 0 ? clientes[0] : pick(clientes),
    });
  }
  // Pedidos de hoy y activos para la demo
  for (let i = 0; i < 9; i += 1) plans.push({ createdAt: new Date(now - between(2, 9) * 3_600_000), status: 'ENTREGADO', cliente: pick(clientes) });
  for (let i = 0; i < 7; i += 1) plans.push({ createdAt: new Date(now - between(5, 40) * 60_000), status: 'PAGADO', cliente: i < 2 ? clientes[0] : pick(clientes) });
  plans.push({ createdAt: new Date(now - 25 * 60_000), status: 'ASIGNADO', cliente: clientes[0], forceMedio: 'motocicleta', repartidorAlias: 'jorge' });
  plans.push({ createdAt: new Date(now - 18 * 60_000), status: 'ASIGNADO', cliente: clientes[1], forceMedio: 'camioneta', repartidorAlias: 'luis' });
  plans.push({ createdAt: new Date(now - 12 * 60_000), status: 'ASIGNADO', cliente: clientes[0], forceMedio: 'bicicleta', repartidorAlias: 'sofia' });
  plans.push({ createdAt: new Date(now - 6 * 60_000), status: 'PENDIENTE_PAGO', cliente: clientes[0] });
  plans.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  for (const plan of plans) {
    folioNumber += 1;
    const folio = `RB-${year}-${String(folioNumber).padStart(6, '0')}`;
    const orderId = randomUUID();
    let paquete = pickPackage();
    if (plan.forceMedio === 'bicicleta') paquete = { pesoKg: 1.4, dims: [25, 18, 8] };
    if (plan.forceMedio === 'motocicleta') paquete = { pesoKg: 3.2, dims: [30, 25, 15] };

    let origen = pick(urbanos);
    let destino = rand() < 0.93 ? pick(urbanos) : pick(lugaresSeed);
    while (destino === origen) destino = pick(urbanos);
    if (plan.forceMedio === 'bicicleta') {
      origen = lugaresSeed.find((l) => l[0] === 'Plaza Valladolid')!;
      destino = lugaresSeed.find((l) => l[0] === 'Mercado Independencia')!;
    }
    const o = { lat: origen[5], lng: origen[6] };
    const d = { lat: destino[5], lng: destino[6] };
    const recta = haversineKm(o, d);
    const km = round(recta * 1.32, 2);
    const volumenL = round((paquete.dims[0] * paquete.dims[1] * paquete.dims[2]) / 1000, 2);
    const zonas = [zonaDe(o.lat, o.lng), zonaDe(d.lat, d.lng)];
    const medio = plan.forceMedio ? MEDIOS.find((m) => m.id === plan.forceMedio)! : medioPara(paquete.pesoKg, volumenL, km, zonas);
    const extras = [rand() < 0.25 ? 'SEGURO' : null, rand() < 0.15 ? 'URGENTE' : null, rand() < 0.1 ? 'FRAGIL' : null].filter(Boolean) as string[];
    const valorDeclarado = extras.includes('SEGURO') ? Math.round(between(500, 8000)) : 0;
    const urgencia = extras.includes('URGENTE') ? 'CRITICA' : rand() < 0.25 ? 'ALTA' : 'NORMAL';
    const minutos = round((km / medio.velocidadKmh) * 60 * (1 + 0.35 * medio.sensibilidadTrafico) + 12, 1);
    const limiteMin = urgencia === 'CRITICA' ? 75 : urgencia === 'ALTA' ? 150 : 300;
    const fechaLimite = new Date(plan.createdAt.getTime() + limiteMin * 60_000);
    const esActivo = plan.status === 'PAGADO' || plan.status === 'ASIGNADO' || plan.status === 'PENDIENTE_PAGO';
    const limiteActivo = new Date(now + between(60, 240) * 60_000);
    const p = precio(medio, km, paquete.pesoKg, extras, valorDeclarado);
    const pagado = plan.status !== 'PENDIENTE_PAGO';
    const paidAt = pagado ? new Date(plan.createdAt.getTime() + between(1, 6) * 60_000) : null;
    const asignado = ['ENTREGADO', 'FALLIDO', 'ASIGNADO'].includes(plan.status) || (plan.status === 'CANCELADO' && rand() < 0.3);
    const repartidor = plan.repartidorAlias
      ? repartidores.find((r) => r.alias === plan.repartidorAlias)!
      : pick(repartidores.filter((r) => r.medioId === medio.id));
    const assignedAt = asignado && paidAt ? new Date(paidAt.getTime() + between(2, 10) * 60_000) : null;
    // ~88 % llega a tiempo; el resto se pasa de la fecha límite unos minutos.
    const llegaTarde = rand() < 0.12;
    const realDelivered =
      plan.status === 'ENTREGADO' && assignedAt
        ? new Date(
            Math.min(
              now - 60_000,
              llegaTarde
                ? Math.max(fechaLimite.getTime(), assignedAt.getTime()) + between(5, 40) * 60_000
                : Math.min(assignedAt.getTime() + Math.max(8, minutos * between(0.8, 1.3)) * 60_000, fechaLimite.getTime() - 60_000),
            ),
          )
        : null;
    const closedAt = plan.status === 'CANCELADO' || plan.status === 'FALLIDO' ? new Date((assignedAt ?? paidAt ?? plan.createdAt).getTime() + between(5, 30) * 60_000) : null;
    const tieneRepartidor = asignado && plan.status !== 'CANCELADO';

    const history: Array<{ from: string | null; to: string; at: Date; rol: string; motivo?: string }> = [{ from: null, to: 'PENDIENTE_PAGO', at: plan.createdAt, rol: 'CLIENTE' }];
    if (paidAt) history.push({ from: 'PENDIENTE_PAGO', to: 'PAGADO', at: paidAt, rol: 'SERVICE', motivo: 'Pago •••• 4242' });
    if (assignedAt && tieneRepartidor) history.push({ from: 'PAGADO', to: 'ASIGNADO', at: assignedAt, rol: 'SERVICE', motivo: `Algoritmo genético → ${repartidor.nombre} (${medio.id})` });
    if (plan.status === 'ENTREGADO' && realDelivered && assignedAt) {
      const pickup = new Date(assignedAt.getTime() + (realDelivered.getTime() - assignedAt.getTime()) * 0.35);
      const transit = new Date(assignedAt.getTime() + (realDelivered.getTime() - assignedAt.getTime()) * 0.45);
      history.push({ from: 'ASIGNADO', to: 'RECOLECTADO', at: pickup, rol: 'REPARTIDOR' });
      history.push({ from: 'RECOLECTADO', to: 'EN_CAMINO', at: transit, rol: 'REPARTIDOR' });
      history.push({ from: 'EN_CAMINO', to: 'ENTREGADO', at: realDelivered, rol: 'REPARTIDOR' });
    }
    if (plan.status === 'FALLIDO' && closedAt) {
      history.push({ from: 'ASIGNADO', to: 'RECOLECTADO', at: new Date(closedAt.getTime() - 20 * 60_000), rol: 'REPARTIDOR' });
      history.push({ from: 'RECOLECTADO', to: 'FALLIDO', at: closedAt, rol: 'REPARTIDOR', motivo: 'Nadie recibió en el domicilio' });
    }
    if (plan.status === 'CANCELADO' && closedAt) {
      history.push({ from: paidAt ? 'PAGADO' : 'PENDIENTE_PAGO', to: 'CANCELADO', at: closedAt, rol: 'CLIENTE', motivo: 'Ya no lo necesito' });
    }

    const cliente = plan.cliente;
    await orders.order.create({
      data: {
        id: orderId,
        folio,
        clienteId: cliente.id,
        clienteNombre: cliente.name,
        clienteEmail: cliente.email,
        status: plan.status,
        origenDireccion: `${origen[2]}, ${origen[3]}, ${origen[4]} Morelia, Mich.`,
        origenLat: o.lat,
        origenLng: o.lng,
        destinoDireccion: `${destino[2]}, ${destino[3]}, ${destino[4]} Morelia, Mich.`,
        destinoLat: d.lat,
        destinoLng: d.lng,
        destinatarioNombre: pick(DESTINATARIOS),
        destinatarioTelefono: `443${Math.floor(between(1000000, 9999999))}`,
        pesoKg: paquete.pesoKg,
        largoCm: paquete.dims[0],
        anchoCm: paquete.dims[1],
        altoCm: paquete.dims[2],
        volumenL,
        fragil: extras.includes('FRAGIL'),
        urgencia,
        fechaLimite: esActivo ? limiteActivo : fechaLimite,
        extras,
        valorDeclarado,
        medioPreferido: rand() < 0.4 ? medio.id : null,
        medioId: tieneRepartidor ? medio.id : null,
        repartidorId: tieneRepartidor ? repartidor.id : null,
        repartidorNombre: tieneRepartidor ? repartidor.nombre : null,
        sugerenciaMedio: medio.id,
        sugerenciaMotivo: medio.id === 'motocicleta' ? 'tráfico alto y paquete pequeño' : medio.id === 'camioneta' ? 'paquete pesado, requiere capacidad de carga' : medio.id === 'bicicleta' ? 'trayecto corto a bajo costo' : 'paquete ligero en vuelo directo',
        sugerenciaProveedor: pick(['routeai', 'routeai', 'xmlbrain', 'interno']),
        sugerenciaConfianza: round(between(0.62, 0.95), 3),
        distanciaKm: km,
        minutosEstimados: minutos,
        etaMinutos: tieneRepartidor ? round(minutos * between(0.9, 1.2), 1) : null,
        polilinea: simulateStreetPolyline(o, d),
        precio: p,
        total: p.total,
        createdAt: plan.createdAt,
        paidAt,
        assignedAt: tieneRepartidor ? assignedAt : null,
        deliveredAt: plan.status === 'ENTREGADO' ? realDelivered : null,
        closedAt,
        history: {
          create: history.map((item) => ({
            from: item.from as never,
            to: item.to as never,
            actorId: item.rol === 'CLIENTE' ? cliente.id : item.rol === 'REPARTIDOR' ? repartidor.id : 'sistema',
            actorRol: item.rol,
            motivo: item.motivo,
            createdAt: item.at,
          })),
        },
      },
    });

    if (paidAt) {
      const reembolsado = plan.status === 'CANCELADO';
      await payments.payment.create({
        data: {
          orderId,
          folio,
          clienteId: cliente.id,
          monto: p.total,
          status: reembolsado ? 'REEMBOLSADO' : 'ACREDITADO',
          marca: rand() < 0.6 ? 'Visa' : 'Mastercard',
          ultimos4: rand() < 0.6 ? '4242' : '4444',
          titular: cliente.name,
          referencia: `RP-${randomUUID().slice(0, 13).toUpperCase()}`,
          acreditadoOrderId: reembolsado ? null : orderId,
          createdAt: paidAt,
          refundedAt: reembolsado ? closedAt : null,
        },
      });
      const envioStatus = plan.status === 'ENTREGADO' ? 'COMPLETADO' : plan.status === 'PAGADO' ? 'EN_POOL' : plan.status === 'ASIGNADO' ? 'ASIGNADO' : 'CANCELADO';
      await dispatch.envio.create({
        data: {
          orderId,
          folio,
          clienteId: cliente.id,
          origenDireccion: `${origen[2]}, ${origen[3]} Morelia`,
          origenLat: o.lat,
          origenLng: o.lng,
          destinoDireccion: `${destino[2]}, ${destino[3]} Morelia`,
          destinoLat: d.lat,
          destinoLng: d.lng,
          pesoKg: paquete.pesoKg,
          volumenL,
          fragil: extras.includes('FRAGIL'),
          urgencia,
          fechaLimite: esActivo ? limiteActivo : fechaLimite,
          medioPreferido: null,
          extras,
          status: envioStatus,
          repartidorId: tieneRepartidor ? repartidor.id : null,
          medioId: tieneRepartidor ? medio.id : null,
          secuencia: tieneRepartidor ? 1 : null,
          etaMinutos: tieneRepartidor ? minutos : null,
          sugerenciaMedio: medio.id,
          sugerenciaMotivo: 'histórico',
          sugerenciaProveedor: 'interno',
          createdAt: paidAt,
          assignedAt: tieneRepartidor ? assignedAt : null,
          completedAt: plan.status === 'ENTREGADO' ? realDelivered : null,
        },
      });
    }

    const aTiempo = plan.status === 'ENTREGADO' && realDelivered ? realDelivered <= fechaLimite : null;
    if (plan.status === 'ENTREGADO') {
      const stats = desempeno.get(medio.id) ?? { entregas: 0, aTiempo: 0, tardias: 0 };
      stats.entregas += 1;
      if (aTiempo) stats.aTiempo += 1;
      else stats.tardias += 1;
      desempeno.set(medio.id, stats);
    }
    await analytics.orderFact.create({
      data: {
        orderId,
        folio,
        clienteId: cliente.id,
        status: plan.status,
        medioId: medio.id,
        urgencia,
        total: p.total,
        distanciaKm: km,
        fechaLimite,
        createdAt: plan.createdAt,
        paidAt,
        assignedAt: tieneRepartidor ? assignedAt : null,
        deliveredAt: plan.status === 'ENTREGADO' ? realDelivered : null,
        aTiempo,
        minutosEntrega: plan.status === 'ENTREGADO' && realDelivered && paidAt ? Math.round((realDelivered.getTime() - paidAt.getTime()) / 60_000) : null,
      },
    });
  }
  await orders.folioCounter.create({ data: { year, last: folioNumber } });
  await dispatch.medioDesempeno.createMany({
    data: [...desempeno.entries()].map(([medioId, stats]) => ({ medioId, ...stats })),
  });
  for (const repartidor of repartidores) {
    const entregas = await dispatch.envio.count({ where: { repartidorId: repartidor.id, status: 'COMPLETADO' } });
    await dispatch.repartidor.update({ where: { id: repartidor.id }, data: { entregasCompletadas: entregas } });
  }

  // Corridas históricas del algoritmo genético (para estadísticas)
  for (let i = 0; i < 12; i += 1) {
    const runId = randomUUID();
    const mejora = round(between(6, 24), 2);
    const createdAt = new Date(now - between(1, 20) * 86_400_000);
    const asignados = Math.floor(between(4, 14));
    const costo = round(between(400, 1400));
    await dispatch.optimizationRun.create({
      data: {
        id: runId,
        tipo: 'REAL',
        estado: 'COMPLETADA',
        parametros: { poblacion: 80, generaciones: 150 },
        costoTotal: costo,
        costoGreedy: round(costo / (1 - mejora / 100)),
        mejoraPct: mejora,
        generaciones: 150,
        duracionMs: Math.floor(between(300, 1400)),
        envios: asignados,
        vehiculos: 8,
        createdAt,
        finishedAt: createdAt,
        resumen: { asignados, sinAsignar: 0, violaciones: 0 },
      },
    });
    await analytics.optimizationFact.create({ data: { runId, tipo: 'REAL', asignados, costoTotal: costo, mejoraPct: mejora, createdAt } });
  }

  console.log(`\n✓ Listo: ${plans.length} pedidos, ${repartidores.length} repartidores, ${lugaresSeed.length} lugares.`);
  console.log('  Admin:       appprueba695+admin@gmail.com / Admin123!');
  console.log('  Cliente:     appprueba695@gmail.com / Cliente123!');
  console.log('  Repartidor:  appprueba695+jorge@gmail.com / Repartidor123!  (moto)');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await Promise.all([auth, orders, payments, dispatch, maps, notifications, analytics].map((client) => client.$disconnect()));
  });

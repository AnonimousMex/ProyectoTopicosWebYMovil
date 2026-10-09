# Rumbo · Plataforma de entregas inteligentes

Sistema web para una empresa de mensajería en Morelia: registrar pedidos y asignar cómo se entregan
(camioneta, motocicleta, bicicleta o dron) con un **algoritmo genético**, recomendaciones de **varios
proveedores de IA** intercambiables, **mapas simulados** (sin pagar la API de Google), pagos
idempotentes, seguimiento en tiempo real y correos reales desde `appprueba695@gmail.com`.

Las decisiones de diseño (qué patrón resuelve cada conflicto del enunciado y dónde está en el código)
están en **[DECISIONES.md](DECISIONES.md)**.

---

## Arranque rápido

Requisitos: Node 20.19+, Docker (Colima o Docker Desktop).

```bash
npm install            # instala todo el monorepo
npm run setup          # levanta Postgres + Redis, aplica migraciones y carga datos demo
npm run dev            # arranca los 10 microservicios + el frontend
```

Abre **http://localhost:5173**. En la pantalla de entrada hay botones para entrar con un clic:

| Rol | Correo | Contraseña |
|---|---|---|
| Administrador | `appprueba695+admin@gmail.com` | `Admin123!` |
| Cliente | `appprueba695@gmail.com` | `Cliente123!` |
| Repartidor (moto) | `appprueba695+jorge@gmail.com` | `Repartidor123!` |

Otros repartidores: `+luis`, `+mariana` (camioneta), `+fernanda`, `+diego` (moto), `+sofia`, `+andres` (bici),
`+valeria` (dron). Todos los correos `appprueba695+algo@gmail.com` llegan a la misma bandeja de Gmail.

Otros comandos: `npm test` (27 pruebas unitarias), `npm run db:seed` (reinicia los datos demo),
`npm run dev:services` (sólo backend), `npm run build:web`.

### Correo
`MAIL_DRIVER` en `.env`: `smtp` (Gmail con contraseña de aplicación, funciona en local), `relay`
(Google Apps Script por HTTPS, para Railway que bloquea SMTP) o `console`. Si un envío falla se
reintenta con espera exponencial; puedes verlo y reintentarlo en **Panel → Salud y resiliencia**.

---

## Guion de demostración (10 minutos)

1. **Cliente** → *Nuevo envío*: elige origen/destino del catálogo de Morelia, tamaño y extras.
   La IA responde p. ej. *«Motocicleta: tráfico alto y paquete pequeño»*; abre la flecha para ver la
   traza de proveedores (JSON de RouteAI, XML de XmlBrain, objeto del modelo interno).
2. Paga con `4242 4242 4242 4242`. Da doble clic: **no hay doble cargo** (Idempotency-Key + UNIQUE).
   Te llegan los correos «Recibimos tu pedido» y «Pago confirmado».
3. **Admin** → *Asignación* → **Optimizar y asignar**: el algoritmo genético evoluciona en vivo y
   asigna el pool; cliente y repartidor reciben correo.
4. **Repartidor** (el asignado) → *Recolectado* → *En camino*: el cliente ve la moto moverse en el
   mapa (SSE) y recibe correo; *Entregado* cierra el pedido.
5. **Admin** → *Algoritmo genético*: laboratorio con escenarios sintéticos (curva de aptitud,
   diversidad, histograma de población, cromosoma y rutas).
6. **Admin** → *Proveedores de IA* / *Salud y resiliencia*: tumba el mapa y las IA. Cotizar sigue
   respondiendo (estimación local + modelo interno) y consultar un pedido guardado no se ve afectado.
7. **Admin** → *Medios y tarifas*: cambia costos o crea un medio nuevo («patineta») sin tocar código.

Tarjetas de prueba: `4242…4242` aprobada · `4000 0000 0000 0002` rechazada · `4000 0000 0000 9995` sin fondos.

---

## Arquitectura

```
                         ┌──────────────── apps/web (React) ────────────────┐
                         │ App cliente · App repartidor · Panel web (admin) │
                         └───────────────────────┬──────────────────────────┘
                                                 │ /api (JWT en memoria + cookie httpOnly)
                              ┌──────────────────▼──────────────────┐
                              │ apiGateway :4000                    │  sesión, CORS, rate limit,
                              │ BFF (/api/bff) · tabla de rutas     │  bitácora, firma HMAC
                              └──┬──────┬──────┬──────┬──────┬──────┘
           ┌─────────────────────┘      │      │      │      └───────────────────────┐
     authService :4101   ordersService :4102  paymentsService :4103   dispatchService :4104
     (identidad)         (pedidos, PDF)       (cobros idempotentes)   (medios, IA, algoritmo genético)
                                                                        │           │
                                                            mapsService :4105   aiService :4106
                                                            (mapas simulados)   (IA externas simuladas)
     notificationsService :4107   analyticsService :4108   trackingService :4109
     (correo + campana, SSE)      (KPIs + bitácora)        (posición en vivo, SSE)

     Postgres :5440 — una base por servicio      Redis :6390 — bus de eventos (Streams) + tiempo real (Pub/Sub)
```

Cada servicio con base propia publica eventos con **Transactional Outbox**; los demás se suscriben al
bus (Redis Streams, consumer groups, reintentos y cola de mensajes muertos).

### Estructura de carpetas

```
IA/
├── apps/web/src/
│   ├── app/                 router
│   ├── components/          ui/ (Button, Card, Input…), layout/ (por rol), map/ (Leaflet)
│   ├── features/<módulo>/   api/ · hooks/ (queries y mutations) · components/ · pages/ · schemas/
│   ├── lib/                 apiClient (refresh automático), sse, format, tokenStore
│   └── types/
├── packages/shared/src/     contratos, bus de eventos, outbox, circuit breaker,
│                            cliente entre servicios, firma interna, plantilla de servicio
├── services/<servicio>/
│   ├── prisma/              schema.prisma + migraciones (su propia base)
│   └── src/
│       ├── config/  lib/    variables de entorno, infraestructura
│       ├── routes/          endpoints
│       ├── controllers/     HTTP ↔ servicio
│       ├── services/        lógica de aplicación
│       ├── schemas/         validación zod
│       ├── repositories/  domain/  presenters/  consumers/   (según el servicio)
│       └── server.ts
├── scripts/                 setupDatabases, seedDemo, devAll
└── docker-compose.yml
```

### Endpoints principales (vía gateway)

| Método | Ruta | Quién |
|---|---|---|
| POST | `/api/auth/registro` · `/verificar-correo` · `/login` · `/refresh` · `/logout` · `/olvide-contrasena` · `/restablecer-contrasena` | público |
| GET | `/api/bff/app/inicio` · `/api/bff/repartidor/inicio` · `/api/bff/panel/inicio` | según rol |
| POST | `/api/cotizaciones` | sesión |
| POST/GET | `/api/pedidos` · `/api/pedidos/:folio` · `/:folio/cancelar` · `/:folio/estado` · `/:folio/guia.pdf` | cliente / repartidor / admin |
| POST | `/api/pagos` (encabezado `Idempotency-Key`) | cliente |
| GET | `/api/seguimiento/:folio/stream` (SSE) | dueño del pedido |
| GET/POST | `/api/asignacion/pool` · `/optimizar` · `/auto` | admin |
| POST/GET | `/api/simulacion` · `/api/simulacion/:runId/stream` (SSE) | admin |
| GET/PATCH | `/api/medios` · `/api/extras` · `/api/flota` · `/api/ia/proveedores` | admin |
| GET | `/api/estadisticas/resumen` · `/api/bitacora` · `/api/reportes/pedidos?formato=csv` · `/api/sistema/salud` | admin |

### Seguridad
- JWT de acceso de 15 min **sólo en memoria** + refresh token rotativo en cookie `httpOnly; SameSite=Strict`
  con detección de reutilización (revoca la familia si alguien reusa un token robado).
- La sesión se valida **una vez** en el gateway; los servicios reciben la identidad firmada con HMAC y
  rechazan cualquier petición sin firma (aunque alguien encuentre su puerto).
- bcrypt (12 rondas), bloqueo tras 5 intentos fallidos, verificación de correo y recuperación con códigos
  de un solo uso (se guarda sólo su hash), rate limiting por IP, Helmet, CORS con lista blanca.
- Validación con zod en cada endpoint; Prisma (consultas parametrizadas); el precio se recalcula en el
  servidor; CSV con protección contra inyección de fórmulas; nunca se guarda el número de tarjeta.

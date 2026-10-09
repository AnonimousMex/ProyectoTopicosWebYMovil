# Decisiones de diseño

El enunciado advierte: *«si etiquetas todo como MVC o como hexagonal, no has descrito nada»*. Por eso
aquí cada conflicto tiene su propio diagnóstico, el patrón que lo resuelve y el archivo donde vive.

**Lo que debe quedarse quieto** —registrar el pedido y asignar una entrega— vive en `ordersService`
(`orderService.create`, máquina de estados) y en el motor genético de `dispatchService`. **Lo que
cambia** (medios, costos, tiempos, proveedores de IA, extras, quién se entera, cómo se pinta) entra por
datos en la base, por clases nuevas que se registran o por suscriptores nuevos; nunca editando lo quieto.

---

## 1. «¿Hay sesión?», bitácora y encabezado copiados en cuarenta archivos

**Diagnóstico:** preocupaciones transversales duplicadas en cada trámite.

**Solución:** *API Gateway* con una **cadena de responsabilidad** de middlewares (id de petición →
Helmet → CORS → límites → sesión → bitácora → proxy) y una **plantilla** (Template Method) para todos los
microservicios.

| Qué | Dónde |
|---|---|
| Validación del JWT, una sola vez en todo el sistema | `services/apiGateway/src/middleware/authenticate.ts` |
| Bitácora centralizada (evento → estadísticas) | `services/apiGateway/src/middleware/auditTrail.ts` |
| Tabla de rutas: un servicio nuevo = una línea | `services/apiGateway/src/config/routeTable.ts` |
| Identidad firmada HMAC hacia los servicios | `packages/shared/src/security/internalAuth.ts` |
| Plantilla común de servicio (seguridad, salud, errores) | `packages/shared/src/app/createServiceApp.ts` |
| Encabezado/menú una vez por rol en el frontend | `apps/web/src/components/layout/RoleLayouts.tsx` |

**La caducidad del token** vive en `ACCESS_TOKEN_TTL` (`.env`): cambiarla es tocar una variable.

## 2. El switch de doscientas líneas y las IA con formatos distintos

Son **dos problemas pegados**, y se separan:

### 2a. Cómo se planea cada medio → **Strategy + Registry (Factory)**
Cada medio es una clase con sus reglas: el dron vuela en línea recta y no entra a la zona de exclusión
del Centro Histórico; la bici no sale de la zona urbana; la moto no lleva frágiles pesados; la camioneta
sufre más el tráfico y tarda en estacionarse en el Centro. La secuencia de evaluación es un **Template
Method** en la clase base.

- `services/dispatchService/src/strategies/medios/medioStrategy.ts` (interfaz + plantilla)
- `camionetaStrategy.ts`, `motocicletaStrategy.ts`, `bicicletaStrategy.ts`, `dronStrategy.ts`
- `medioRegistry.ts`: **un medio nuevo dado de alta en el panel funciona sin código** con la
  estrategia genérica (sólo parámetros). Si necesita reglas propias se agrega una clase y se registra.
- El cotizador **y el algoritmo genético** usan la misma estrategia: ninguno conoce camionetas ni drones.

Los **costos y tiempos** (velocidad, banderazo, $/km, $/kg, alcance, capacidad) están en la tabla
`Medio` y se editan en *Panel → Medios y tarifas*.

### 2b. Cómo se traduce lo que dice la IA → **Adapter + Chain of Responsibility + Circuit Breaker**
El dominio sólo entiende `Sugerencia { medio, motivo }`. Cada proveedor tiene un adaptador:

| Proveedor (simulado en `aiService`) | Formato | Adaptador |
|---|---|---|
| RouteAI Cloud | JSON `route_hint`, `score`, `rationale_code` | `aiProviders/routeAiAdapter.ts` |
| XmlBrain Logistics | XML `<vehicle code="MC"/>` | `aiProviders/xmlBrainAdapter.ts` |
| Modelo interno | objeto `{ vehiculo, certeza, razones }` que aprende del desempeño real | `aiProviders/internalHeuristicProvider.ts` |

`services/aiSuggestionService.ts` pregunta en orden de prioridad (configurable en el panel); si uno
falla, tarda o su circuito está abierto, pasa al siguiente. Mañana llega otro proveedor: un adaptador
nuevo y una fila en `AiProviderConfig`.

### Extras (seguro, urgente, frágil) → **Decorator**
`services/dispatchService/src/pricing/`: la tarifa base se envuelve con un decorador por extra. El tipo
(`PORCENTAJE_VALOR`, `PORCENTAJE_TOTAL`, `FIJO`) decide el decorador, así que un extra nuevo creado
en el panel funciona sin código.

## 3. La plantilla del seguimiento ejecuta SQL y el reporte lo duplica

**Diagnóstico:** la vista conoce la bodega.

**Solución:** **Repository** (único lugar con consultas) + **Presenter** (el mismo pedido, pintado según
quién lo pide).

- `services/ordersService/src/repositories/orderRepository.ts` — todas las consultas de pedidos.
- `services/ordersService/src/presenters/orderPresenters.ts` — `app` (JSON mínimo), `panel` (detalle
  con mapa e historial), `reportRow` + `toCsv` (gerencia), `snapshot` (eventos).
- El reporte de gerencia (`GET /api/reportes/pedidos?formato=csv`) usa el mismo repositorio que el
  seguimiento; sólo cambia el presentador.
- La polilínea de la ruta se guarda al cotizar: pintar el mapa de un pedido no consulta a nadie más.

## 4. El cobro mezcla atomicidad y aviso; el doble clic no está pensado

**Diagnóstico:** tres responsabilidades en un script y ninguna protección contra repetición.

**Solución:**
1. **Transactional Outbox** — el cobro guarda el pago y el evento `pago.acreditado` en la **misma
   transacción**; un relay lo publica después (`packages/shared/src/events/outboxRelay.ts`).
2. **Observer distribuido** — pedidos, despacho, notificaciones, estadísticas y seguimiento reaccionan
   al evento por separado (Redis Streams, `packages/shared/src/events/eventBus.ts`). Si el correo
   falla, el envío ya existe: el correo queda en cola con reintentos exponenciales
   (`notificationsService/src/services/emailService.ts`).
3. **Idempotencia en dos capas** (`paymentsService/src/services/paymentService.ts`):
   - `Idempotency-Key`: el mismo intento repetido devuelve la respuesta guardada, sin cobrar.
   - `UNIQUE(acreditadoOrderId)`: aunque llegaran dos llaves distintas a la vez, la base impide dos
     cargos acreditados para el mismo pedido.
4. Consumidores idempotentes (`ProcessedEvent`) y cambios de estado con bloqueo optimista.
5. Cancelar un pedido pagado dispara el reembolso automático por evento.

## 5. App del cliente, app del repartidor y panel muestran el mismo pedido

**Diagnóstico:** cada cliente necesita otra forma de los datos y la app hacía doce peticiones.

**Solución:** **Backend For Frontend** en el gateway (`services/apiGateway/src/bff/bffService.ts`):
`/api/bff/app/inicio`, `/api/bff/repartidor/inicio`, `/api/bff/panel/inicio` arman cada pantalla en
**una** petición, en paralelo, y cada sección falla por separado (degradación parcial). Para el detalle,
`?vista=app` devuelve `{ folio, estado, eta }` y `?vista=panel` el detalle con mapa.

## 6. El mapa y la IA se caen y tumban lo que sí está en nuestra base

**Solución:** **Circuit Breaker + timeout + fallback** por colaborador
(`packages/shared/src/http/circuitBreaker.ts`, patrón State interno: cerrado → abierto → semiabierto).

- Mapa caído → estimación local (haversine × tortuosidad) marcada como `estimada`
  (`dispatchService/src/services/routeMetricsService.ts`).
- IA caída → siguiente proveedor; el modelo interno nunca depende de la red.
- Consultar un pedido guardado **no llama** al mapa ni a la IA: no puede quedarse en «la rueda».
- El catálogo de direcciones se descarga una vez y se filtra en el navegador.
- *Panel → Proveedores de IA* y *Salud y resiliencia* permiten tumbar cada colaborador en vivo y ver
  los circuitos abrirse (respuesta en ~5 ms en vez de esperar timeouts).

## 7. Event Sourcing, CQRS y Redux global para un PDF de guía

**Respuesta: no.** El trámite real es autenticar, consultar un pedido existente y generar un archivo.
Es **una función**: `ordersService/src/services/shippingLabelService.ts` (PDF con QR de rastreo).
La sesión ya la valida el gateway y la consulta ya existe en el repositorio. Agregar un event store o
un store global sólo para esto sería ceremonia, no madurez.

Tampoco se usó CQRS en general: el único modelo de lectura separado es el de estadísticas
(`analyticsService`), porque ahí sí hay un beneficio claro (KPIs sin cargar la base de pedidos).

---

## Otros patrones presentes

| Patrón | Dónde | Para qué |
|---|---|---|
| State | `ordersService/src/domain/orderStates.ts` | Transiciones válidas del pedido y quién puede pedirlas |
| Builder | `dispatchService/src/services/scenarioBuilder.ts` | Escenarios reproducibles para el laboratorio |
| Singleton por proceso | `*/src/lib/infrastructure.ts` | Prisma, bus y clientes HTTP compartidos |
| Factory | `notificationsService/src/mailers/mailerFactory.ts` | SMTP / relay HTTPS / consola según `MAIL_DRIVER` |
| Adapter | `paymentsService/src/gateways/paymentGateway.ts` | Pasarela simulada hoy; Stripe/Conekta mañana |
| Observer | `notificationsService/src/subscribers/*` | Cliente, repartidor y administración reaccionan a eventos |

## El algoritmo genético

`services/dispatchService/src/geneticAlgorithm/` — corre en un *worker thread* para no bloquear el
servicio y transmite cada generación por SSE.

- **Cromosoma:** lista de genes `(envío, vehículo)`; el orden de los genes es la secuencia de visita de
  cada vehículo (base → recoger → entregar → recoger …).
- **Aptitud:** costo operativo según la estrategia de cada medio + penalizaciones por llegar tarde
  (ponderadas por urgencia), por violar reglas del medio, por sobrecupo y por desbalance; pequeño bono
  si coincide con la sugerencia de la IA.
- **Operadores:** selección por torneo, cruce por orden (OX) que conserva permutaciones válidas,
  mutaciones de reasignación, intercambio, inversión y reubicación; elitismo.
- **Población inicial:** la solución voraz (cómo se haría en el Excel), soluciones guiadas por la IA y
  aleatorias. Por eso el resultado nunca es peor que el método voraz (probado en `tests/`).
- Usos: asignación real del pool (manual o automática cada N segundos) y laboratorio de simulación.

## Qué es simulado

- **Mapas:** catálogo de 57 lugares de Morelia con coordenadas aproximadas, 6 zonas con perfil de
  tráfico por hora y rutas tipo cuadrícula generadas de forma determinista. Las teselas son de
  OpenStreetMap (gratuitas). Reemplazable por Google/Mapbox escribiendo otro adaptador.
- **IA externas:** RouteAI (JSON) y XmlBrain (XML) en `aiService`, con latencia y fallas configurables.
- **Pagos:** pasarela con tarjetas de prueba y validación Luhn.
- **GPS del repartidor:** `trackingService` interpola su posición sobre la ruta (90 s acelerados).

Los correos **sí son reales** (Gmail `appprueba695@gmail.com`).

# Feature: Pagos con Square — checkout y confirmación de la cita

> **Estado:** 🔨 **La mitad de Next.js está construida** (2026-08-05): checkout, webhook, poll de
> estado y la pantalla de pago con el Web Payments SDK. **Falta la mitad de n8n** — WF5 no existe y
> WF3 no está publicado — y sin ella **el webhook responde `503` a propósito** (ver
> § *Qué pasa hoy si alguien paga*)
> **Última actualización:** 2026-08-05
> **Archivos:** `src/lib/square/{client,signature,webPayments}.ts` ·
> `src/services/{payment,checkout}.service.ts` · `src/app/api/v1/checkout/route.ts` ·
> `src/app/api/v1/webhooks/square/route.ts` · `src/app/api/v1/orders/[id]/status/route.ts` ·
> `src/components/features/payments/PaymentPanel/` · `src/types/{payment,square}.types.ts` ·
> `src/lib/validation/{checkout,square-webhook}.schema.ts`
> **Workflows de n8n:** `Leos Firm - Confirmar cita` (`5Tx6yxAmPBMghDBS`, listo sin publicar) +
> **uno nuevo**, `Leos Firm - Registrar pago`
> **Decisiones asociadas:** ADR-002 (el webhook es la verdad del pago) · ADR-006 (precios en el
> servidor) · ADR-009 (todos los servicios se cobran) · ADR-011 (la retención es un evento
> tentativo) · **ADR-013 y ADR-014 se proponen aquí**
> **Depende de:** [`scheduling.md`](./scheduling.md) — cuando esto empieza, ya hay un `eventId`
> tentativo · [`crm-sheets.md`](./crm-sheets.md) — la fila del lead ya existe en `agenda`

---

## Qué se construye

El último tramo del embudo: el visitante ya eligió día y hora, el slot está **apartado pero sin
pagar**, y ahora paga. Cuando Square confirma el cobro, la reserva tentativa se convierte en una cita
de verdad con enlace de Meet, y la fila del CRM avanza a `pagado`.

```
Ya existe: lead_id · eventId tentativo · fila del CRM en `agenda`
                            │
        ┌───────────────────▼───────────────────┐
        │ NAVEGADOR                             │
        │ Web Payments SDK tokeniza la tarjeta  │  la tarjeta NUNCA
        │             → sourceId                │  toca nuestro servidor
        └───────────────────┬───────────────────┘
                            ▼
        POST /api/v1/checkout   ← precio del catálogo, en centavos (ADR-006)
                            │      metadata: lead_id + event_id
                            ▼
                     Square cobra
                            │
        Square ──webhook payment.updated──▶ POST /api/v1/webhooks/square
                            │                    │ 1. verifica la firma HMAC
                            │                    │ 2. reclama el event_id (anti-replay)
                            │                    │ 3. responde 200
                            │                    └─ 4. y recién después trabaja:
                            ▼
              n8n WF3 «Confirmar cita»  ──▶  evento CONFIRMADO + Meet + correos
              n8n CRM stage='pagado'    ──▶  fila del lead completa
```

**El navegador nunca confirma nada** (ADR-002). Puede cerrarse en medio del pago: el webhook llega
igual y la cita se confirma sola.

---

## Los dos huecos que este documento cierra

La FASE 6 no estaba bloqueada por Square, sino por dos preguntas que Supabase respondía y que
quedaron sin dueño al congelarlo (ADR-010). Ninguna se puede improvisar al codear.

### Hueco 1 — ¿dónde se recuerda qué `event_id` ya se procesó?

`API_DOCS.md` lo dejó anotado como trabajo de esta fase. **Antes de elegir dónde guardarlo hay que
saber qué se rompe exactamente si no se guarda**, porque el diseño cambia según la respuesta.

**Un reintento de Square NO cobra dos veces.** El cobro ocurre en `POST /api/v1/checkout`, protegido
por el `idempotency_key` que exige Square en `CreatePayment`. Un webhook repetido no cobra: **informa
de un cobro que ya pasó**. Lo que duplica son los *efectos* de confirmar:

| Efecto duplicado | Daño real |
|---|---|
| Segundo PATCH con un `conferenceData.createRequest` nuevo | **Puede reemplazar el Meet ya enviado por correo.** El cliente se conecta a un enlace muerto |
| Segundo correo de confirmación | El cliente cree que tiene dos citas. Claudia recibe dos copias |
| Segunda escritura en el CRM | Inofensivo: es un upsert con los mismos valores |

Conclusión que ordena el diseño: **la guardia tiene que estar donde están los efectos, no solo en la
puerta.** Un registro de `event_id` en una hoja de cálculo es un log, no un candado — Google Sheets
no ofrece «escribe solo si no existe» de forma atómica, y tampoco lo ofrece el Data Table de n8n.

### Hueco 2 — el webhook de Square no sabe de qué cita habla

El cuerpo de `payment.updated` trae el pago: `payment_id`, `order_id`, `amount_money`, `status`. **No
trae `lead_id` ni `eventId`**, y sin base de datos no hay dónde mirarlos. Sin resolver esto, el
webhook sabe que alguien pagó y no sabe qué cita confirmar.

---

## ADR-013: la idempotencia la da el evento de Calendar; la hoja es el registro

**Fecha:** 2026-08-05 · **Estado:** propuesta — se copia a `02-architecture.md` al abrir la FASE 6

**Contexto.** El diseño original guardaba los `event_id` procesados en una tabla `webhook_events` de
Supabase, con una restricción `UNIQUE` haciendo el trabajo pesado. Sin base de datos, hay que separar
dos cosas que esa tabla resolvía juntas: **la exclusión mutua** y **el registro auditable**.

**Decisión.** Se separan, y cada una va donde puede cumplirse de verdad:

**1. La guardia atómica es la transición `tentative → confirmed` del propio evento de Calendar,
con `If-Match` sobre el ETag.**

El WF3 ya lee el evento antes de tocarlo. Se le añade que envíe el ETag leído en la cabecera
`If-Match` del PATCH. Si otra ejecución confirmó el evento en el intervalo, Google responde **412
Precondition Failed** y esa ejecución no hace nada. Es un *compare-and-swap* real, provisto por
Google, sin infraestructura nueva.

Encaja con lo que el proyecto ya decidió: Google Calendar es la única fuente de verdad de la
disponibilidad (ADR-003) y la retención vive ahí (ADR-011). **El estado que hay que proteger de
ejecutarse dos veces ya está guardado en Calendar** — no hacía falta inventarle un espejo.

**2. El registro es una pestaña `Pagos` en la MISMA hoja del CRM**, una fila por `event_id` de Square.

**Por qué la hoja y no el Data Table de n8n:**

- **La trampa del `drive.file` no reaparece.** El permiso de la credencial de Sheets es por archivo,
  y ese archivo —`1A2XY75na61fAcSGqM0F6mje_N_RZEZd-ISjardORr3I`— **lo creó la propia credencial**
  ([`crm-sheets.md`](./crm-sheets.md) § La hoja tiene que ser CREADA por la credencial). Una pestaña
  nueva dentro de él hereda ese permiso. Una hoja nueva o un almacén nuevo abrirían otra vez la
  discusión que costó una noche entera.
- **Claudia lo ve donde ya trabaja.** Un Data Table de n8n es invisible para ella; la hoja es su
  panel (ADR-010). Un pago atascado tiene que verse sin entrar a n8n.
- **Es el registro que la FASE 9 necesita.** Los reembolsos por cancelación (`context.md` §8) exigen
  saber qué se cobró, cuándo y con qué `payment_id`. Es lo que iba a guardar la tabla `orders`.
- **Ninguna de las dos opciones es atómica**, así que la elección se decide por visibilidad y por no
  añadir infraestructura. Por eso el candado real está en el punto 1.

**Consecuencias.**
- La pestaña `Pagos` es a la vez log, anti-replay de primera línea y **cola de reparación**: una fila
  en `recibido` que no avanza a `confirmado` es un cobro sin cita, y se ve de un vistazo.
- Es una hoja, no una base de datos: dos webhooks simultáneos podrían escribir dos filas para el
  mismo `event_id`. **No importa** — la segunda ejecución choca contra el 412 de Calendar y no
  produce ningún efecto. El registro puede tener un duplicado; la cita no.
- Hay que mantener a mano una pestaña más y sus encabezados, con la misma regla de siempre: **un
  encabezado mal escrito pierde el dato en silencio.**

---

## ADR-014: el contexto de la cita viaja dentro de la orden de Square

**Fecha:** 2026-08-05 · **Estado:** propuesta — se copia a `02-architecture.md` al abrir la FASE 6

**Contexto.** El hueco 2: el webhook recibe un pago y necesita `lead_id` y `eventId` para saber qué
confirmar. La tabla `orders` de Supabase era el puente entre ambos mundos.

**Decisión.** El contexto viaja **con el pago**, puesto por el servidor en `POST /api/v1/checkout`:

| Dónde | Qué | Por qué ahí |
|---|---|---|
| `Order.metadata` | `lead_id`, `event_id`, `service_slug` | Es el campo que Square ofrece para exactamente esto |
| `Payment.reference_id` | `lead_id` | Ancla redundante y **visible en el panel de Square**: Claudia puede cruzar un cobro con una fila del CRM sin ayuda de nadie. El UUID mide 36 caracteres y el límite del campo es 40 |

El webhook, tras verificar la firma, hace **`RetrieveOrder(order_id)`** y saca la metadata de ahí.

**La llamada extra a Square es deliberada, no un descuido.** Más allá de la firma, el cuerpo del
webhook no se usa como fuente de datos: el importe y el estado se releen de Square, y se comparan
contra `priceCents` del catálogo. Un webhook con firma válida sigue siendo un mensaje sobre el que no
tenemos control del contenido.

**Nada de PII entra en la metadata de Square.** Nombre, correo y teléfono **no** viajan ahí —
Square documenta la metadata como campo no apto para datos sensibles, y no hace falta: esos datos ya
están en la `description` del evento tentativo, que el WF3 lee de todos modos
([`scheduling.md`](./scheduling.md) § 2 · Reservar slot).

**Consecuencias.**
- `POST /api/v1/checkout` crea **orden + pago**, no solo un pago. Es un paso más que un
  `CreatePayment` pelado, y es el precio de no tener base de datos.
- **El contrato del WF3 cambia** respecto a lo escrito en `scheduling.md`: recibe `eventId` y los
  datos del pago, y toma nombre / correo / servicio del propio evento. `scheduling.md` ya previó que
  este contrato podía moverse — «es el único de los cuatro que todavía no tiene un consumidor
  escrito».
- **Mejora recomendada al WF2:** escribir además `extendedProperties.private` con `lead_id`,
  `service_slug`, `full_name` y `email`. Hoy esos datos están en la `description` como texto y hay
  que parsearlos; `extendedProperties` es un mapa clave-valor pensado para esto y no se ve en la UI
  del calendario. **Cuesta actualizar y republicar un workflow que ya funciona** (y eso resetea su
  credencial, § trampa conocida), así que queda como recomendación, no como bloqueante.

---

## La pestaña `Pagos`

Misma hoja, pestaña nueva llamada exactamente **`Pagos`** (el campo *Sheet* de n8n usa `By Name` y
distingue mayúsculas). Encabezados en la primera fila, **antes** de la primera ejecución, y **sin
tildes** por la misma razón que en `Leads`: son nombres de clave, no textos de UI.

| Encabezado | Campo del payload | Qué es |
|---|---|---|
| `Pago (Square)` | `payment_id` | **Clave del upsert.** Ver el aviso de abajo: no es el `event_id` |
| `ID de evento (Square)` | `square_event_id` | El `event_id` que reclamó la fila. Solo auditoría |
| `Recibido el` | `received_at` | Hora del servidor al aceptar el webhook |
| `Estado` | `status` | `recibido` · `confirmado` · `error` |
| `ID del lead` | `lead_id` | Cruza con la columna `ID` de la pestaña `Leads` |
| `Orden (Square)` | `order_id` | — |
| `Monto` | `amount_usd` | Lo que Square dice que se cobró, releído de Square |
| `Servicio (slug)` | `service_slug` | — |
| `Evento (Calendar)` | `calendar_event_id` | El `eventId` tentativo que se confirma |
| `Enlace de la reunion` | `meeting_url` | Lo devuelve el WF3 |
| `Detalle` | `detail` | Vacío si todo fue bien; el motivo si `status = error` |

> ⚠️ **La clave es `payment_id`, no `event_id` — corregido el 2026-08-05 al inspeccionar la
> suscripción real.** Square manda **dos eventos distintos por el mismo cobro** (`payment.created` y
> `payment.updated`), y **cada uno trae su propio `event_id`**. Una clave por `event_id` los dejaría
> pasar a los dos: dos filas, dos confirmaciones, dos correos. Por `payment_id` colapsan en una y el
> segundo se rechaza en el paso 5, antes de tocar el calendario.
>
> El `event_id` se guarda igual, en su columna, para poder rastrear cuál de los dos llegó primero.

**Los tres estados y qué significa cada uno para Claudia:**

| Estado | Significa | Qué hacer |
|---|---|---|
| `recibido` | Square cobró; la cita **todavía no** está confirmada | Si lleva minutos así, algo falló. Es la señal de alarma |
| `confirmado` | Cobrado, cita confirmada, Meet creado, correos enviados | Nada |
| `error` | Cobrado y **no** se pudo confirmar | Confirmar a mano o reembolsar. **Nunca dejarlo así** |

> **Una fila en `recibido` que no cambia es dinero cobrado sin cita entregada.** Es la única fila de
> todo el sistema que exige acción humana, y por eso está en la hoja que Claudia abre y no en un log
> del servidor.

### Lo que escribe la etapa `pagado` en la pestaña `Leads`

Las columnas ya existen; hasta hoy nadie las llenaba. Un `CrmPaymentRow` nuevo en
`src/types/crm.types.ts`, con la misma regla de siempre: **cada etapa escribe solo sus columnas**.

| Columna de `Leads` | Campo |
|---|---|
| `ID` · `Estado` · `Actualizado` | `lead_id` · `pagado` · `updated_at` |
| `Pago (Square)` | `payment_id` |
| `Monto pagado` | `amount_usd` |
| `Pagado el` | `paid_at` |
| `Enlace de la reunion` | `meeting_url` |

> ⚠️ **Corrección a [`crm-sheets.md`](./crm-sheets.md).** Su tabla de columnas atribuye
> `Enlace de la reunion` a la etapa `agenda`. Es imposible: el Meet lo crea el WF3 **después** del
> pago, y `CrmAppointmentRow` ni siquiera tiene ese campo. Pertenece a `pagado`. Corregirlo al
> implementar esta fase.

---

## Los endpoints

### `POST /api/v1/checkout`

Contrato en [`../API_DOCS.md`](../API_DOCS.md) § Checkout. Lo que este doc añade es **el orden de las
operaciones**, que no es negociable:

1. Rate limit por IP y validación Zod (`src/lib/validation/checkout.schema.ts`).
2. `getServiceBySlug(serviceSlug)` → si no existe, `404`. **El importe sale de `priceCents`**; un
   `amount` en el body se ignora sin comentarios (ADR-006).
3. `CreateOrder` con `metadata: { lead_id, event_id, service_slug }` y el line item del catálogo.
4. `CreatePayment` con `sourceId`, `orderId`, `referenceId: lead_id` y un **`idempotencyKey` por
   intento**, derivado de `lead_id + event_id + priceCents` — no un UUID nuevo por clic, o el doble
   clic deja de estar protegido.
5. Responder `201` con `{ orderId, status: "pending" }`. **La respuesta no confirma nada.**

> **El slot ya está apartado cuando esto se ejecuta.** Este endpoint no valida disponibilidad ni crea
> eventos: si llega sin `eventId`, es un error del cliente, no algo que compensar reservando aquí.

### `POST /api/v1/webhooks/square`

**La secuencia entera, y el porqué de cada paso:**

```
1. raw   = await request.text()          ← crudo. Parsear antes invalida la firma
2. sig   = (await headers()).get("x-square-hmacsha256-signature")   ← Next 16: await
3. verificar HMAC-SHA256 de (notificationUrl + raw) con timingSafeEqual
      firma inválida → 401 y NADA más
4. parsear. type ∉ {payment.created, payment.updated} o status ≠ "COMPLETED" → 200, sin trabajo
5. reclamar el payment_id en la pestaña Pagos (WF5) → si ya existía → 200, sin trabajo
6. responder 200
7. after(): RetrieveOrder → WF3 confirmar → CRM pagado → Pagos = confirmado
```

**Por qué el 200 va en el paso 6 y no al final.** Square corta a los ~10 segundos y los pasos 7 son
tres llamadas encadenadas (Square + dos webhooks de n8n, cada uno con 8 s de timeout en
`src/lib/n8n/client.ts`). Devolver el 200 antes evita que un WF3 lento se convierta en un reintento
de Square. El trabajo va en **`after()` de `next/server`** — disponible en Next 16, sin dependencias
nuevas.

**Lo que eso cuesta, dicho claro:** después del 200, Square ya no reintenta. Si el paso 7 falla, nadie
lo va a reintentar por nosotros — **por eso la fila queda en `recibido` y por eso es visible en la
hoja.** Es el mismo trato que el resto del proyecto: preferimos un fallo ruidoso en un sitio que
Claudia mira, antes que un reintento silencioso que confirme dos veces.

**Por qué el paso 4 acepta `payment.created` además de `payment.updated`.** Un cobro con tarjeta que
se completa de inmediato —que es el caso normal aquí— puede notificarse ya como `COMPLETED` en el
propio `payment.created`. Escuchar solo `updated` arriesga no confirmar nunca una cita ya pagada, que
es peor que procesar de más. Se filtra por **`status`**, no por el tipo de evento, y de los duplicados
se encarga el paso 5.

**Tres trampas de la verificación de firma:**

- **`notificationUrl` tiene que ser idéntica a la registrada en Square**, carácter por carácter —
  incluida la ausencia de barra final. **No** construirla desde `request.url`: detrás de un proxy
  puede llegar con otro host o esquema y la firma no cuadra nunca. Se arma con
  `${NEXT_PUBLIC_SITE_URL}/api/v1/webhooks/square`.
- **Sandbox y producción tienen claves de firma distintas.** Un `401` en cuanto se pasa a producción
  es casi siempre esto.
- **Los deploys de preview de Vercel tienen otra URL** y por lo tanto otra firma. La suscripción del
  webhook se registra contra el dominio estable de producción.

La verificación se implementa con `node:crypto` y `crypto.timingSafeEqual`, como manda
[`../03-security.md`](../03-security.md). El SDK trae `WebhooksHelper.verifySignature`, útil como
contraste al depurar, pero la regla del proyecto es la comparación en tiempo constante propia.

### `GET /api/v1/orders/[id]/status`

Polling corto desde la pantalla de «procesando». Sin base de datos, el estado se relee de Square y se
devuelve **reducido a lo mínimo**: `pending` · `paid` · `failed`. Nada de importes, marcas de tarjeta
ni identificadores internos.

> **Cambio al implementarlo (2026-08-05): lee el ESTADO DE LA ORDEN, no el del pago.** Este doc decía
> `RetrievePayment`, pero la ruta está indexada por `order_id` —es lo que `/checkout` devuelve— y
> llegar al pago desde ahí cuesta **dos** llamadas a Square por cada tick del poll. Una orden pasa a
> `COMPLETED` cuando queda totalmente pagada, que es exactamente la pregunta que hace la pantalla, y
> se responde con una sola llamada. `readPayment()` sigue existiendo y el webhook sí lo usa: ahí hacen
> falta el importe y la fecha, no solo un sí o un no.
>
> **Un fallo nuestro se responde `pending`, jamás `failed`.** El dinero puede haber salido; decirle a
> alguien que su pago falló porque nosotros no pudimos preguntar es la peor respuesta disponible.

**El `meetingUrl` no se devuelve por aquí.** Llega en el correo de confirmación que manda el WF3, y
así esta ruta no necesita leer nada del calendario ni de la hoja. La pantalla dice que el enlace va
por correo, que además es donde el cliente lo va a buscar el día de la cita.

---

## Los workflows de n8n

| # | Workflow | Estado | Qué hace |
|---|---|---|---|
| 3 | `Leos Firm - Confirmar cita` (`5Tx6yxAmPBMghDBS`) | Listo, **sin publicar** | tentativo → confirmado + Meet + correos |
| 5 | `Leos Firm - Registrar pago` (`PkwmwCia2wqQzXwG`) | **Creado 2026-08-05, sin publicar** | Reclama el `payment_id` y escribe la fila en `Pagos` |

### WF3 · Cambios aplicados el 2026-08-05 — **sin publicar todavía**

1. ✅ **Contrato nuevo** (ADR-014): entra `{ event_id, lead_id, payment_id, amount_usd, paid_at }` —
   **solo identificadores**. El nombre, el correo, el teléfono, el servicio y el huso del cliente se
   **leen del propio evento tentativo**: del `summary` (`RESERVA SIN PAGAR — <nombre>`) y de las
   líneas `Servicio:`, `Slug:`, `Telefono:`, `Correo:` y `Huso del cliente:` de la `description` que
   escribe el WF2. El `start` sale de `start.dateTime`.
2. ✅ **`If-Match` con el ETag** leído en un GET previo (ADR-013).
3. ✅ **Los dos HTTP usan `fullResponse` + `neverError`.** Es la decisión que hace viable todo lo
   anterior: así un **412 es un dato que se enruta**, no una excepción que tumba el flujo **sin
   responderle a nadie** — y un webhook sin respuesta es un `null` en Next.js, es decir una fila en
   `error` por algo que en realidad salió bien.
4. ✅ **404 en el primer GET tratado explícitamente**: el limpiador borró el slot mientras se pagaba.
   Responde `502` → Next.js deja la fila en `error`. Antes esto habría sido un timeout de 8 s.
5. ✅ **Bug de la descripción corregido** (`scheduling.md` § 2): el PATCH ahora reescribe la
   `description`, que seguía diciendo *"RESERVA SIN PAGAR… el limpiador la borra"* en citas ya
   pagadas.
6. Sigue vigente lo que ya estaba probado: `conferenceDataVersion=1`, la relectura del evento porque
   el Meet es asíncrono, `sendUpdates=none` en ambas llamadas, y el cambio de `summary` a
   `Consulta — …` que es **lo que saca al evento del filtro del limpiador**.

**Los cuatro caminos de salida:**

| Situación | Respuesta | Qué hace Next.js |
|---|---|---|
| Confirmada bien | `200 { meetingUrl }` | Fila `confirmado`, CRM a `pagado` |
| Ya estaba confirmada (llegó antes el otro aviso) | `200 { alreadyConfirmed: true, meetingUrl }` | Igual, **sin segundo correo** |
| **412** — otra ejecución ganó la carrera | `200 { alreadyConfirmed: true }` | Igual. Es la idempotencia funcionando |
| Evento borrado (404) o Google rechazó | `502` | `requestFromN8n` → `null` → fila en **`error`** |

> ⛔ **No se puede publicar hasta hacer esto a mano** (n8n no lo hace, y lo pierde en cada
> actualización desde el MCP):
> 1. Los **tres nodos HTTP** quedan **sin credencial**. Elegir `Google Calendar - Leos Firm` en los
>    tres.
> 2. El nodo de Gmail se auto-asignó **`api_gmail_aiinovate`** —la cuenta del equipo de desarrollo,
>    no la de la firma— exactamente el error que su nota advertía. Cambiarlo a `Gmail - Leos Firm`.

### WF5 · `Leos Firm - Registrar pago` — creado el 2026-08-05 (`PkwmwCia2wqQzXwG`)

Atiende las **dos** llamadas que le hace el webhook por cada cobro, y se ramifica por `status`:

```
Webhook POST /leos-firm/pago   (Header Auth, el mismo x-leosfirm-token, responseNode)
  → If «Es el primer aviso del pago»  ($json.body.status === 'recibido')
      sí → Sheets · lookup en `Pagos` por `Pago (Square)`   ⚠️ Always Output Data
           → If «Ya estaba registrado»
               sí → Respond { duplicate: true }
               no → Sheets appendOrUpdate (estado `recibido`) → Respond { duplicate: false }
      no → Sheets appendOrUpdate (estado `confirmado` | `error`) → Respond { ok: true }
```

**Tres decisiones que no se ven en el diagrama y sin las cuales no funciona:**

1. ⚠️ **`Always Output Data` en el nodo de búsqueda.** Sin eso, un pago que **no** está en la hoja
   hace que el nodo no devuelva **ningún** item: el flujo se corta ahí, nadie responde, y el webhook
   de Next.js espera hasta su timeout de 8 s y lo lee como «WF5 no respondió» → `503`. Y ese es el
   camino **normal**, no el raro: la primera vez que llega un pago la hoja siempre está vacía.
2. **El nodo de reclamo lee del webhook por nombre**
   (`$('Recibir pago de Square').item.json.body…`), no de `$json`. Después del lookup, `$json` es el
   resultado de la búsqueda —vacío en el caso normal—, así que un `$json.body.payment_id` escribiría
   una fila en blanco.
3. **El cierre NO mapea `Recibido el`.** Es un `appendOrUpdate` sobre la misma fila, y volver a
   escribir esa columna machacaría la hora del reclamo con la del cierre. Se pierde el único dato que
   dice cuánto tardó en confirmarse.

**Las credenciales quedaron asignadas solas** al crearlo: `Leos Firm - Token del sitio` (Header Auth)
y `api_sheet_aiinovate` (Google Sheets). No hay que reconectarlas a mano.

**Publicado y probado contra la hoja real el 2026-08-05**, los tres caminos, con
`payment_id = PRUEBA-BORRAR-001`:

| Prueba | Resultado |
|---|---|
| Primer aviso de un pago nuevo | Escribe la fila, responde `{ duplicate: false }` |
| **El mismo pago otra vez** (lo que Square hace SIEMPRE) | Encuentra la fila, responde `{ duplicate: true }`, **no escribe una segunda** |
| Cierre con `status: confirmado` | Actualiza **la misma** fila con lead, servicio, evento y Meet |
| El cierre **no** pisa `Recibido el` | Verificado con un centinela: se le mandó `9999-99-99-NO-DEBE-ESCRIBIRSE` en `received_at` y no llegó a la hoja |

> **El primer intento falló, y por eso se prueba.** La pestaña se había creado con los encabezados
> escritos a mano: se habían caído los seis paréntesis (`Pago` en vez de `Pago (Square)`) y una
> mayúscula (`Id del lead`). n8n respondió *"Column names were updated after the node's setup"* y
> **no escribió nada**. Sin esta prueba, ese error habría aparecido con el primer pago real.

**Ninguna variable de entorno nueva más allá de `N8N_PAYMENTS_WEBHOOK_URL`**, ya declarada. El token
es el que ya existe.

---

## El riesgo del limpiador borrando el slot mientras se paga — RESUELTO A MEDIAS

El reloj de la retención arranca cuando se crea el evento tentativo — es decir, **antes** de que el
visitante vea siquiera el formulario de tarjeta. Ese tiempo tiene que alcanzar para leer la política
de cancelación, buscar la tarjeta, teclearla y pasar un eventual 3-D Secure.

Si no alcanza, el WF4 borra el evento y el webhook llega a confirmar un evento que ya no existe:
**cobro hecho, slot perdido, `404` de Google.** Es el peor fallo posible de todo el sistema.

**Lo hecho (2026-08-05):**

1. ✅ **`SLOT_HOLD_MINUTES` = 30** en `src/constants/business.ts`, con el porqué escrito al lado.
   El costo es más basura en el calendario ante un abandono; el beneficio es no cobrar sin poder
   entregar.
2. ✅ **El webhook trata cualquier fallo de confirmación como `error`, nunca como éxito**: fila en
   `error` con el detalle y un `console.error` que empieza por `COBRADO SIN CONFIRMAR`. Hay que
   devolver el dinero o reagendar a mano, y alguien tiene que enterarse el mismo día.

> ⛔ **Falta la otra mitad, y es la que de verdad cierra el riesgo.** El `30` también vive **dentro
> del nodo Code del WF4** (`Leos Firm - Limpiar reservas vencidas`), que es la única copia fuera del
> repo ([`scheduling.md`](./scheduling.md)). **Mientras el WF4 siga en 10, el limpiador borra slots
> que el código cree retenidos durante 30 minutos** — el fallo que este apartado intenta evitar,
> exactamente igual que antes.

---

## La pantalla de pago

Vive dentro de `/agendar`, no en una ruta nueva: el visitante ya está ahí, con el horario apartado,
y mandarlo a otra página sería una oportunidad más de abandonar. `BookingFlow` tiene tres estados y
cada uno dice **solo** lo que puede sostener:

| Estado | Qué se ve | Qué NO se afirma |
|---|---|---|
| Horario apartado | Día y hora, el servicio, el aviso de que el espacio queda separado poco tiempo, y el formulario de tarjeta | Que exista una cita |
| Pago recibido | «Estamos confirmando tu cita» + el correo va en camino | Que la cita esté confirmada — el poll se agotó sin saberlo |
| Cita confirmada | «Tu cita está confirmada» + recibirás el correo con la confirmación y el enlace | — |

**El botón dice «Realizar pago».** Antes decía «Llamar y confirmar» y era un `tel:` — el rastro de
que el cobro en línea no existía.

**Los campos de tarjeta son iframes de Square**, servidos desde el dominio de Square. Por eso el SDK
se carga como `<script>` desde su CDN (`src/lib/square/webPayments.ts`) y no como paquete de npm: lo
que mantiene la tarjeta fuera de nuestro DOM, de nuestro bundle y del alcance de PCI es el origen de
esos iframes, y empaquetar el SDK no cambiaría eso. También evita una dependencia nueva
(Mandamiento I) — `react-square-web-payments-sdk` no se usa; los tipos que hacían falta están escritos
a mano en `src/types/square.types.ts`.

**Sandbox y producción tienen scripts distintos** (`sandbox.web.squarecdn.com` vs
`web.squarecdn.com`) y cargar el equivocado falla de forma confusa: el SDK carga y **después** rechaza
el Application ID. El entorno se deduce del prefijo del propio ID —`sandbox-sq0idb-` frente a
`sq0idp-`— en lugar de una variable `NEXT_PUBLIC_SQUARE_ENVIRONMENT`, porque dos valores que pueden
contradecirse son una forma de publicar un sitio en vivo apuntando a sandbox.

**3-D Secure (`verifyBuyer`) se intenta y su fallo NO es fatal.** La mayoría de las tarjetas
estadounidenses no se desafían, y negarse a cobrar porque un paso opcional se rompió perdería pagos
reales. Cuando el token hacía falta de verdad, Square rechaza con
`CARD_DECLINED_VERIFICATION_REQUIRED`, que ya tiene su mensaje en español.

**El poll no confirma nada y no puede.** Pregunta si el dinero entró; la cita la confirma el webhook
(ADR-002). Por eso la pantalla se puede cerrar en medio del pago sin perder nada.

---

## Qué pasa hoy si alguien paga

Con las credenciales de sandbox puestas y **sin WF5**, la secuencia real es:

```
tarjeta → /checkout → Square cobra ✅
        → webhook: firma verificada ✅
        → claimPaymentRow → N8N_PAYMENTS_WEBHOOK_URL no existe → null
        → 503 → Square reintenta durante 72 h
```

**Es el comportamiento correcto y es deliberado.** Sin WF5 no sabemos si ese pago ya se procesó, y
seguir adelante podría reemplazar un enlace de Meet ya enviado por correo (ADR-013). El `503` deja el
evento en la cola de reintentos de Square: **cuando WF5 exista y se publique, los pagos pendientes se
confirman solos**, sin tocar código y sin perder ninguno.

El mock tampoco lo tapa: `src/lib/n8n/mock.ts` **se niega** a simular `confirm` y `payments`. Una
confirmación falsa marcaría como pagada una cita que nadie pagó.

**Para cerrar la fase hacen falta, en este orden:** WF5 creado y publicado → WF3 con el contrato
nuevo, `If-Match` y publicado → la pestaña `Pagos` con sus 11 encabezados → el `30` dentro del WF4.

---

## Manejo de fallos

| Situación | Respuesta | Efecto |
|---|---|---|
| Firma inválida | `401` | Nada. Square reintenta 72 h |
| Falta `SQUARE_WEBHOOK_SIGNATURE_KEY` | `503` | No podemos **verificar** un pago que ya ocurrió. Un `200` tiraría la notificación para siempre; el `503` la deja en la cola de Square |
| **WF5 no responde o no existe** | `503` | Square reintenta. Sin el registro no sabemos si este pago ya se procesó, y seguir arriesga reemplazar un Meet ya enviado |
| Evento que no es `payment.updated` / `COMPLETED` | `200` | Nada |
| `payment_id` ya en `Pagos` | `200` | Nada |
| Monto distinto al del catálogo | `200` (ya enviado) | Fila en `error`. **No se confirma nada** |
| El evento ya estaba `confirmed` (412) | `200` | Nada. La idempotencia funcionó |
| El WF3 falla o no responde | `200` (ya enviado) | Fila en `error` + aviso. **Requiere una persona** |
| El evento tentativo ya no existe (404) | `200` (ya enviado) | Fila en `error`. Reembolso o reagenda manual |
| El CRM falla pero la cita se confirmó | `200` | Fila en `confirmado`, `Leads` sin actualizar. Se pierde el dato, no la cita |
| Tarjeta rechazada (en `/checkout`) | `402` | No hay webhook. El slot sigue apartado hasta que expire |

El criterio es el mismo que en `/leads` y `/appointments`: **un fallo nuestro nunca se convierte en
un fallo del visitante** — con una excepción explícita, la de arriba: cuando ya cobramos, callarse no
es una opción.

---

## Pruebas

**En sandbox, antes de tocar producción.** El token de sandbox no mueve dinero real.

| Qué probar | Cómo |
|---|---|
| Pago aprobado | Tarjeta de prueba de Square Sandbox (`4111 1111 1111 1111`, fecha futura, CVV `111`) |
| Pago rechazado | Los valores de rechazo de la doc de Square Sandbox — **verificarlos ahí, cambian** |
| Doble clic en «Pagar» | Dos veces seguidas: **un solo cobro** (`idempotencyKey`) |
| Replay del webhook | Reenviar el mismo evento desde el panel de Square: `200` y **cero** correos nuevos |
| Firma inválida | `curl` con una firma cualquiera → `401` |
| Slot borrado antes del pago | Borrar el evento a mano y confirmar: fila en `error`, no en `confirmado` |
| Huso horario del cliente | Con un huso realmente distinto (`Europe/Madrid`) — la prueba del WF3 quedó pendiente por eso |

> **El botón «Send test event» del panel de Square manda un evento sin orden real.** El handler debe
> responder `200` y no hacer nada, no reventar. Si revienta, el botón parece decir que el webhook
> está roto cuando el roto es el evento.

---

## Puesta en marcha

**Bloque A — la cuenta (la clienta, y tarda días).** Cuenta en `app.squareup.com` a nombre de
**Leos Firm LLC** con EIN y dirección de San Antonio, identidad verificada y cuenta bancaria de la
LLC vinculada. Es donde caen los depósitos: no puede ser una cuenta personal, misma lógica que
ADR-012.

**Bloque B — la aplicación (`developer.squareup.com`, mismo login).** *Create Application* →
`Leos Firm Web`. Con el toggle en **Sandbox**: *Credentials* da el Application ID y el Access Token;
*Locations* da el Location ID; *Webhooks → Subscriptions* registra
`https://<dominio>/api/v1/webhooks/square` con `payment.created`, `payment.updated`, `refund.created`
y `refund.updated`, y muestra la **Signature Key**. Al pasar a producción se repite entero: las
cuatro credenciales son distintas.

> ✅ **Sandbox resuelto y verificado por API el 2026-08-05** — no por captura de pantalla:
>
> ```
> GET /v2/locations              → 200 · LB2XHFGDVRJZJ «Default Test Account» ACTIVE USD US
> GET /v2/webhooks/subscriptions → 200 · «Leos Firm - pagos» enabled
>                                        notification_url: https://leos-firm.vercel.app/api/v1/webhooks/square
>                                        4 eventos · api_version 2026-07-15
> ```
>
> La `api_version` de la suscripción coincide con la que fija `square@45`, así que no hay desfase de
> versión entre lo que Square manda y lo que el SDK espera.
>
> ⚠️ **En local la firma no puede validar y es correcto:** `NEXT_PUBLIC_SITE_URL` es
> `http://localhost:3000`, así que el `notificationUrl` calculado no coincide con el registrado. El
> webhook se prueba **sobre el sitio desplegado**; Square no alcanza una máquina local de todos modos.

**Bloque C — las variables.** Ya están declaradas en `.env.example` y validadas en
`src/lib/env.ts`; falta llenarlas. Y como siempre: **también en Vercel, y volver a desplegar** —
Vercel no recoge variables nuevas en un despliegue ya hecho. Es la lección que ya costó tener el CRM
guardando cero leads en silencio.

| Variable | Público | De dónde sale |
|---|---|---|
| `NEXT_PUBLIC_SQUARE_APPLICATION_ID` | sí | Credentials |
| `NEXT_PUBLIC_SQUARE_LOCATION_ID` | sí | Locations |
| `SQUARE_ACCESS_TOKEN` | **no** | Credentials |
| `SQUARE_ENVIRONMENT` | config | `sandbox` \| `production` |
| `SQUARE_WEBHOOK_SIGNATURE_KEY` | **no** | Webhooks → la suscripción |
| `N8N_CONFIRM_WEBHOOK_URL` | **no** | Production URL del WF3 |
| `N8N_PAYMENTS_WEBHOOK_URL` | **no** | Production URL del WF5 |

**Bloque D — la hoja.** Crear la pestaña `Pagos` con sus 11 encabezados. Manual, como las dos
columnas de la FASE 5, y por el mismo motivo: el código no crea columnas.

---

## Restricciones

- **El importe se lee del catálogo, en centavos, en el servidor.** Un `amount` del cliente se ignora
  (ADR-006).
- **La tarjeta nunca toca nuestro servidor.** Web Payments SDK y `sourceId`. Jamás un formulario de
  tarjeta propio.
- **De Square solo se persisten** `payment_id`, `order_id`, `status`, `amount_usd` y `paid_at`.
  Nunca datos de tarjeta.
- **La cita no se confirma sin webhook verificado** (ADR-002). Ni la respuesta del navegador, ni la
  del `/checkout`, ni un `status` que llegue del cliente.
- **Ningún reembolso desde un endpoint público.** FASE 9, con la política §8 calculada en el servidor.
- **Ninguna etapa del CRM retrocede.** Un `agenda` tardío no puede degradar una fila `pagado`
  (`CRM_STAGE_ORDER`).
- **Nada de PII en la metadata de Square** ni en los logs del webhook: solo identificadores.

---

## Pendiente

- [x] **Credenciales de sandbox puestas y verificadas por API** (2026-08-05): application id, location
      id, access token y signature key. La suscripción `Leos Firm - pagos` está registrada y activa
- [x] `getSquareEnv()` en `src/lib/env.ts` — separado de `getServerEnv()` por la misma razón que n8n
- [x] `src/lib/square/client.ts` y `signature.ts`
- [x] `"confirm"` y `"payments"` en el tipo `N8nWebhook` + `N8N_PAYMENTS_WEBHOOK_URL`
- [x] `CrmPaymentRow` en `src/types/crm.types.ts`
- [x] `syncPaymentToCrm` en `src/services/crm.service.ts`
- [x] `POST /api/v1/checkout`, `POST /api/v1/webhooks/square`, `GET /api/v1/orders/[id]/status`
- [x] La pantalla de pago con el Web Payments SDK (`PaymentPanel`, dentro de `/agendar`)
- [x] `SLOT_HOLD_MINUTES` decidido: **30** — en `src/constants/business.ts`
- [x] `amount_money.amount` del SDK es un **`bigint`** y `JSON.stringify` lanza sobre él: todo importe
      sale por `centsToNumber` / `centsToUsdString`

### Lo que falta, y sin esto NO hay cobro funcionando

- [x] **WF5 `Leos Firm - Registrar pago` creado** (`PkwmwCia2wqQzXwG`), con credenciales asignadas
- [x] **Pestaña `Pagos` creada** con sus 11 encabezados (2026-08-05)
- [x] **WF5 publicado y probado de verdad** (2026-08-05): los tres caminos, contra la hoja real
- [ ] ⛔ **`N8N_PAYMENTS_WEBHOOK_URL` en Vercel** (y en `.env` local) =
      `https://aiwebhookn8n.growingup.digital/webhook/leos-firm/pago`. **Es el bloqueante nº 1 ahora.**
      Sin ella `requestFromN8n("payments")` devuelve `null` sin llamar a nadie, y el webhook de Square
      responde `503` igual que si el WF5 no existiera. Es la misma lección que ya costó tener el CRM
      guardando cero leads en silencio: **Vercel no recoge variables nuevas en un despliegue ya hecho**
- [ ] Borrar la fila de prueba `PRUEBA-BORRAR-001` de la pestaña `Pagos` (fila 2)
- [x] **WF3: contrato nuevo + `If-Match` + 404 explícito + bug de la descripción** (2026-08-05)
- [ ] ⛔ **Poner las credenciales del WF3 a mano y publicarlo.** Tres nodos HTTP sin credencial
      (`Google Calendar - Leos Firm`) y el de Gmail con la equivocada (`api_gmail_aiinovate` →
      `Gmail - Leos Firm`). **Es lo último que separa un cobro de una cita confirmada**
- [x] **WF1 `CRM de leads`: `Enlace de la reunion` movido de `agenda` a `pagado`** y publicado
      (2026-08-05). No era solo la corrección documental anotada: **era un dato que se perdía.**
      *Guardar pago confirmado* no mapeaba esa columna, así que el `meeting_url` de
      `syncPaymentToCrm` se descartaba; y *Guardar cita elegida* sí la mapeaba, contra un campo que
      `CrmAppointmentRow` no tiene — escribía vacío. El enlace de la videollamada no llegaba nunca a
      la hoja
- [ ] ⛔ **Poner `30` dentro del nodo Code del WF4**, o el limpiador borra slots a los 10 minutos
      mientras el código promete 30
- [ ] Probar de punta a punta **sobre el sitio desplegado** con la tarjeta de prueba de sandbox
      (`4111 1111 1111 1111`) — en local la firma no puede validar y es correcto
- [ ] **Cuenta de producción de Square** verificada y con banco vinculado — la clienta
- [ ] Copiar **ADR-013** y **ADR-014** a `docs/02-architecture.md`
- [ ] `NEXT_PUBLIC_SITE_URL` en Vercel = el dominio real, o la firma del webhook falla siempre
- [ ] Corregir en `crm-sheets.md` la etapa de `Enlace de la reunion`: es `pagado`, no `agenda`
- [ ] Cupón de referido del 100 % (FASE 10): **no pasa por Square**. Sin pago no hay webhook, así que
      la confirmación tendrá que dispararse desde `/checkout`. Diseñarlo entonces, no ahora

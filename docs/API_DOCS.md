# Documentación de API — Leos Firm LLC

**Base URL:** `/api/v1`
**Autenticación:** ver tabla por endpoint (el sitio público **no** usa JWT de cliente — ADR-001)
**Última actualización:** 2026-08-05
**Estado global:** `/health`, `/leads`, `/availability` y `/appointments` implementados. El resto se construye en las fases 6–10 de
[`00-roadmap.md`](./00-roadmap.md).

> **La superficie de API se redujo con ADR-010.** Varios endpoints planeados desaparecieron porque
> su trabajo lo hace n8n o porque dependían de Supabase. Están listados abajo con el motivo, para que
> nadie los reimplemente por inercia al leer un commit viejo.

> **Mandamiento III:** ningún endpoint existe sin su fila en el índice y su sección en este archivo.

---

## Modelo de Autenticación

| Tipo | Cómo | Se usa en |
|------|------|-----------|
| **Pública** | Sin credenciales, con rate limit por IP | Catálogo, disponibilidad, checkout |
| **Token de cita** | Token **firmado con HMAC** en la ruta, verificado en tiempo constante (ADR-016). No se guarda en ningún lado | Ver / cancelar / pedir otro horario para la propia cita |
| **Firma de webhook** | `x-square-hmacsha256-signature` verificada con HMAC en tiempo constante | Webhooks de Square |
| **Cron** | `Authorization: Bearer ${CRON_SECRET}` | Endpoints `/cron/*` |
| **Admin** | Cookie de sesión de Supabase Auth + rol en `admin_profiles` | Panel administrativo |

---

## Índice de Endpoints

> Las fases citadas son las de [`00-roadmap.md`](./00-roadmap.md) (reorganizado el 2026-08-03).

| Método | Ruta | Descripción | Auth | Estado |
|--------|------|-------------|------|--------|
| GET | `/api/v1/health` | Estado del servidor | Pública | ✅ Implementado |
| POST | `/api/v1/leads` | Registrar lead del diagnóstico → CRM | Pública + rate limit | ✅ Implementado |
| GET | `/api/v1/availability` | Slots libres (ocupados de Calendar ∩ horario) | Pública + rate limit | ✅ Implementado (mock de n8n) |
| POST | `/api/v1/appointments` | Reservar el slot (tentativo) + CRM `agenda` | Pública + rate limit | ✅ Implementado (mock de n8n) |
| POST | `/api/v1/checkout` | Crear orden y cobrar con Square | Pública + rate limit | ✅ Implementado |
| POST | `/api/v1/webhooks/square` | Confirmación de pago (fuente de verdad) | Firma HMAC | ✅ Implementado (**responde `503` hasta que exista el WF5**) |
| GET | `/api/v1/orders/[id]/status` | Polling del estado del pago | Pública + rate limit (id opaco) | ✅ Implementado |
| POST | `/api/v1/appointments/[token]/cancel` | Cancelar la propia cita (política §8) | Token firmado + rate limit | ✅ Implementado |
| POST | `/api/v1/appointments/[token]/reschedule-request` | Pedirle otro horario a Claudia. **No reagenda** | Token firmado + rate limit | ✅ Implementado |
| POST | `/api/v1/checkout/validate-coupon` | Validar un cupón de referido | Pública | ⏳ FASE 10 |

> **La cita se VE en una página, no en un endpoint.** No existe
> `GET /api/v1/appointments/[token]`: la página `/agendar/cita/[token]` es un Server Component que
> verifica el token y lee la cita él mismo. Un endpoint intermedio solo añadiría una superficie
> pública que devuelve datos de una cita ajena a quien acierte un token.
>
> Y no hay `PATCH`: reprogramar de verdad quedó **fuera del alcance** de la FASE 9
> ([`features/appointment-management.md`](./features/appointment-management.md)).

### Endpoints eliminados del plan

| Ruta | Por qué |
|------|---------|
| `GET /api/v1/services`, `/services/[slug]` | El catálogo vive en constantes y se prerrenderiza. Sin Supabase no hay nada que servir por API (ADR-007, ADR-010) |
| `POST /api/v1/agent/intake-schema` | La clienta descartó el agente de IA en el flujo de agendamiento |
| `POST /api/v1/intake`, `/intake/documents` | El diagnóstico ya captura lo que el intake preguntaba. Los adjuntos requerían Storage de Supabase |
| `POST /api/v1/availability/hold` | La retención es el propio evento tentativo en Calendar (ADR-011), no una tabla |
| `GET /api/v1/cron/*` | Los cron los ejecuta n8n con su Schedule Trigger, no Vercel |
| `GET/PATCH/POST /api/v1/admin/*` | La hoja de Google **es** el panel de administración (ADR-010) |

---

## Formato de Respuestas

### Exitosa
```json
{ "data": { }, "message": "Operación exitosa" }
```

### Paginada
```json
{
  "data": [],
  "pagination": { "page": 1, "limit": 20, "total": 100, "totalPages": 5 }
}
```

### Error
```json
{
  "error": "VALIDATION_ERROR",
  "message": "Mensaje amigable, en español, apto para mostrar al usuario",
  "details": { "email": "Correo electrónico inválido" }
}
```

> **Regla (`03-security.md`):** `message` nunca contiene stack traces, SQL ni detalles internos.
> El error completo se loguea en el servidor; al cliente le llega el mensaje amigable.

---

## Endpoints

### Health Check ✅

**`GET /api/v1/health`** — Pública

**Response 200**
```json
{ "status": "ok", "timestamp": "2026-08-02T15:30:00.000Z", "version": "0.1.0" }
```

---

### Leads del Diagnóstico ✅

**`POST /api/v1/leads`** — Pública · rate limit 5 peticiones / 10 min por IP

Registra un contacto capturado por el diagnóstico gratuito, **antes de cualquier pago** (ADR-008).
Feature: [`features/lead-diagnostic.md`](./features/lead-diagnostic.md)

**Request**
```json
{
  "leadId": "3f1c8a9e-77b4-4c21-9a2e-0d5b6f8c1234",
  "fullName": "Ana Rivera",
  "email": "ana@ejemplo.com",
  "phone": "+52 55 1234 5678",
  "country": "México",
  "consent": true,
  "steps": [
    { "questionId": "situacion", "optionId": "con-entidad" },
    { "questionId": "objetivo-con-entidad", "optionId": "nomina" },
    { "questionId": "urgencia", "optionId": "este-mes" }
  ],
  "recommendedServiceSlug": "payroll",
  "viewedServiceSlug": "payroll",
  "sourcePath": "/servicios/payroll"
}
```

Reglas:
- `leadId` es un UUID que **acuña el navegador** y es la clave de la fila del CRM. Viaja después al
  agendamiento y al pago para que las tres etapas actualicen **una sola fila**
  ([`features/crm-sheets.md`](./features/crm-sheets.md)). Es opaco y no otorga acceso a nada.
- `consent` debe ser `true`; se guarda con `consent_at` y `consent_ip` como evidencia.
- El esquema Zod es el **mismo** que corre el formulario (`src/lib/validation/lead.schema.ts`).
- `email` se normaliza a minúsculas en el servidor.
- **El precio y el nombre del servicio los resuelve el servidor** leyendo el catálogo por el slug.
  El cliente no manda montos (ADR-006).
- `outcome` **fue eliminado** (ADR-009): ya no hay dos ramas.

**Response 201**
```json
{
  "data": {
    "received": true,
    "leadId": "3f1c8a9e-77b4-4c21-9a2e-0d5b6f8c1234",
    "recommendedServiceSlug": "payroll",
    "delivery": "delivered"
  },
  "message": "Datos recibidos"
}
```

`delivery` es `"delivered"` o `"failed"`. **Un fallo del CRM no cambia el código de estado**: el
endpoint responde `201` igual, porque el visitante no tiene la culpa de que n8n esté caído y no debe
ver un error. La UI usa `delivery` para decidir si muestra el teléfono de la firma como alternativa.

**Errores:** `400 VALIDATION_ERROR` (con `details` por campo) · `429 RATE_LIMITED` (con
`Retry-After`)

---

### Disponibilidad y citas ✅ (contra mock de n8n)

Diseño completo en [`features/scheduling.md`](./features/scheduling.md).

> ⚠️ **Implementados y funcionando, pero los datos todavía no son reales.** Sin
> `N8N_AVAILABILITY_WEBHOOK_URL` / `N8N_BOOKING_WEBHOOK_URL` y fuera de producción, ambos responden
> con un **mock local**. En producción sin esas variables responden `502` — nunca horarios
> inventados.

**`GET /api/v1/availability?from=2026-08-10&to=2026-08-31&tz=America/Mexico_City&servicio=payroll`**
— Pública · rate limit 60 peticiones / 10 min por IP · `Cache-Control: no-store`

Pide a n8n los ocupados del rango, los cruza con `BUSINESS_HOURS` y devuelve los slots libres en
UTC, agrupados por **el día del huso del visitante**. Los eventos **tentativos también ocupan**
(ADR-011); los cancelados y los marcados «Libre», no.

| Parámetro | Obligatorio | Notas |
|-----------|-------------|-------|
| `from`, `to` | sí | `YYYY-MM-DD`. Rango recortado a 31 días si se pide más |
| `tz` | no | Huso IANA del visitante. Sin él, todo se calcula y muestra en Central |
| `servicio` | no | Slug del catálogo; fija la duración del slot. Sin él, 60 min |

**Response 200**
```json
{
  "data": {
    "clientTimezone": "America/Mexico_City",
    "businessTimezone": "America/Chicago",
    "days": [
      { "day": "2026-08-10", "slots": [] },
      { "day": "2026-08-11", "slots": [
        { "startUtc": "2026-08-11T14:00:00.000Z", "endUtc": "2026-08-11T15:00:00.000Z" }
      ]}
    ],
    "nextAvailableFrom": "2026-08-11"
  },
  "message": "Disponibilidad consultada"
}
```

**Todos** los días del rango vienen, incluidos los llenos con `slots: []` — la rejilla del
calendario necesita pintarlos como "sin cupo", y que faltara la clave sería indistinguible de un día
fuera de rango. `nextAvailableFrom` es el primer día con hueco, o `null` si el rango entero está
lleno.

**Errores:** `400 VALIDATION_ERROR` · `429 RATE_LIMITED` · **`502 UPSTREAM_ERROR`** (n8n no
respondió — el mensaje invita a llamar por teléfono)

---

**`POST /api/v1/appointments`** — Pública · rate limit 5 peticiones / 10 min por IP

Revalida el slot contra ocupados **frescos**, crea el evento **tentativo** vía n8n (ADR-011) y
avanza la fila del CRM a `stage='agenda'`.

**Request**
```json
{
  "leadId": "3f1c8a9e-77b4-4c21-9a2e-0d5b6f8c1234",
  "serviceSlug": "payroll",
  "startUtc": "2026-08-11T15:00:00.000Z",
  "clientTimezone": "America/Mexico_City",
  "fullName": "Ana Rivera",
  "email": "ana@ejemplo.com",
  "phone": "+52 55 1234 5678",
  "policyAccepted": true
}
```

Reglas:
- `startUtc` **debe venir en UTC** (`...Z`). Aceptar un offset dejaría que el navegador decida qué
  significa "las 9:00".
- La duración y el nombre del servicio los resuelve el servidor leyendo el catálogo por el slug
  (ADR-006). El cliente no manda ni duración ni monto.
- **`policyAccepted` es lo único que viaja de la aceptación.** `policy_accepted_at` y la IP los
  estampa el servidor: una evidencia que el cliente puede escribir no es una evidencia
  (`context.md` §8.9).

**Response 201**
```json
{
  "data": {
    "eventId": "abc123def456",
    "startUtc": "2026-08-11T15:00:00.000Z",
    "endUtc": "2026-08-11T16:00:00.000Z",
    "clientTimezone": "America/Mexico_City",
    "businessTimezone": "America/Chicago",
    "crmDelivery": "delivered"
  },
  "message": "Horario apartado"
}
```

`crmDelivery` sigue el mismo criterio que `/leads`: **un fallo del CRM no cambia el código de
estado**. A esas alturas el slot ya está apartado de verdad, y tirar la reserva por no haber podido
escribir una fila sería destruir algo real para castigar un fallo nuestro.

**Errores:** `400 VALIDATION_ERROR` (con `details` por campo) · `404 SERVICE_NOT_FOUND` ·
**`409 SLOT_TAKEN`** (con `data.alternatives`: los slots que sí quedan ese día) · `429 RATE_LIMITED` ·
`502 UPSTREAM_ERROR`

---

### Checkout ✅

**`POST /api/v1/checkout`** — Pública, rate limit por IP (10 / 10 min)

```json
{
  "leadId": "3f1c8a9e-77b4-4c21-9a2e-0d5b6f8c1234",
  "serviceSlug": "payroll",
  "eventId": "abc123def456",
  "sourceId": "cnon:card-nonce-ok",
  "verificationToken": "verf:CAESABC…"
}
```

Reglas críticas:
- El **monto NO se acepta del cliente**: se lee del catálogo por `serviceSlug` (ADR-006). El esquema
  **no tiene campo para un importe**, así que no hay nada que ignorar.
- `sourceId` es el token del Web Payments SDK; la tarjeta nunca llega al servidor.
- `verificationToken` es el resultado de `verifyBuyer()` (3-D Secure). **Opcional**: no toda tarjeta
  se desafía, y exigirlo bloquearía las que no.
- `eventId` es **obligatorio**. El slot ya está apartado cuando esto corre; un checkout sin evento es
  un error del cliente, no algo que compensar reservando aquí.
- El `idempotency_key` se **deriva de `leadId + eventId + priceCents`**, no es un UUID por clic — con
  un UUID nuevo cada vez, el doble clic dejaría de estar protegido.
- La respuesta **no** confirma el pago: devuelve `pending`. La confirmación llega por webhook
  (ADR-002).

**Response 201**
```json
{
  "data": { "orderId": "…", "paymentId": "…", "status": "pending" },
  "message": "Pago en proceso"
}
```

**Errores:** `400 VALIDATION_ERROR` · `402 PAYMENT_DECLINED` (mensaje en español según el código de
Square) · `404 SERVICE_NOT_FOUND` · `429 RATE_LIMITED` · `502 UPSTREAM_ERROR` (Square no responde o
falta una credencial — la respuesta ofrece el teléfono y **el slot sigue apartado**) ·
`422 INVALID_COUPON` ⏳ FASE 10

---

### Estado del pago ✅

**`GET /api/v1/orders/[id]/status`** — Pública, rate limit por IP (60 / 10 min)

Poll corto de la pantalla de «procesando». `[id]` es el `orderId` de Square.

**Response 200**
```json
{ "data": { "status": "pending" } }
```

`status` es `pending` · `paid` · `failed` y **nada más**: ni importes, ni marca de tarjeta, ni
identificadores internos. Conocer un `orderId` no puede volverse una forma de leer qué pagó alguien.

- Lee el **estado de la orden** (`COMPLETED` → `paid`), no el del pago: una llamada a Square en vez de
  dos por tick ([`features/payments.md`](./features/payments.md)).
- **`paid` no significa "cita confirmada".** Significa que el dinero entró; la cita la confirma el
  webhook, fuera de banda. La pantalla lo dice con esas palabras.
- Un fallo nuestro responde **`pending`**, jamás `failed`.

---

### Webhook de Square ✅

**`POST /api/v1/webhooks/square`** — Firma HMAC

Secuencia implementada, en este orden exacto:
1. Leer el body **crudo** (`await request.text()`) — parsearlo antes rompe la verificación.
2. Verificar HMAC-SHA256 de `notificationUrl + rawBody` con `crypto.timingSafeEqual`. Inválida →
   `401` y **nada más**.
3. Filtrar por **`status === "COMPLETED"`**, no por tipo de evento → si no, `200` sin trabajo.
4. Reclamar el **`payment_id`** en la pestaña `Pagos` (WF5). Ya existía → `200` sin trabajo.
5. Responder `200`.
6. `after()` de `next/server`: releer el pago y la orden en Square, confirmar el evento vía WF3,
   avanzar el CRM a `pagado` y cerrar la fila de `Pagos`.

El `200` va en el paso 5 y no al final porque Square corta a los ~10 s y el paso 6 son tres llamadas
encadenadas. **Lo que cuesta:** después del `200` Square no reintenta, así que un fallo del paso 6
deja la fila de `Pagos` en `recibido` — visible en la hoja que Claudia abre, que es exactamente el
punto.

Responder `200` ante evento duplicado, ya procesado o irrelevante. `401` solo cuando la firma es
inválida. **`503`** cuando no podemos verificar (falta la signature key) o no podemos saber si el pago
ya se procesó (WF5 no responde): en ambos casos Square reintenta durante 72 h, que es preferible a
tirar la notificación o a confirmar dos veces.

> ✅ **Resuelto en [`features/payments.md`](./features/payments.md) § ADR-013** (2026-08-05). En
> corto: un reintento **no cobra dos veces** —de eso se encarga el `idempotency_key` de
> `CreatePayment`— pero sí duplicaría el Meet y los correos. Así que la exclusión mutua real es la
> transición `tentative → confirmed` del evento de Calendar con `If-Match` sobre el ETag (Google
> responde `412` a la segunda), y el registro auditable de `event_id` es una pestaña `Pagos` en la
> hoja del CRM.
>
> El otro hueco que el webhook tiene —**no sabe de qué cita habla**— lo resuelve **ADR-014**: el
> `lead_id` y el `event_id` viajan en la `metadata` de la orden de Square, puesta por el servidor
> en `/checkout`.

---

### Gestión de la cita ✅

Diseño completo en
[`features/appointment-management.md`](./features/appointment-management.md).

`[token]` es el token **firmado** que viaja en el correo de confirmación (ADR-016):
`base64url(eventId) + "." + base64url(HMAC-SHA256(eventId, APPOINTMENT_TOKEN_SECRET))`. No se guarda
en ningún lado — verificarlo es recalcular el HMAC y compararlo en tiempo constante.

> **Regla común a los dos:** una firma inválida y una cita que ya no existe responden **exactamente
> lo mismo** (`404 NOT_FOUND`). Distinguirlas convertiría el endpoint en un oráculo para saber qué
> tokens son criptográficamente válidos. Y el token se **vuelve a verificar aquí** aunque la página
> ya lo hubiera hecho: que la página lo validara no prueba que esta petición venga de la página.

---

**`POST /api/v1/appointments/[token]/cancel`** — Token firmado · rate limit 5 / 10 min por IP

Sin cuerpo. Libera el slot en Calendar, pone la fila del CRM en `cancelado` y manda dos correos
—a `claudia@leosfirm.com` y al cliente— a través del workflow `Leos Firm - Cancelar cita`.

**El servidor calcula la política §8 con su propio reloj, en UTC**, y el veredicto viaja al correo de
Claudia porque es lo que le dice si reembolsa:

| Horas hasta la cita | `refund_window` | Qué se le dice a Claudia |
|---|---|---|
| ≥ 24 h | `mayor-24h` | Corresponde reembolso menos comisiones, o crédito |
| < 24 h | `menor-24h` | No corresponde reembolso |

**Ningún reembolso se ejecuta aquí** ([`03-security.md`](./03-security.md)): lo hace Claudia desde el
panel de Square. Este endpoint no llama a Square en ningún momento.

**Response 200**
```json
{ "data": { "cancelled": true, "alreadyCancelled": false }, "message": "Cita cancelada" }
```

`alreadyCancelled: true` es un **éxito**: alguien pulsó dos veces o abrió el enlace en dos
dispositivos, y no salió un segundo par de correos.

**Errores:** `404 NOT_FOUND` (firma inválida **o** cita inexistente) · **`409 APPOINTMENT_PAST`** (la
consulta ya empezó: §8 la da por realizada) · `429 RATE_LIMITED` · **`502 UPSTREAM_ERROR`** — y el
mensaje de este último dice que **la cita sigue en pie**, porque es cierto y porque dejar a alguien
creyendo que canceló es el peor final posible.

---

**`POST /api/v1/appointments/[token]/reschedule-request`** — Token firmado · rate limit 5 / 10 min

**No reagenda.** Manda un correo a Claudia con la cita actual y el horario que el cliente escriba;
ella lo acuerda por fuera. Nada se mueve en Calendar y ninguna etapa del CRM cambia.

**Request**
```json
{ "preference": "Cualquier día de la próxima semana por la tarde, después de las 3." }
```

`preference` es texto libre, **máximo 500 caracteres**, validado con Zod en cliente y servidor
(`src/lib/validation/appointment-management.schema.ts`). Termina dentro de un correo HTML, así que es
entrada no confiable: el workflow lo escapa antes de incrustarlo.

**Response 202**
```json
{ "data": { "received": true }, "message": "Solicitud enviada" }
```

**`202` y no `200` a propósito:** la petición se aceptó, la reprogramación **no ocurrió**. La
pantalla dice lo mismo con palabras — *«Claudia te va a escribir»*, nunca *«tu cita fue
reprogramada»*.

**Errores:** `400 VALIDATION_ERROR` · `404 NOT_FOUND` · `409 APPOINTMENT_PAST` · `429 RATE_LIMITED` ·
`502 UPSTREAM_ERROR`

---

### Cron — los ejecuta n8n

No hay endpoints `/api/v1/cron/*`. Los recordatorios (24 h y 1 h) y la limpieza de reservas vencidas
corren dentro de n8n con su **Schedule Trigger**, que ya tiene las credenciales de Calendar y Gmail
(ADR-010). Un endpoint intermedio solo añadiría un salto y un secreto más que rotar.
Ver [`features/scheduling.md`](./features/scheduling.md) y [`04-deployment.md`](./04-deployment.md).

---

## Códigos de Error Globales

| Código | Constante | Descripción |
|--------|-----------|-------------|
| 400 | `VALIDATION_ERROR` | Datos inválidos (detalle por campo en `details`) |
| 401 | `UNAUTHORIZED` | Sesión, firma o `CRON_SECRET` inválidos |
| 403 | `FORBIDDEN` | Sin permisos |
| 404 | `NOT_FOUND` | Recurso inexistente |
| 402 | `PAYMENT_DECLINED` / `ORDER_NOT_PAID` | Pago rechazado o pendiente |
| 409 | `SLOT_TAKEN` / `DUPLICATE_REQUEST` | Conflicto de concurrencia o idempotencia |
| 412 | `INTAKE_INCOMPLETE` | Falta completar el formulario |
| 422 | `INVALID_COUPON` | Cupón vencido, agotado o inexistente |
| 429 | `RATE_LIMITED` | Demasiadas peticiones |
| 500 | `INTERNAL_ERROR` | Error del servidor (detalle solo en logs) |
| 502 | `UPSTREAM_ERROR` | Falla de Square, Google o Anthropic |

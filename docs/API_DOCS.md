# Documentación de API — Leos Firm LLC

**Base URL:** `/api/v1`
**Autenticación:** ver tabla por endpoint (el sitio público **no** usa JWT de cliente — ADR-001)
**Última actualización:** 2026-08-04
**Estado global:** `/health` y `/leads` implementados. El resto se construye en las fases 5–10 de
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
| **Token de cita** | `access_token` (UUID) en la ruta o el body | Ver / reprogramar / cancelar la propia cita |
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
| GET | `/api/v1/availability` | Slots libres (ocupados de Calendar ∩ horario) | Pública | ⏳ FASE 5 |
| POST | `/api/v1/appointments` | Reservar el slot (tentativo) + CRM `agenda` | Pública | ⏳ FASE 5 |
| POST | `/api/v1/checkout` | Crear orden y cobrar con Square | Pública | ⏳ FASE 6 |
| POST | `/api/v1/webhooks/square` | Confirmación de pago (fuente de verdad) | Firma HMAC | ⏳ FASE 6 |
| GET | `/api/v1/orders/[id]/status` | Polling del estado del pago | Pública (id opaco) | ⏳ FASE 6 |
| GET | `/api/v1/appointments/[token]` | Ver la propia cita | Token de cita | ⏳ FASE 9 |
| PATCH | `/api/v1/appointments/[token]` | Reprogramar (≥24 h) | Token de cita | ⏳ FASE 9 |
| DELETE | `/api/v1/appointments/[token]` | Cancelar (política §8) | Token de cita | ⏳ FASE 9 |
| POST | `/api/v1/checkout/validate-coupon` | Validar un cupón de referido | Pública | ⏳ FASE 10 |

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

### Disponibilidad y citas ⏳ FASE 5

Diseño completo en [`features/scheduling.md`](./features/scheduling.md).

**`GET /api/v1/availability?from=2026-08-10&to=2026-08-31&tz=America/Mexico_City`** — Pública

Pide a n8n los eventos de Claudia en el rango, los cruza con `BUSINESS_HOURS` y devuelve los slots
libres en UTC **y** en el huso del cliente. Los eventos **tentativos también ocupan** (ADR-011).
Si no hay nada libre → `200` con `slots: []` y `nextAvailableFrom`.

**`POST /api/v1/appointments`** — Pública

Revalida el slot, crea el evento **tentativo** en el calendario de Claudia vía n8n y avanza la fila
del CRM a `stage='agenda'`. Devuelve el `eventId` que viajará hasta el webhook de Square.
Aquí se registran `policyAccepted`, `policy_accepted_at` y la IP (`context.md` §8.9).

**Errores:** `409 SLOT_TAKEN` (con slots alternativos) · `400 VALIDATION_ERROR`

---

### Checkout ⏳ FASE 6

**`POST /api/v1/checkout`** — Pública

```json
{
  "leadId": "3f1c8a9e-77b4-4c21-9a2e-0d5b6f8c1234",
  "serviceSlug": "payroll",
  "eventId": "abc123def456",
  "sourceId": "cnon:card-nonce-ok",
  "couponCode": "REFERIDO30"
}
```

Reglas críticas:
- El **monto NO se acepta del cliente**: se lee del catálogo por `serviceSlug` (ADR-006).
- `sourceId` es el token del Web Payments SDK; la tarjeta nunca llega al servidor.
- Se genera `idempotency_key` por intento.
- La respuesta **no** confirma el pago: devuelve `orderId` en estado `pending`. La confirmación
  llega por webhook (ADR-002).

**Response 201**
```json
{ "data": { "orderId": "uuid", "status": "pending" }, "message": "Pago en proceso" }
```

**Errores:** `400 VALIDATION_ERROR` · `402 PAYMENT_DECLINED` · `404 SERVICE_NOT_FOUND` ·
`409 DUPLICATE_REQUEST` · `422 INVALID_COUPON` · `429 RATE_LIMITED`

---

### Webhook de Square ⏳ FASE 6

**`POST /api/v1/webhooks/square`** — Firma HMAC

Secuencia obligatoria:
1. Leer el body **crudo** (`await req.text()`) — parsearlo antes rompe la verificación.
2. Verificar HMAC-SHA256 de `notificationUrl + rawBody` con `crypto.timingSafeEqual`.
3. Descartar `event_id` ya procesados (anti-replay).
4. Confirmar el evento tentativo en Calendar (vía n8n) y avanzar el CRM a `stage='pagado'`.
5. Responder `200` **rápido**; el trabajo pesado va en background.

Responder siempre `200` ante evento duplicado o ya procesado. Un `401` solo cuando la firma es
inválida — Square reintenta durante 72 h.

> **Sin base de datos, la idempotencia necesita otro lugar.** Definir dónde vive el registro de
> `event_id` procesados es parte del trabajo de la FASE 6: candidatos son la hoja de cálculo (una
> pestaña `Pagos`) o el Data Table de n8n. **No dejarlo sin resolver:** un reintento de Square
> confirmando dos veces la misma cita es un cobro duplicado esperando a pasar.

---

### Gestión de la cita ⏳ FASE 9

**`GET|PATCH|DELETE /api/v1/appointments/[token]`** — Token de cita

`PATCH` (reprogramar) y `DELETE` (cancelar) aplican la política §8: ≥24 h sin costo /
reembolso menos comisiones; <24 h no reembolsable. La decisión de reembolso se calcula en el
servidor a partir de la fecha de la cita, nunca se acepta del cliente.
Rate limit por IP para impedir enumeración de tokens.

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

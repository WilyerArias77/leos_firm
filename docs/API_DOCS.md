# Documentación de API — Leos Firm LLC

**Base URL:** `/api/v1`
**Autenticación:** ver tabla por endpoint (el sitio público **no** usa JWT de cliente — ADR-001)
**Última actualización:** 2026-08-02
**Estado global:** DISEÑADA — solo `/health` está implementado. El resto se construye en FASE 2.

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

| Método | Ruta | Descripción | Auth | Estado |
|--------|------|-------------|------|--------|
| GET | `/api/v1/health` | Estado del servidor | Pública | ✅ Implementado |
| GET | `/api/v1/services` | Catálogo de servicios activos | Pública | ⏳ FASE 2 |
| GET | `/api/v1/services/[slug]` | Detalle de un servicio | Pública | ⏳ FASE 2 |
| POST | `/api/v1/checkout` | Crear orden y cobrar con Square | Pública | ⏳ FASE 3 |
| POST | `/api/v1/checkout/validate-coupon` | Validar un cupón de referido | Pública | ⏳ FASE 3 |
| POST | `/api/v1/webhooks/square` | Confirmación de pago (fuente de verdad) | Firma HMAC | ⏳ FASE 3 |
| GET | `/api/v1/orders/[id]/status` | Polling del estado del pago | Pública (id opaco) | ⏳ FASE 3 |
| POST | `/api/v1/agent/intake-schema` | Generar el formulario inteligente | Pública | ⏳ FASE 4 |
| POST | `/api/v1/intake` | Guardar el intake + validación | Pública | ⏳ FASE 4 |
| POST | `/api/v1/intake/documents` | Subir adjuntos | Pública | ⏳ FASE 4 |
| GET | `/api/v1/availability` | Slots libres desde Google Calendar | Pública | ⏳ FASE 5 |
| POST | `/api/v1/availability/hold` | Bloquear un slot 10 min | Pública | ⏳ FASE 5 |
| POST | `/api/v1/appointments` | Crear cita + Meet + CRM + correos | Pública | ⏳ FASE 5 |
| GET | `/api/v1/appointments/[token]` | Ver la propia cita | Token de cita | ⏳ FASE 5 |
| PATCH | `/api/v1/appointments/[token]` | Reprogramar (≥24 h) | Token de cita | ⏳ FASE 7 |
| DELETE | `/api/v1/appointments/[token]` | Cancelar (política §8) | Token de cita | ⏳ FASE 7 |
| GET | `/api/v1/cron/reminders` | Recordatorios 24 h / 1 h | Cron | ⏳ FASE 6 |
| GET | `/api/v1/cron/close-appointments` | `pendiente_atencion` → `atendido` | Cron | ⏳ FASE 7 |
| GET | `/api/v1/admin/appointments` | Listado del panel | Admin | ⏳ FASE 7 |
| PATCH | `/api/v1/admin/appointments/[id]` | Cambiar estado / notas | Admin | ⏳ FASE 7 |
| POST | `/api/v1/admin/refunds` | Reembolso según política | Admin | ⏳ FASE 7 |

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

### Catálogo ⏳

**`GET /api/v1/services`** — Pública
Devuelve los servicios con `is_active = true`, ordenados por `display_order`.

**`GET /api/v1/services/[slug]`** — Pública · `404` si no existe o está inactivo.

---

### Checkout ⏳

**`POST /api/v1/checkout`** — Pública

```json
{
  "serviceId": "uuid",
  "sourceId": "cnon:card-nonce-ok",
  "couponCode": "REFERIDO30",
  "client": {
    "fullName": "Juan Pérez",
    "email": "juan@ejemplo.com",
    "phone": "+525512345678",
    "country": "MX",
    "timezone": "America/Mexico_City"
  }
}
```

Reglas críticas:
- El **monto NO se acepta del cliente**: se lee de `services.price_cents` (ADR-006).
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

### Webhook de Square ⏳

**`POST /api/v1/webhooks/square`** — Firma HMAC

Secuencia obligatoria:
1. Leer el body **crudo** (`await req.text()`) — parsearlo antes rompe la verificación.
2. Verificar HMAC-SHA256 de `notificationUrl + rawBody` con `crypto.timingSafeEqual`.
3. Si el `event_id` ya está en `webhook_events` → `200 OK` sin reprocesar (anti-replay).
4. Actualizar `orders.status` y crear/actualizar `payments`.
5. Responder `200` **rápido**; el trabajo pesado va en background.

Responder siempre `200` ante evento duplicado o ya procesado. Un `401` solo cuando la firma es
inválida — Square reintenta durante 72 h.

---

### Agente IA — Formulario Inteligente ⏳

**`POST /api/v1/agent/intake-schema`** — Pública

Genera las preguntas del intake según el servicio y las respuestas previas (`context.md` §7:
las preguntas cambian si el cliente ya tiene o no una entidad en EE. UU.).

- El agente **solo** propone preguntas; nunca decide precio, disponibilidad ni estado de pago (ADR-005).
- La salida se valida con Zod antes de usarse.
- **Fallback obligatorio:** si la IA falla o tarda, se devuelve el esquema estático de
  `src/constants/intakeSchemas.ts` con `"source": "fallback"`. El intake nunca se bloquea por la IA.

---

### Intake ⏳

**`POST /api/v1/intake`** — Pública

Requiere que `orders.status = 'paid'`. Valida con Zod, opcionalmente con revisión semántica de IA, y
persiste en `intake_forms`.

`policyAccepted: true` es **obligatorio**; se registran `policy_accepted_at` y `policy_accepted_ip`
como evidencia (`context.md` §8.9). Sin eso, el `CHECK` de la tabla rechaza el registro.

**`POST /api/v1/intake/documents`** — Pública · `multipart/form-data`
Valida MIME real, extensión y tamaño (≤ 10 MB); sube al bucket **privado** `intake-documents`.

---

### Disponibilidad ⏳

**`GET /api/v1/availability?serviceId=uuid&from=2026-08-10&to=2026-08-17&tz=America/Mexico_City`**

Cruza `freeBusy` de Google Calendar con el horario de oficina y descuenta los `slot_holds` vigentes.
Devuelve los slots en UTC **y** en el huso del cliente.

Si no hay disponibilidad → `200` con `slots: []` y `nextAvailableFrom`, para que la UI ofrezca
fechas alternativas (rama "¿Existe disponibilidad? → No" del flujo).

**`POST /api/v1/availability/hold`** — bloquea un slot 10 minutos mientras se llena el intake.

---

### Citas ⏳

**`POST /api/v1/appointments`** — Pública

Orquesta el tramo final del flujo. Orden de operaciones (importa):

1. Verificar `orders.status = 'paid'` e `intake_forms.is_complete = true`.
2. Revalidar disponibilidad del slot (pudo ocuparse mientras tanto).
3. Crear el evento en Google Calendar **con** `conferenceData` (genera el enlace de Meet).
4. Insertar `appointments` con `status = 'pendiente_atencion'` y `access_token`.
5. Actualizar el CRM (`clients`).
6. Encolar correos: confirmación al cliente + copia a `ADMIN_NOTIFICATION_EMAIL`.

Compensación: si falla el paso 4 después del 3, hay que **borrar el evento de Calendar**; de lo
contrario queda un slot bloqueado sin cita. Los pasos 5 y 6 no deben tumbar la petición: se
registran en `notification_log` para reintento.

**Errores:** `409 SLOT_TAKEN` (con slots alternativos) · `412 INTAKE_INCOMPLETE` · `402 ORDER_NOT_PAID`

**`GET|PATCH|DELETE /api/v1/appointments/[token]`** — Token de cita

`PATCH` (reprogramar) y `DELETE` (cancelar) aplican la política §8: ≥24 h sin costo /
reembolso menos comisiones; <24 h no reembolsable. La decisión de reembolso se calcula en el
servidor a partir de `scheduled_at`, nunca se acepta del cliente.
Rate limit por IP para impedir enumeración de tokens.

---

### Cron ⏳

Ambos exigen `Authorization: Bearer ${CRON_SECRET}` → `401` sin él.

| Ruta | Qué hace |
|------|----------|
| `GET /api/v1/cron/reminders` | Envía recordatorios 24 h y 1 h antes; `UNIQUE (appointment_id, kind)` en `notification_log` impide duplicados |
| `GET /api/v1/cron/close-appointments` | Pasa a `atendido` las citas ya vencidas; limpia `slot_holds` expirados |

---

### Panel Admin ⏳

Todos requieren sesión de Supabase Auth **y** fila en `admin_profiles`. La verificación se hace en
el endpoint, no solo en la UI.

| Ruta | Descripción |
|------|-------------|
| `GET /api/v1/admin/appointments` | Listado con filtros de estado, fecha y cliente |
| `PATCH /api/v1/admin/appointments/[id]` | Cambiar estado (`atendido`, `no_show`), notas |
| `POST /api/v1/admin/refunds` | Reembolso vía Square según política de cancelación |

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

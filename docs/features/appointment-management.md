# Feature: Gestión de la cita — ver, cancelar y pedir otro horario

> **Estado:** 🔨 **Mitad de Next.js lista** (2026-08-06). Los tres workflows de n8n están **creados
> y SIN PUBLICAR** — falta asignarles la credencial de Google a mano y pedir autorización para
> activarlos (4 Leyes de Operación).
> **Última actualización:** 2026-08-06
> **Archivos clave:** `src/lib/utils/appointmentToken.ts` ·
> `src/services/appointment-management.service.ts` ·
> `src/app/(public)/agendar/cita/[token]/page.tsx` ·
> `src/app/api/v1/appointments/[token]/{cancel,reschedule-request}/route.ts` ·
> `src/components/features/appointments/` · `src/types/appointment.types.ts` ·
> `src/lib/validation/appointment-management.schema.ts`
> **Workflows de n8n:** `Leos Firm - Consultar cita` · `Leos Firm - Cancelar cita` ·
> `Leos Firm - Pedir otro horario`
> **Decisiones asociadas:** ADR-001 (el cliente no crea cuenta; la cita se identifica con un token) ·
> ADR-003 y ADR-011 (Calendar es la verdad de la agenda) · ADR-010 (n8n tiene las credenciales) ·
> **ADR-016 nace aquí** (el token es firmado y sin estado)
> **Depende de:** [`payments.md`](./payments.md) — el enlace sale en el correo que manda el WF3 ·
> [`scheduling.md`](./scheduling.md) — el evento y su `description` son de donde sale todo dato ·
> [`crm-sheets.md`](./crm-sheets.md) — la etapa `cancelado`

---

## Qué se construye

El correo de confirmación lleva un **enlace propio de esa cita**. Quien lo abre ve su cita y tiene
dos botones:

```
Correo de confirmación
   └─ https://leos-firm.vercel.app/agendar/cita/<token>
          │
          ▼
   ┌─ La cita ─────────────────────────────────────────────┐
   │ Servicio · día y hora en TU huso y en San Antonio      │
   │ Enlace de Google Meet · estado                         │
   │ Qué aplica hoy según la política §8 (≥24 h / <24 h)    │
   ├───────────────────────────────────────────────────────┤
   │ [ Cancelar la cita ]     [ Pedir otro horario ]        │
   └───────────────────────────────────────────────────────┘
          │                          │
          ▼                          ▼
   libera el slot            correo a Claudia con
   CRM → cancelado           el horario que pide
   correo a Claudia          el cliente (texto libre)
   correo al cliente         → «Claudia te va a escribir»
```

**Alcance recortado a propósito** (decidido el 2026-08-06, [`../00-roadmap.md`](../00-roadmap.md)
§ FASE 9). Lo que **NO** se construye, y no por falta de tiempo:

| Fuera del alcance | Por qué |
|---|---|
| **Reembolsos automáticos** | Es la parte caramente compleja y la de menor volumen. Los hace Claudia desde el panel de Square, que es donde ya trabaja el dinero. `03-security.md` lo exige además: *«ningún reembolso desde un endpoint público»* |
| ~~**Reprogramación en vivo** con calendario y disponibilidad~~ | ✅ **Construida el 2026-08-11** — ver **ADR-019** más abajo. El razonamiento original («un correo cubre el caso real con una fracción de la superficie») era correcto para la FASE 9 y dejó de serlo cuando la clienta pidió que el cliente pudiera cambiar su cita solo |
| **Panel de administración** | La hoja **es** el panel (ADR-010) |

---

## ADR-016: el token de la cita es firmado y no se guarda en ningún lado

**Fecha:** 2026-08-06

**Contexto.** ADR-001 dice que el cliente no crea cuenta y que su cita se identifica con un
`access_token` opaco enviado por correo. Ese diseño asumía una columna `appointments.access_token`
en Supabase donde guardar y contra la que comparar. **Supabase está congelado** (ADR-010) y el CRM es
una hoja de cálculo: no hay dónde guardar un token, y leer la hoja de vuelta para validarlo sería
una llamada a n8n por cada visita a la página, con un `403` de Google como modo de fallo.

Un UUID aleatorio necesita un sitio donde estar escrito para significar algo. Sin ese sitio, un UUID
es solo una cadena.

**Decisión.** El token **se firma en vez de guardarse**:

```
token = base64url(eventId) + "." + base64url( HMAC-SHA256(eventId, APPOINTMENT_TOKEN_SECRET) )
```

Verificar es recalcular el HMAC del `eventId` que viene dentro y compararlo **en tiempo constante**
(`crypto.timingSafeEqual`), exactamente como la firma del webhook de Square
(`src/lib/square/signature.ts`). Sin estado, sin base de datos y sin una llamada de red para saber
si un enlace es legítimo.

**Consecuencias.**

- **Nada de PII dentro del token.** Solo viaja el `eventId` de Google, que es opaco y no dice quién
  es nadie. El nombre, el correo y el servicio se leen del propio evento **después** de verificar la
  firma, y solo entonces.
- **El token no caduca por sí mismo** — no lleva fecha dentro. Lo que caduca es la **cita**: si el
  evento ya no existe en Calendar, la página responde `notFound()`. En la práctica el efecto es el
  mismo y evita un campo más que firmar y que desincronizar.
- **Es un portador (*bearer*): quien tiene el enlace puede cancelar.** Es la misma propiedad que
  tenía el `access_token` de ADR-001 y es deliberada — pedir una contraseña a alguien que solo
  quiere mover una cita mata la función. Lo que la hace aceptable: el enlace solo sale en el correo
  de esa persona, cancelar **no mueve dinero** (los reembolsos son manuales), y los dos endpoints
  tienen rate limit. Adivinar un token exige romper un HMAC-SHA256.
- ⚠️ **Rotar `APPOINTMENT_TOKEN_SECRET` invalida TODOS los enlaces ya enviados por correo.** No hay
  período de gracia y no puede haberlo sin estado. Si algún día hay que rotarlo, primero hay que
  saber qué citas futuras existen y volver a mandarles el enlace. Está escrito aquí porque es
  justo el tipo de cosa que se descubre el día que se rota.
- **`APPOINTMENT_TOKEN_SECRET` es de servidor y obligatoria.** Sin ella no se puede firmar ni
  verificar, así que su getter **sí lanza** — al revés que `getN8nEnv()`. El razonamiento de aquella
  excepción (*«un 500 en el diagnóstico pierde el lead y la persona»*) no aplica: sin secreto no hay
  nada que servir en esta página, y servir algo sería peor.

---

## El enlace viaja en el correo de confirmación

El token se genera **en Next.js**, no en n8n: la clave nunca sale de la aplicación
(Mandamiento VIII). Se añade al payload del WF3 `Leos Firm - Confirmar cita`, que es el que manda el
correo cuando el pago se acredita.

`ConfirmAppointmentPayload` (`src/types/payment.types.ts`) crece con dos campos:

| Campo | Qué es | Por qué |
|---|---|---|
| `access_token` | El token firmado | Es el dato; por si el workflow necesita construir otra cosa con él |
| `appointment_url` | `https://<sitio>/agendar/cita/<token>` | **Es lo que el correo pega.** La arma Next.js con `SITE_URL` para que n8n no tenga que concatenar URLs — un `/` de más ahí es un enlace roto que nadie ve hasta que un cliente lo reporta |

> 🔧 **Pendiente manual en el WF3.** El payload ya lleva los dos campos, pero **el nodo de Gmail
> todavía no los usa**: hay que añadir el enlace al HTML del correo. Se hace **a mano en la UI de
> n8n**, no por MCP: el WF3 tiene tres nodos HTTP Request con la credencial de Calendar puesta a
> mano y una actualización desde el MCP se las lleva por delante
> ([`payments.md`](./payments.md) § WF3). Mientras no se haga, la FASE 9 funciona pero **nadie
> recibe el enlace**.

Texto sugerido para el correo, en la misma línea que el resto:

> ¿Necesitas cancelar o cambiar la hora? Entra aquí: `<appointment_url>`
> Recuerda que con 24 horas o más de anticipación puedes reprogramar sin costo.

---

## La página `GET /agendar/cita/[token]`

Server Component. Next 16: `params` es asíncrono, así que
`const { token } = await props.params` con `PageProps<"/agendar/cita/[token]">`.

**Orden de operaciones:**

1. **Verificar el HMAC.** Firma inválida → `notFound()`.
2. **Leer la cita** por el `eventId` que sale del token (WF8, abajo). No encontrada → `notFound()`.
3. **Calcular en el servidor las horas que faltan**, todo en UTC.
4. Renderizar.

### Por qué `notFound()` y no `401`

Un `401` distingue *«esa firma no es válida»* de *«esa cita no existe»*, y esa diferencia es un
**oráculo**: permite a alguien probar tokens y saber cuáles son criptográficamente correctos aunque
la cita ya no esté. Un `404` no dice nada de nada. Es el mismo criterio con el que el webhook de
Square responde `401` a cualquier firma mala sin explicar por qué.

### Qué se muestra

| Bloque | De dónde sale |
|---|---|
| Servicio | `description` del evento (línea `Servicio:`), que escribe el WF2 |
| Día y hora **en el huso del visitante** | El navegador, con `Intl` — ver abajo |
| Día y hora **en `America/Chicago`** | El servidor, siempre. Nunca se muestra una sola hora |
| Enlace de Google Meet | `hangoutLink` del evento |
| Estado | `confirmed` · `tentative` · `cancelled` del evento, más «ya pasó» si `start < now` |
| Qué aplica según la política §8 | Calculado en el servidor con `hoursUntilStart` |

### Los dos husos, y por qué uno de ellos es del cliente

El servidor no sabe en qué huso está quien abre el enlace. Tiene dos candidatos y ninguno es la
respuesta:

- `America/Chicago` es el de la firma, no el del visitante.
- El `client_timezone` guardado en el evento es el que tenía **cuando agendó**. Sirve de valor
  inicial, pero alguien puede abrir el enlace desde otro país.

Por eso `AppointmentTime` es un componente de cliente diminuto: renderiza en el servidor con el huso
guardado —para que la página tenga sentido sin JavaScript— y en `useEffect` lo reemplaza por el huso
real del navegador si difiere. Se hace en `useEffect` y no durante el render para no provocar un
desajuste de hidratación, que es el modo en que este patrón se rompe habitualmente.

**Nunca se muestra una sola hora.** Es la misma regla que el correo de confirmación
([`scheduling.md`](./scheduling.md) § Reglas de husos horarios), y la prueba con `Europe/Madrid`
—21:00 del cliente contra 14:00 de San Antonio— es la que demostró que la aritmética funciona.

### La política §8, calculada en el servidor

`describeCancellationWindow(startUtc, now)` en `appointment-management.service.ts`. Todo en UTC, y
la única entrada es la fecha de la cita: **nada de esto se acepta del cliente.**

| Horas hasta la cita | Qué se muestra | Qué se le dice a Claudia en el correo |
|---|---|---|
| **≥ 24 h** | «Puedes recibir un reembolso menos las comisiones bancarias o de procesamiento, o usar el monto como crédito para una consultoría futura» | `mayor-24h` — **puede reembolsar** |
| **< 24 h** | «Ya no es reembolsable» | `menor-24h` — **no corresponde reembolso** |
| Ya empezó / ya pasó | La cita se considera realizada. Sin botones | La cita no se puede cancelar desde aquí |

El umbral vive en `CANCELLATION_POLICY.freeChangeWindowHours` (`src/constants/business.ts`), que ya
existía y valía 24. No se duplica aquí.

> ⚠️ **El veredicto que cuenta es el del endpoint, no el de la página.** Alguien puede abrir el
> enlace a 24 h y 10 minutos y darle a cancelar media hora después: la página decía «reembolsable» y
> la cancelación real ya no lo es. El endpoint **recalcula** con su propio reloj y es su resultado el
> que viaja al correo de Claudia. La página informa; no decide.

---

## `POST /api/v1/appointments/[token]/cancel`

Contrato en [`../API_DOCS.md`](../API_DOCS.md). Lo que este doc añade es el orden y el porqué:

1. **Rate limit por IP**, igual que el resto de endpoints públicos (`03-security.md`).
2. **Verificar el HMAC.** Es lo primero que se hace con el token y **nunca se confía en el cliente**:
   que la página lo haya verificado hace un minuto no vale nada, la petición pudo no venir de ahí.
3. **Leer la cita** (WF8) — hace falta la fecha para el punto 4 y los datos para el correo.
4. **Calcular `hoursUntilStart` y el veredicto** de la política, en el servidor, en UTC.
5. **Llamar al WF9**, que hace las tres cosas: libera el slot, pone el CRM en `cancelado` y manda
   los dos correos.

**El correo a Claudia lleva el veredicto porque es lo que le dice si reembolsa.** Sin ese dato
tendría que abrir el calendario, mirar la hora de la cita, mirar la hora a la que llegó el correo y
restar. Es exactamente el cálculo que el servidor ya hizo.

**Qué NO hace este endpoint:** ningún reembolso, ninguna llamada a Square. La pestaña `Pagos` tiene
el `payment_id` y el importe (ADR-013) para que Claudia lo haga en dos clics desde su panel.

### Cancelar dos veces

No se protege con un candado. La segunda cancelación encuentra el evento ya en `cancelled` y el WF9
sale por su rama de *«ya estaba cancelada»* sin mandar correos nuevos. No hace falta la maquinaria
de `If-Match` de ADR-013 porque aquí no hay nada que preservar: no se crea un Meet, no se cobra, y
un correo de más es molesto, no caro. Aun así el workflow lo evita.

---

## `POST /api/v1/appointments/[token]/reschedule-request`

**No reagenda.** Manda un correo a Claudia con la cita actual y el horario que el cliente escriba, y
ella lo acuerda por fuera.

- El texto es **libre, máximo 500 caracteres**, validado con Zod
  (`src/lib/validation/appointment-management.schema.ts`) en el cliente y otra vez en el servidor.
- Responde **`202 Accepted`** y no `200`: la petición se aceptó, la reprogramación **no ocurrió**.
  El código dice la verdad sobre lo que pasó.
- La pantalla lo dice con esas palabras: *«Claudia te va a escribir para acordar el nuevo horario»*.
  Nunca «tu cita fue reprogramada».

**El texto libre va a un correo, así que se escapa antes de incrustarlo en HTML** — es una entrada no
confiable que termina en la bandeja de la clienta (`03-security.md` § Validación de entrada). El
escape lo hace el nodo de n8n; el límite de 500 caracteres lo hace Zod aquí.

> **Por qué 500 y no más:** es un horario preferido, no una carta. Un campo sin techo es una
> invitación a pegar cualquier cosa dentro del correo de otra persona.

---

## ADR-019: el cliente mueve su propia cita, con el servidor decidiendo

> **Fecha:** 2026-08-11 · **Estado:** aceptada · **Revierte:** el recorte de alcance de la FASE 9

**Contexto.** El 2026-08-06 se decidió no construir la reprogramación en vivo y cubrirla con un
correo a Claudia. Aquel razonamiento sigue siendo cierto en sus términos —reagendar exige revalidar
el hueco, mover el evento, conservar el Meet y no volver a cobrar— pero partía de una premisa que
dejó de valer: que el volumen no lo justificaba.

El 2026-08-11 la clienta pidió que el cliente pudiera **modificar su cita desde el enlace del
correo**. Su primera formulación fue que lo hiciera el asistente virtual. Planteado que el asistente
diseñado (ADR-018) tampoco reprograma —su herramienta `pedir_otro_horario` manda el mismo correo que
ya manda el botón—, eligió la funcionalidad real sin la capa conversacional.

**Decisión.** Se construye la reprogramación en vivo **por encima de las piezas que ya existen**, no
como un flujo nuevo:

```
/agendar/cita/[token]  ──▶  el MISMO calendario de /agendar
                                (useAvailability + AvailabilityCalendar + SlotPicker)
                                       │
                                       ▼
              POST /api/v1/appointments/[token]/reschedule
                 1. verifica el HMAC del token          (ADR-016)
                 2. re-aplica §8 con el reloj del servidor
                 3. RELEE los bloques ocupados de Google (ADR-003)
                 4. isSlotBookable — la MISMA función que usa reservar
                       │
                       ▼
              n8n · «Leos Firm - Reprogramar cita»
                 PATCH start/end con If-Match sobre el ETag
                 NO toca conferenceData → el Meet sobrevive
```

**Las dos rutas conviven, y eso no es indecisión.** `reschedule-request` no se borra: pasa a ser el
camino de lo que el autoservicio no cubre —menos de 24 h y haber agotado los cambios—, donde §8 dice
que el cambio ya no es gratis y hace falta que decida una persona. Cada rechazo del endpoint nuevo
nombra esa puerta, así que ningún cliente se queda sin salida.

**Consecuencias.**

- **No se cobra nunca en este camino.** No existe llamada a Square en él.
- **El Meet se conserva**, y es la razón de que esto sea un *move* y no un cancelar-y-reservar. El
  enlace que el cliente ya tiene en su correo sigue funcionando.
- **La duración sale del evento, no del catálogo.** Las sesiones bajaron de 60 a 30 minutos el
  2026-08-07: leer el catálogo aquí acortaría una cita vieja como efecto secundario de moverla.
- **Un tope de dos cambios**, `CANCELLATION_POLICY.maxSelfReschedules`. No está en `context.md` —
  se propuso al construir esto y la clienta lo aceptó. Existe porque cada movimiento quema una hora
  de la agenda que nadie acaba usando.
- **El contador vive en la descripción del evento**, que es el único registro que hay (ADR-010: no
  hay base de datos). Lo incrementa el workflow, que es quien lo tiene delante; el **número máximo**
  viaja en el payload desde `business.ts`, para que la regla siga siendo de la app y n8n solo
  compare.

> ⚠️ **La carrera es el riesgo real de esta feature.** Entre que se dibuja el calendario y se pulsa
> confirmar, otro visitante puede llevarse la hora, y Google **no impide solapamientos por sí solo**:
> el candado tiene que ser nuestro. Hay dos comprobaciones, y las dos son necesarias — el endpoint
> revalida con bloques recién leídos, y el workflow vuelve a mirar dentro de la misma ejecución que
> hace el PATCH, que es lo más cerca de la escritura a lo que se puede llegar. Si aun así se cuela
> una, el `If-Match` evita el pisotón silencioso.

---

## `POST /api/v1/appointments/[token]/reschedule`

El que **sí** mueve la cita (ADR-019). Hermano del anterior, no su reemplazo.

| | |
|---|---|
| **Cuerpo** | `{ "newStartUtc": "2026-08-20T15:00:00.000Z" }` — **un solo campo** |
| **200** | `{ movedTo, meetingUrl, rescheduleCount }` |
| **409 `TOO_LATE`** | Menos de 24 h, o ya empezó. Deriva al correo |
| **409 `RESCHEDULE_LIMIT`** | Agotó sus cambios. Deriva al correo |
| **409 `SLOT_TAKEN`** | Se la llevaron mientras elegía. Devuelve ese día redibujado |
| **409 `SAME_SLOT`** | Eligió la hora que ya tiene |
| **502 `UPSTREAM_ERROR`** | n8n no respondió. **La cita sigue en pie** y el mensaje lo dice |

**Por qué el cuerpo tiene un solo campo.** Ni el fin, ni la duración, ni el servicio, ni el huso: el
fin es el inicio más lo que dura *ese* evento, y el huso ya está escrito en él. Un cuerpo que
cargara su propia duración dejaría que cualquiera se agendase cuatro horas al precio de treinta
minutos (ADR-006).

---

## La etapa `cancelado` del CRM — terminal

`CrmStage` gana un cuarto valor y `CRM_STAGE_ORDER` le da el número **más alto**:

```ts
formulario: 1 · agenda: 2 · pagado: 3 · cancelado: 4
```

**El número alto es lo que la hace terminal**, sin necesidad de una regla nueva. La regla que ya
existía —*ninguna etapa retrocede*— hace todo el trabajo:

| Llega después de `cancelado` | Qué pasa |
|---|---|
| `agenda` (2) | Rechazada. Una reserva tardía **no resucita** una cita cancelada |
| `pagado` (3) | Rechazada. Un webhook de Square con retraso tampoco |
| `cancelado` (4) | Idempotente: reescribe lo mismo |

> ⚠️ **Hoy la protección está definida en el tipo pero NO aplicada en el workflow.** Es una deuda que
> [`crm-sheets.md`](./crm-sheets.md) § Pendiente ya tenía anotada desde antes de esta fase, y la
> etapa `cancelado` la hace más visible: el WF1 hace `appendOrUpdate` por `ID` sin mirar el estado
> anterior. `canAdvanceStage()` existe en `src/types/crm.types.ts` para que la regla esté escrita en
> un solo sitio el día que el workflow la lea. **No se arregla en esta fase** — tocar el WF1 exige
> refrescar el esquema de sus tres nodos, y no hay ningún camino en el que hoy llegue un `agenda`
> después de un `cancelado`: agendar acuña un `leadId` nuevo.

**Qué columnas escribe la cancelación:** `ID`, `Estado` y `Actualizado`. **Ninguna columna nueva**, y
es deliberado: una columna nueva es un paso manual en la hoja y un refresco de esquema en el
workflow, y los dos datos que faltarían —cuándo se canceló y si fue con ≥24 h— están en el correo
que Claudia recibe y en el propio evento de Calendar.

---

## Los tres workflows de n8n

Creados el 2026-08-06 por MCP. **Ninguno está publicado** — publicar pone un webhook en producción y
eso necesita autorización explícita (4 Leyes de Operación).

| # | Workflow | ID en n8n | Ruta | Variable | Estado |
|---|----------|-----------|------|----------|--------|
| 8 | `Leos Firm - Consultar cita` | `84YbxlHq8PKOkzoh` | `/leos-firm/cita` | `N8N_APPOINTMENT_WEBHOOK_URL` | ⬜ creado, **sin publicar** |
| 9 | `Leos Firm - Cancelar cita` | `KsSCuk7Rw9FV0cr3` | `/leos-firm/cancelar` | `N8N_CANCEL_WEBHOOK_URL` | ⬜ creado, **sin publicar** |
| 10 | `Leos Firm - Pedir otro horario` | `JFOoJwE7Uw8zWiEc` | `/leos-firm/reprogramar` | `N8N_RESCHEDULE_WEBHOOK_URL` | ⬜ creado, **sin publicar** |

Los tres usan la credencial **Header Auth** que ya existe (`Leos Firm - Token del sitio`, header
`x-leosfirm-token`), y n8n **se la asignó sola a los tres webhooks**. No hay secreto nuevo que
repartir.

### ⚠️ Lo que hay que arreglar a mano antes de publicar — verificado al crearlos

No es una advertencia teórica: n8n informó exactamente esto al guardarlos.

| Workflow | Nodo | Qué quedó | Qué tiene que quedar |
|---|---|---|---|
| 8 | `Leer el evento en Calendar` | **sin credencial** | `Google Calendar - Leos Firm` |
| 9 | `Leer el evento antes de cancelar` | **sin credencial** | `Google Calendar - Leos Firm` |
| 9 | `Liberar el hueco en Calendar` | **sin credencial** | `Google Calendar - Leos Firm` |
| 9 | `Avisar a Claudia` | ❌ `api_gmail_aiinovate` | `Gmail - Leos Firm` |
| 9 | `Avisar al cliente` | ❌ `api_gmail_aiinovate` | `Gmail - Leos Firm` |
| 10 | `Pedirle a Claudia otro horario` | ❌ `api_gmail_aiinovate` | `Gmail - Leos Firm` |
| 9 | `Marcar la fila como cancelada` | ✅ `api_sheet_aiinovate` | correcta, verificar igual |

n8n **no asigna credenciales a los nodos HTTP Request**, y a los que sí se las asigna les pone la
primera de ese tipo que encuentra — las del equipo de desarrollo, que responden `404` sobre este
calendario y mandan el correo desde la cuenta equivocada. Es la lección del WF3 y del WF4, y aquí
volvió a pasar tal cual ([`scheduling.md`](./scheduling.md) § Manual de puesta en marcha).

> Cómo leer un fallo: **404** = quedó la credencial `aiinovate` · **401/403** = el nodo quedó sin
> credencial · **200** = funciona.

### 8 · `Leos Firm - Consultar cita`

```
Webhook POST /leos-firm/cita   (Header Auth, responseNode)
  → HTTP Request · GET /calendars/{id}/events/{event_id}   (fullResponse + neverError)
  → Code: 404 → { found: false } · si no, parsea summary y description
  → Respond
```

```jsonc
// entra
{ "event_id": "abc123" }
// sale
{
  "found": true,
  "status": "confirmed",
  "start_utc": "2026-09-14T15:00:00.000Z",
  "end_utc": "2026-09-14T16:00:00.000Z",
  "service_name": "Consultoría fiscal para extranjeros",
  "service_slug": "consultoria-fiscal-extranjeros",
  "lead_id": "3f1c8a9e-…",
  "full_name": "Ana Rivera",
  "email": "ana@ejemplo.com",
  "client_timezone": "America/Mexico_City",
  "meeting_url": "https://meet.google.com/xxx-yyyy-zzz"
}
```

**Este workflow existe porque no hay base de datos.** La página necesita mostrar una cita y el token
solo lleva su `eventId`; el único sitio donde esa cita está escrita es el evento de Calendar
(ADR-003). Es la misma razón por la que el WF3 parsea la `description` en vez de recibir los datos.

**`fullResponse` + `neverError`, igual que el WF3.** Un `404` tiene que ser un dato que se enruta y
no una excepción que tumba el flujo: un workflow que revienta no responde, y un webhook sin respuesta
es un `null` en Next.js, es decir un `502` para alguien cuyo enlace era perfectamente válido.

> 💤 **Hereda la fragilidad del parseo de texto plano** que [`payments.md`](./payments.md) § ADR-014
> ya anotó: los datos se sacan del `summary` y de las líneas `Servicio:`, `Slug:`, `Correo:` y
> `Huso del cliente:` de la `description`. La mejora recomendada sigue siendo la misma —
> `extendedProperties.private` en el WF2— y sigue costando lo mismo: republicar el workflow que
> sostiene todo el agendamiento.

### 9 · `Leos Firm - Cancelar cita`

```
Webhook POST /leos-firm/cancelar   (Header Auth, responseNode)
  → HTTP Request · GET del evento                    (fullResponse + neverError)
  → If «El evento todavia existe»  ── no ──▶  Respond 502
  → If «Ya estaba cancelada»       ── sí ──▶  Respond { cancelled: true, alreadyCancelled: true }
  → Code «Armar la cancelacion»    ← las dos horas y el veredicto en palabras
  → HTTP Request · PATCH  summary «CANCELADA — …» + transparency: transparent
  → Sheets · appendOrUpdate en `Leads`: ID · Estado=cancelado · Actualizado
  → Gmail · a claudia@leosfirm.com   ← lleva ≥24 h / <24 h en negrita
  → Gmail · al cliente
  → Respond { cancelled: true }
```

**`transparency: 'transparent'` y no un `DELETE`, y tampoco `status: 'cancelled'`.** Las tres
liberan el hueco, pero solo esta deja rastro:

- Un `DELETE` no tiene deshacer y borra la evidencia de que ahí hubo una cita.
- `status: 'cancelled'` **es un borrado** para la API de Google en un evento simple: el evento deja
  de aparecer en el calendario. No es lo que la palabra sugiere.
- `transparency: 'transparent'` marca el evento como **«Libre»**: el hueco vuelve a ofrecerse
  —Next.js descarta los `transparent` al normalizar la disponibilidad
  ([`scheduling.md`](./scheduling.md) § Trampas de Google Calendar)— y Claudia sigue viendo, en su
  agenda, que ahí había algo y que se canceló.

**El `summary` pasa a `CANCELADA — …`** para que se distinga de un vistazo, y de paso sigue fuera del
filtro del limpiador (WF4), que busca `RESERVA SIN PAGAR` en estado `tentative`. La `description` se
reescribe con la fecha de la cancelación y el veredicto de la política, para que el evento cuente su
propia historia sin salir del calendario.

### 10 · `Leos Firm - Pedir otro horario`

```
Webhook POST /leos-firm/reprogramar   (Header Auth, responseNode)
  → Code «Armar la solicitud»   ← las dos horas + ESCAPA el texto libre
  → Gmail · a claudia@leosfirm.com, replyTo = el correo del cliente
  → Respond { received: true }
```

No toca Calendar ni la hoja: **no ha pasado nada todavía**. Escribir `cancelado` o mover el evento
aquí sería mentir sobre una cita que sigue en pie — y el correo se lo dice a Claudia con esas
palabras, para que no cierre el hueco por su cuenta.

`replyTo` con el correo del cliente es el detalle que hace que esto funcione en la práctica: Claudia
responde el correo y ya está hablando con la persona.

> El `Respond` devuelve **`200`**; el que responde `202` es Next.js. n8n informa de que el correo
> salió, y el endpoint traduce eso a *«la solicitud se aceptó, la reprogramación no ocurrió»*, que es
> lo que el visitante necesita saber.

---

## Manejo de fallos

Mismo criterio que en todo el proyecto: **un fallo nuestro no se convierte en un fallo del
visitante** — con la excepción de que aquí, si no podemos cancelar, hay que decirlo, porque la
persona se quedaría creyendo que canceló.

| Situación | Respuesta |
|---|---|
| Token con firma inválida | Página: `notFound()` · Endpoints: `404 NOT_FOUND` |
| La cita no existe en Calendar | Igual que el anterior, a propósito (§ Por qué `notFound()`) |
| WF8 no responde | Página: `502` con el teléfono de la firma · Endpoints: `502 UPSTREAM_ERROR` |
| WF9 no responde | `502` + teléfono. **La cita sigue viva** y se dice con esas palabras |
| WF9 dice que ya estaba cancelada | `200` con `alreadyCancelled: true`. Es un éxito |
| WF10 no responde | `502` + teléfono. La solicitud no llegó a nadie |
| La cita ya empezó | `409 APPOINTMENT_PAST`. No se cancela ni se reprograma desde aquí (§8) |
| Demasiados intentos | `429 RATE_LIMITED` con `Retry-After` |

---

## Restricciones

- **Ningún reembolso desde un endpoint público** (`03-security.md`). Ninguna llamada a Square vive
  en esta feature.
- **El veredicto de la política se calcula en el servidor, en UTC**, y jamás se acepta del cliente.
- **Nada de PII dentro del token** ni en los logs: `eventId` y `leadId`, nunca nombre ni correo.
- **La comparación del HMAC es en tiempo constante**, como la firma de Square.
- **`cancelado` es terminal.** Ninguna etapa posterior puede degradarla.
- **La lógica de negocio vive en `src/services/`.** Ningún componente llama a n8n ni verifica un
  token (Mandamiento II).
- **UI en español, código en inglés.** La ruta es `/agendar/cita/[token]`, kebab-case en español,
  y ya estaba declarada en `ROUTES.appointment` desde la FASE 1.

---

## Pendiente

- [x] `APPOINTMENT_TOKEN_SECRET` en `src/lib/env.ts`, `.env.example` y la tabla de
      [`../02-architecture.md`](../02-architecture.md)
- [x] `src/lib/utils/appointmentToken.ts` con `timingSafeEqual`
- [x] `access_token` y `appointment_url` en `ConfirmAppointmentPayload`
- [x] `cancelado` en `CrmStage` y `CRM_STAGE_ORDER`, con `canAdvanceStage()`
- [x] Página, los dos endpoints y los componentes
- [x] Los tres webhooks nuevos en `src/lib/n8n/client.ts` y en el mock
- [ ] **Generar `APPOINTMENT_TOKEN_SECRET`** (`openssl rand -base64 32`) y ponerlo en `.env.local`
      **y en Vercel**, con redespliegue. Sin él la página responde `500` — y Vercel no recoge
      variables nuevas en un despliegue ya hecho, que es la lección que ya costó tener el CRM
      guardando cero leads en silencio
- [ ] **Asignar a mano las credenciales de Google** en los nodos de los tres workflows nuevos
- [ ] **Pedir autorización y publicar** los tres workflows (4 Leyes de Operación)
- [ ] Copiar las tres Production URL a `N8N_APPOINTMENT_WEBHOOK_URL`, `N8N_CANCEL_WEBHOOK_URL` y
      `N8N_RESCHEDULE_WEBHOOK_URL`, en `.env.local` y en Vercel
- [ ] 🔧 **Añadir el enlace al correo del WF3**, a mano en la UI (§ El enlace viaja en el correo).
      Mientras no se haga, nadie recibe el enlace aunque todo lo demás funcione
- [ ] Probar de punta a punta con una cita real: abrir el enlace, ver las dos horas distintas,
      cancelar con ≥24 h y comprobar que el hueco vuelve a aparecer en `/agendar`
- [ ] Confirmar con la clienta el texto de los dos correos de cancelación

# Feature: Agendamiento — calendario propio sobre Google Calendar

> **Estado:** ✅ **Las dos mitades se hablan** (2026-08-05). Next.js implementado; `Disponibilidad` y
> `Reservar slot` **publicados** y probados con el contrato definitivo. El ciclo de ADR-011 está
> verificado de punta a punta: se reserva y el hueco desaparece de la disponibilidad.
> **Falta para producción:** poner las dos URLs en Vercel, y cerrar el limpiador (§ Lo que falta)
> **Última actualización:** 2026-08-05
> **Archivos clave:** `src/lib/utils/timezone.ts`, `src/services/availability.service.ts`,
> `src/services/scheduling.service.ts`, `src/app/api/v1/{availability,appointments}/route.ts`,
> `src/components/features/scheduling/`, `src/app/(public)/agendar/page.tsx`
> **Cuenta de Google:** el calendario y las credenciales viven en el **Google Console del cliente,
> cuenta `marco@leosfirm.com`** — ver § Bloque A y ADR-012
> **Decisiones asociadas:** ADR-003 (Calendar es la verdad de la disponibilidad),
> ADR-010 (n8n es la capa de integración), ADR-011 (la retención es un evento tentativo),
> ADR-012 (de quién son las cuentas de Google)
> **Depende de:** [`crm-sheets.md`](./crm-sheets.md) — el `lead_id` ya existe cuando empieza esto

---

## Qué se construye

Un **calendario propio dentro del sitio**. El visitante ve los días con cupo y las horas libres, elige
una y sigue al pago sin salir de la página. Nada de mandarlo a un enlace de Google Calendar: cada
redirección a un dominio ajeno es una oportunidad de abandonar.

**Sin agente de IA.** La disponibilidad es aritmética —horario de oficina menos lo ocupado— y meter un
modelo de lenguaje a decidir horarios sería añadir un punto de falla no determinista a la parte más
frágil del embudo. Coincide con ADR-005: la IA asiste, no decide.

## Reparto de responsabilidades

La regla que ordena todo el diseño:

> **n8n tiene las credenciales. Next.js tiene las reglas de negocio.**

n8n **no** calcula disponibilidad: devuelve los bloques ocupados de Claudia tal como los tiene Google.
Next.js cruza eso con `BUSINESS_HOURS` y arma los slots.

Por qué así y no al revés:

- El horario de oficina ya vive en `src/constants/business.ts` y es la fuente documentada. Duplicarlo
  en un nodo Code de n8n crea dos verdades que se desincronizan la primera vez que Claudia cambia su
  horario.
- La conversión de husos horarios se hace con `date-fns` + `@date-fns/tz`, que ya son dependencias
  aprobadas y se testean. La aritmética de husos escrita a mano dentro de un Code node no.
- n8n queda como lo que es: un proxy con credenciales. Mismo papel que tiene en el CRM.

```
┌─ NAVEGADOR ────────────────┐   ┌─ NEXT.JS ─────────────────┐   ┌─ n8n ─────────┐
│ Elige mes                  │──▶│ GET /api/v1/availability  │──▶│ Ocupados de   │
│ Ve días con cupo           │◀──│ ocupados ∩ BUSINESS_HOURS │◀──│ Calendar      │
│ Elige hora (en SU huso)    │   │ = slots libres            │   └───────────────┘
│ Confirma                   │──▶│ POST /api/v1/appointments │──▶│ Evento        │
└────────────────────────────┘   │ + CRM stage='agenda'      │   │ TENTATIVO     │
                                 └───────────────────────────┘   └───────────────┘
                                              │
                                     pago (Square, FASE siguiente)
                                              │
                                 ┌────────────▼──────────────┐   ┌───────────────┐
                                 │ webhook de Square         │──▶│ Evento        │
                                 │ + CRM stage='pagado'      │   │ CONFIRMADO    │
                                 └───────────────────────────┘   │ + Meet        │
                                                                 └───────────────┘
```

## ADR-011: la retención del slot es un evento tentativo en Google Calendar

**Fecha:** 2026-08-04

**Contexto.** La regla de negocio dice que ninguna cita existe sin pago confirmado, pero entre elegir
la hora y terminar de pagar pasan minutos en los que otro visitante puede llevarse el mismo slot. El
diseño original resolvía esto con una tabla `slot_holds` en Supabase — que ahora está congelado
(ADR-010). Sin base de datos, la retención necesita otro lugar donde vivir.

**Decisión.** El slot se retiene **creando el evento en Google Calendar con `status: 'tentative'`** y
un resumen que lo delata: `RESERVA SIN PAGAR — <nombre>`. Cuando Square confirma el pago, el mismo
evento pasa a `confirmed`, cambia de título y recibe el enlace de Meet. Si el pago no llega, un
workflow programado lo borra.

**Consecuencias.**
- Google Calendar sigue siendo la **única** fuente de verdad de la disponibilidad (ADR-003 intacto):
  la retención ocupa espacio real, así que el siguiente visitante ya no ve ese hueco.
- Claudia ve las reservas sin pagar en su calendario y distingue una cita real de una a medias de un
  vistazo.
- No hace falta base de datos para el bloqueo. Un problema menos y una integración menos.
- **Costo:** un abandono deja basura en el calendario hasta que el limpiador pasa. Por eso el
  limpiador corre cada 10 minutos y el TTL es corto (`SLOT_HOLD_MINUTES`, hoy 10).
- **Carrera pendiente de resolver:** dos personas pueden crear el evento tentativo casi a la vez.
  Google Calendar no impide solapes. La mitigación es revalidar la disponibilidad justo antes de
  crear el evento y aceptar la ventana de riesgo de unos segundos, que a este volumen es teórica.

## Los cuatro workflows de n8n

Los cuatro existen y están probados contra el calendario real (2026-08-05). Los tres primeros son
webhooks que llama Next.js; el cuarto es programado.

| # | Workflow | ID en n8n | Estado |
|---|----------|-----------|--------|
| 1 | `Leos Firm - Disponibilidad` | `hYS8Fk87wUfadriW` | ✅ **PUBLICADO** y probado contra el calendario real |
| 2 | `Leos Firm - Reservar slot` | `5MnPI0yaiahvOybZ` | ✅ **PUBLICADO** y probado con el contrato definitivo |
| 3 | `Leos Firm - Confirmar cita` | `5Tx6yxAmPBMghDBS` | 🔨 Corregido y probado · **sin publicar** — lo dispara Square en la FASE 6 |
| 4 | `Leos Firm - Limpiar reservas vencidas` | `hLWyt2vHv3CrCVBt` | ✅ **PUBLICADO** — corre cada 10 min y ya borró una reserva vencida real |

**El limpiador quedó verificado en la mejor prueba posible** (ejecución 444): con dos reservas
tentativas en el calendario, borró la de 52 minutos y **dejó intacta la de 8 minutos**, en la misma
pasada y solo por antigüedad. Es la demostración de que no mata una reserva que se está pagando.

**Production URLs** (van a `.env.local` y a Vercel):

| Variable | URL |
|----------|-----|
| `N8N_AVAILABILITY_WEBHOOK_URL` | `https://aiwebhookn8n.growingup.digital/webhook/leos-firm/disponibilidad` |
| `N8N_BOOKING_WEBHOOK_URL` | `https://aiwebhookn8n.growingup.digital/webhook/leos-firm/reservar` |

> **Poner las dos o ninguna.** Con solo la de disponibilidad, el visitante ve el calendario, elige
> hora y la reserva le falla al final. Peor que no ofrecerla.

**Conectado y verificado en local el 2026-08-05.** Con las variables puestas, el mock se apaga solo y
`GET /api/v1/availability` del 14 de septiembre devuelve el día **sin la franja de las 15:00Z** — que
es justo donde está la reserva tentativa de prueba. El 15 de septiembre sí la tiene. Es la
demostración de que la cadena completa funciona sobre datos reales, no sobre el mock.

> 🔴 **Falta Vercel.** En producción las tres variables no están, así que el sitio desplegado sigue
> devolviendo `502` en `/agendar` — que es el comportamiento correcto y deliberado: nunca horarios
> inventados. Hay que ponerlas en el panel **y volver a desplegar**.

> ⚠️ **Deuda del WF1: transforma cuando el contrato pide crudo.** Su nodo Code descarta los
> `cancelled` y los `transparency: transparent`, y convierte los eventos de día completo
> (`start.date`) a medianoche UTC. Next.js ya hace las tres cosas, así que hoy es trabajo duplicado
> que **funciona bien** — la conversión cubre de sobra la franja 9-17 `America/Chicago`. Pero el
> § Contrato exacto prefiere la *forma B*, los objetos crudos de Google: menos nodos, menos que se
> rompa. Simplificarlo exige actualizar el workflow (lo que resetea su credencial) y volver a
> publicarlo, así que **queda anotado como deuda, no como fallo**.

Los tres webhooks usan **la misma credencial Header Auth que el CRM** (`Leos Firm - Token del
sitio`, header `x-leosfirm-token`), así que comparten el `N8N_WEBHOOK_TOKEN` que ya existe. No hay
un secreto nuevo que repartir.

### ⚠️ El nodo de Google Calendar no expone `status` — por eso hay HTTP Request

Hallazgo del 2026-08-05, y condiciona el diseño de los workflows 2 y 3:

**`n8n-nodes-base.googleCalendar` v1.3 no tiene el campo `status`.** Solo expone `showMeAs`, que es
`transparency`. Y ADR-011 se sostiene entero sobre `status: 'tentative'`: es lo que distingue una
reserva sin pagar de una cita real y lo que el limpiador usa para encontrarla. El mismo nodo expone
`conferenceData` en `create` pero **no** en `update`, y el workflow 3 lo necesita justo en el update.

La salida es llamar la API de Calendar con un nodo **HTTP Request** configurado con
`authentication: 'predefinedCredentialType'` y `nodeCredentialType: 'googleCalendarOAuth2Api'`. La
credencial sigue viviendo dentro de n8n — **ninguna clave de Google entra a Next.js**
(Mandamiento VIII) — y el contrato con Next.js no cambia en nada.

> Consecuencia operativa: n8n **no auto-asigna credenciales a los nodos HTTP Request**. En los
> workflows 2 y 3 hay que elegir la credencial de Calendar a mano en cada nodo.

### 1. `Leos Firm - Disponibilidad`

```
Webhook POST /leos-firm/disponibilidad   (Header Auth)
  → Google Calendar · event: getAll (timeMin, timeMax del body)
  → Code: normaliza y garantiza un array
  → Respond: [{ start, end, status }]
```

```jsonc
// entra
{ "timeMin": "2026-08-10T00:00:00.000Z", "timeMax": "2026-08-17T00:00:00.000Z" }
// sale
[ { "start": "…", "end": "…", "status": "confirmed" | "tentative" } ]
```

Devuelve los eventos crudos del rango, **incluidos los tentativos** — una reserva sin pagar ocupa
igual. Next.js decide qué hacer con ellos.

Tres detalles que no son opcionales:

- **`recurringEventHandling: 'expand'`.** Sin esto, un bloqueo *recurrente* de Claudia devuelve el
  evento maestro en lugar de sus ocurrencias, y la disponibilidad sale inflada **en silencio**.
- **`alwaysOutputData: true` en el nodo de Calendar.** Con el calendario vacío, cero items cortan la
  rama, el nodo *Respond* nunca dispara y el `fetch` de Next.js se queda colgado hasta el timeout.
  Con esto siempre se responde `[]`.
- **Eventos de día completo.** Google los devuelve como `start.date` (sin hora), no
  `start.dateTime`. Se normalizan a medianoche UTC, que cubre de sobra el horario 9–17
  `America/Chicago`. Se descartan los `cancelled` y los `transparency: transparent`.

### 2. `Leos Firm - Reservar slot`

```
Webhook POST /leos-firm/reservar   (Header Auth)
  → HTTP Request · POST /calendars/{id}/events
      summary: "RESERVA SIN PAGAR — {{ nombre }}"
      status: tentative · transparency: opaque
      description: lead_id, servicio, teléfono, correo
  → Respond: { eventId }
```

```jsonc
// entra
{
  "lead_id": "uuid", "full_name": "…", "email": "…", "phone": "…",
  "service_name": "…", "service_slug": "…",
  "start_utc": "2026-08-12T15:00:00.000Z", "end_utc": "2026-08-12T16:00:00.000Z",
  "client_timezone": "America/Mexico_City"
}
// sale
{ "eventId": "…" }
```

> 🔴 **El workflow todavía NO lee estos nombres.** Hoy espera `nombre`, `correo`, `telefono`,
> `servicio`, `start`, `end` — las claves en español del boceto original. Con las URLs reales
> puestas, `{{ $json.body.start }}` llega vacío y Google devuelve `400`. **Renombrar antes de
> publicar.** El § Contrato exacto manda.

`transparency: opaque` es lo que hace que el hueco desaparezca para el siguiente visitante.
El `eventId` vuelve a Next.js y viaja hasta el webhook de Square.

### 3. `Leos Firm - Confirmar cita`

```
Webhook POST /leos-firm/confirmar   (Header Auth)
  → HTTP Request · PATCH /calendars/{id}/events/{eventId}?conferenceDataVersion=1&sendUpdates=none
      summary: "Consulta — {{ nombre }} — {{ servicio }}"
      status: confirmed · conferenceData: crea el Meet
  → HTTP Request · GET del mismo evento  (de ahí sale el enlace de verdad)
  → Code: arma el correo con las dos horas
  → Gmail: confirmación al cliente + copia a Claudia
  → Respond: { meetingUrl }
```

```jsonc
// entra
{
  "eventId": "…", "lead_id": "uuid", "full_name": "…", "email": "…", "service_name": "…",
  "start_utc": "…", "end_utc": "…", "client_timezone": "America/Mexico_City"
}
// sale
{ "meetingUrl": "https://meet.google.com/…" }
```

Lo dispara el webhook de Square, nunca el navegador (ADR-002).

Por qué son **dos** llamadas y no una: `conferenceDataVersion=1` es obligatorio —sin ese parámetro
Google ignora el bloque `conferenceData` en silencio y el evento queda confirmado pero sin Meet— y
además la creación del Meet es **asíncrona**: el PATCH puede volver con
`createRequest.status: 'pending'` y todavía sin `hangoutLink`. Por eso se relee el evento.

`sendUpdates=none` en las dos llamadas: si se deja en `all`, Google manda su propia invitación y el
cliente recibe **dos correos distintos** por la misma cita.

Probado el 2026-08-05 (ejecución 434). Google devolvió `conferenceData.createRequest.status:
"success"` ya en el propio PATCH, así que la carrera del Meet asíncrono no se materializó — pero la
relectura se mantiene, porque cuesta 300 ms y evita devolver un `meetingUrl` vacío el día que sí
pase.

> ✅ **CORREGIDO el 2026-08-05** al reescribir el WF3 para la FASE 6
> ([`payments.md`](./payments.md) § WF3). El PATCH ahora reescribe la `description` con los mismos
> datos del lead y una línea *«CITA CONFIRMADA. Pago … por USD … el …»*. Lo que decía el bug:
>
> 🐛 **La descripción del evento no se actualizaba.** El PATCH cambiaba `summary` y `status`
> pero **no tocaba `description`**, así que una cita **pagada y confirmada** seguía diciendo:
>
> ```
> RESERVA SIN PAGAR. Pasa a confirmada sola cuando entra el pago de Square.
> Si el pago no llega en 10 minutos, el limpiador la borra.
> ```
>
> Claudia abre el evento en su calendario y lee eso. No rompe nada —el limpiador se guía por el
> `summary`, no por la descripción— pero es exactamente el tipo de detalle que hace desconfiar del
> sistema. **Arreglarlo antes de publicar:** añadir `description` al cuerpo del PATCH con los mismos
> datos del lead y una línea de «Cita confirmada» en lugar de la advertencia.

> ⚠️ **La prueba de los dos husos horarios salió degenerada.** Con `start` el 4 de enero y
> `timezone_cliente: America/Mexico_City`, las dos horas dieron idénticas (`09:00`) — y es
> **correcto**: Ciudad de México ya no aplica horario de verano y en enero Chicago está en CST, así
> que ambas son UTC-6. El formateo en español funciona, pero **la conversión entre husos distintos
> sigue sin verificarse**. Repetir con algo como `Europe/Madrid` o una fecha de julio.

> El texto de los correos es un borrador funcional: el copy final se cierra en la FASE 7.

### 4. `Leos Firm - Limpiar reservas vencidas`

```
Schedule Trigger (cada 10 min)
  → Google Calendar · event: getAll (próximos 60 días)
  → Code: status = tentative Y summary empieza con "RESERVA SIN PAGAR"
          Y creado hace más de SLOT_HOLD_MINUTES
  → Google Calendar · event: delete      ⚠️ DESCONECTADO hasta verificar el filtro
```

Sin este workflow, cada checkout abandonado bloquea una hora de la agenda de Claudia para siempre.
**Es parte del entregable, no un extra.**

**El filtro tiene tres condiciones y las tres importan.** La del prefijo del título no es
redundante: Claudia también crea eventos tentativos a mano desde su Google Calendar —un "quizá"
cualquiera—. Sin ese prefijo, el limpiador le borraría sus propios eventos cada 10 minutos y nadie
entendería por qué. Una cita ya pagada tampoco corre riesgo: el workflow 3 le cambia el título a
`Consulta — …` y el estado a `confirmed`, así que falla dos de las tres condiciones.

> ⚠️ **El nodo de borrar está desconectado a propósito.** Un borrado en el calendario de la clienta
> no tiene deshacer. Antes de conectarlo: ejecutar el workflow a mano y mirar la salida del nodo
> *Filtrar las reservas vencidas* — esa lista es exactamente lo que se va a borrar. Solo cuando se
> vea correcta **con datos reales** se conecta el nodo y recién ahí se publica.

> `SLOT_HOLD_MINUTES = 10` está escrito **dos veces**: en `src/constants/business.ts` y dentro del
> nodo Code de este workflow. Es la única copia fuera del repo y hay que mantenerla a mano.

---

## Contrato exacto entre Next.js y n8n

> **Si estás montando los workflows, esta sección es tu contrato.** Los bloques de arriba describen
> *qué hace* cada workflow; esta describe *qué recibe y qué tiene que devolver*, campo por campo.
> Acordado el **2026-08-05**. Las dos mitades se construyen en paralelo y solo se encuentran aquí:
> cualquier diferencia entre lo que devuelve n8n y lo que espera Next.js es un fallo silencioso.
>
> **Estado (2026-08-05):** contrato cerrado y **las dos mitades implementadas**. Next.js lo cumple;
> los workflows de n8n **todavía no** — el WF2 y el WF3 leen las claves en español del boceto y hay
> que renombrarlas a las de esta sección. **Esta sección es la autoridad**, no los bloques de arriba.

### Las tres llamadas y dónde va cada URL

| # | Workflow | Ruta del webhook | Variable de entorno | Quién lo llama |
|---|----------|------------------|---------------------|----------------|
| 1 | `Leos Firm - Disponibilidad` | `/leos-firm/disponibilidad` | `N8N_AVAILABILITY_WEBHOOK_URL` | `GET /api/v1/availability` |
| 2 | `Leos Firm - Reservar slot` | `/leos-firm/reservar` | `N8N_BOOKING_WEBHOOK_URL` | `POST /api/v1/appointments` |
| 3 | `Leos Firm - Confirmar cita` | `/leos-firm/confirmar` | `N8N_CONFIRM_WEBHOOK_URL` | Webhook de Square (**FASE 6**) |
| 4 | `Leos Firm - Limpiar reservas` | — (Schedule Trigger) | — | Nadie: corre solo cada 10 min |

Las URLs se copian del panel del nodo Webhook, pestaña **Production URL** — nunca la *Test URL*, que
solo responde mientras alguien tiene el editor abierto. Misma trampa que ya costó una sesión con el
CRM ([`crm-sheets.md`](./crm-sheets.md) § Configuración).

**Autenticación:** los tres usan la credencial **Header Auth** que ya existe,
`Leos Firm - Token del sitio` (header `x-leosfirm-token`, valor = `N8N_WEBHOOK_TOKEN`). No hace falta
crear una nueva: es el mismo secreto para todos los webhooks del proyecto.

### ⚠️ Tres cosas que hay que configurar o el contrato no se cumple

**1. El nodo Webhook tiene que responder con el nodo `Respond to Webhook`.**
En el nodo Webhook, campo **Respond** → elegir **«Using 'Respond to Webhook' Node»**. Con el valor por
defecto («Immediately») n8n contesta `{ "message": "Workflow got started" }` **antes** de consultar
Calendar. Next.js recibiría un `200` sin datos y mostraría el calendario vacío sin ningún error a la
vista. El CRM no tiene este problema porque a Next.js le basta con el `200`; acá el **cuerpo** es el
dato.

**2. Hay 8 segundos.** `src/lib/n8n/client.ts` aborta a los `8 000 ms` — un visitante esperando a que
cargue el calendario no aguanta más. Si el rango de fechas hace que Calendar tarde, conviene acotarlo
en el propio workflow antes que subir el timeout.

**3. Los eventos de día completo no traen hora.** Ver § Trampas de Google Calendar, más abajo. Es el
fallo más caro de los tres porque **no se ve**: produce doble reserva, no un error.

### 1 · `Leos Firm - Disponibilidad`

**Lo que manda Next.js** (`POST`, JSON):

```json
{
  "timeMin": "2026-08-10T00:00:00.000Z",
  "timeMax": "2026-09-10T00:00:00.000Z"
}
```

Siempre UTC, siempre ISO-8601 con `Z`. El rango nunca pasa de 31 días.

**Lo que Next.js espera de vuelta** — una lista de bloques ocupados. Se aceptan **dos formas**, a
propósito, para que no dependa de cómo quede armado el workflow:

*Forma A — plana (preferida, un nodo `Set` después de Calendar):*

```json
[
  { "start": "2026-08-10T14:00:00.000Z", "end": "2026-08-10T15:00:00.000Z", "status": "confirmed" },
  { "start": "2026-08-11T16:00:00.000Z", "end": "2026-08-11T17:00:00.000Z", "status": "tentative" }
]
```

*Forma B — los objetos crudos de Google, tal como salen del nodo Calendar:*

```json
[
  {
    "start": { "dateTime": "2026-08-10T09:00:00-05:00" },
    "end":   { "dateTime": "2026-08-10T10:00:00-05:00" },
    "status": "confirmed",
    "transparency": "opaque"
  }
]
```

**La forma B es perfectamente válida y probablemente la más segura**: menos nodos, menos que se
rompa, y Next.js normaliza. También se acepta envuelto en `{ "busy": [...] }` por si el
`Respond to Webhook` termina anidando. Una lista vacía `[]` es una respuesta correcta y significa
"no hay nada ocupado en ese rango".

**Devolver los tentativos.** Una reserva sin pagar ocupa igual (ADR-011). No filtrar por `status`.

### 2 · `Leos Firm - Reservar slot`

**Lo que manda Next.js:**

```json
{
  "lead_id": "3f1c8a9e-77b4-4c21-9a2e-0d5b6f8c1234",
  "full_name": "Ana Rivera",
  "email": "ana@ejemplo.com",
  "phone": "+52 55 1234 5678",
  "service_name": "Consultoría fiscal para extranjeros",
  "service_slug": "consultoria-fiscal-extranjeros",
  "start_utc": "2026-08-12T14:00:00.000Z",
  "end_utc": "2026-08-12T15:00:00.000Z",
  "client_timezone": "America/Mexico_City"
}
```

> ⚠️ **Las claves van en inglés y en `snake_case`**, igual que el payload del CRM. El boceto del
> workflow de arriba dice `summary: "RESERVA SIN PAGAR — {{ nombre }}"`: eso era pseudocódigo. La
> expresión real es **`{{ $json.body.full_name }}`**. Un `{{ nombre }}` literal deja el título del
> evento vacío y Claudia ve *"RESERVA SIN PAGAR — "* sin saber de quién es.

**Lo que Next.js espera de vuelta:**

```json
{ "eventId": "abc123def456" }
```

También se acepta **`{ "id": "..." }`**, que es como lo devuelve el nodo de Google Calendar sin
renombrar nada. Si vuelve cualquiera de las dos, la reserva se da por hecha.

**Sin `eventId` no hay reserva.** Si la respuesta no trae ninguno de los dos campos, Next.js trata la
llamada como fallida y le dice al visitante que llame por teléfono, aunque el evento se haya creado
en Calendar. Preferimos un hueco fantasma que el limpiador borra en 10 minutos, antes que decirle a
alguien que tiene cita cuando no podemos demostrarlo.

**Qué tiene que quedar en el evento:**

| Campo de Calendar | Valor |
|---|---|
| `summary` | `RESERVA SIN PAGAR — {{ $json.body.full_name }}` |
| `start` / `end` | `start_utc` / `end_utc` |
| `status` | `tentative` |
| `transparency` | `opaque` ← **es lo que hace que el hueco desaparezca** |
| `description` | `lead_id`, `service_name`, `phone`, `email` |

Si `transparency` queda en `transparent`, Google marca el evento como "libre", el workflow de
disponibilidad lo devuelve igual pero **Next.js lo va a ignorar** (ver trampas), y dos personas
pueden llevarse el mismo horario.

### 3 · `Leos Firm - Confirmar cita` (FASE 6, para que quede montado ya)

**Lo que mandará el webhook de Square** — nunca el navegador (ADR-002):

```json
{
  "eventId": "abc123def456",
  "lead_id": "3f1c8a9e-77b4-4c21-9a2e-0d5b6f8c1234",
  "full_name": "Ana Rivera",
  "email": "ana@ejemplo.com",
  "service_name": "Consultoría fiscal para extranjeros"
}
```

**Lo que se espera de vuelta:** `{ "meetingUrl": "https://meet.google.com/xxx-yyyy-zzz" }`

El contrato de este puede moverse cuando se construya la FASE 6 — es el único de los cuatro que
todavía no tiene un consumidor escrito.

> ⚠️ **Se movió** (2026-08-05, [`payments.md`](./payments.md) § ADR-014). El webhook de Square no
> conoce el nombre ni el correo del cliente, y meter esa PII en la metadata de Square no es opción.
> El WF3 pasa a recibir `{ eventId, lead_id, payment_id, amount_usd, paid_at }` y saca el resto del
> propio evento tentativo. Además tiene que mandar **`If-Match` con el ETag** en el PATCH: es lo que
> hace idempotente la confirmación sin base de datos (ADR-013). **Los dos cambios van antes de
> publicarlo.**

### Trampas de Google Calendar que resuelve Next.js

Van documentadas acá para que **no** se resuelvan dos veces. Next.js normaliza los tres casos, así
que el workflow puede devolver los eventos crudos sin filtrar nada:

| Caso | Qué manda Google | Qué hace Next.js |
|---|---|---|
| **Evento de día completo** | `start: { "date": "2026-08-12" }`, **sin `dateTime`** | Lo trata como ocupado de 00:00 a 24:00 en `America/Chicago`. Si se leyera solo `dateTime`, el bloqueo desaparecería y el día se ofrecería libre → **doble reserva** |
| **Evento cancelado** | `status: "cancelled"` | Lo descarta. Google los sigue devolviendo un tiempo; contarlos bloquearía huecos que están libres |
| **Evento marcado «Libre»** | `transparency: "transparent"` | Lo descarta. Es la semántica de Google: ese evento no ocupa agenda |

El primero es el peligroso: los otros dos hacen perder ventas, ese hace vender dos veces la misma
hora.

### Lo que Next.js hace cuando n8n no responde

Mismo criterio que el CRM: **un fallo nuestro no se convierte en un fallo del visitante**.

| Situación | Respuesta al visitante |
|---|---|
| Disponibilidad no responde / da error | `502` + mensaje amable + **teléfono de la firma** |
| Reservar no responde | `502` + teléfono. **No se retuvo nada** — no hay que compensar |
| Reservó bien pero el CRM falla | `201` con `crmDelivery: "failed"`. La cita sigue viva; se pierde la fila |
| El slot se lo llevaron entre medias | `409` + horarios alternativos del mismo día |

### Mientras no existan las URLs: el mock

La mitad de Next.js se construye contra este contrato **antes** de que los workflows existan, con un
mock aislado en `src/lib/n8n/mock.ts`.

**Cuándo entra el mock:** cuando falta la variable de entorno **y** no estamos en producción.

```
¿hay N8N_AVAILABILITY_WEBHOOK_URL?  ── sí ──▶ n8n de verdad
            │
            no
            ▼
    ¿NODE_ENV = production?  ── sí ──▶ 502 + teléfono (nunca horarios falsos)
            │
            no
            ▼
    mock (ocupados deterministas, con un día lleno para ver el caso "sin cupo")
```

**Cambiar al webhook real es poner la variable y volver a desplegar. No se toca código.**

En producción el mock **no puede** activarse por diseño: un sitio publicado que ofrece horarios
inventados y finge reservar es peor que uno que dice "llámanos". Es la misma lección de las variables
que faltaban en Vercel y dejaron el CRM guardando cero leads en silencio.

---

### Lo que falta para publicar

- [x] Bloques A y B resueltos: credencial y `GOOGLE_CALENDAR_ID` reales
- [x] Calendar ID real en los 5 nodos que lo llevan
- [x] Credencial de Calendar elegida a mano en los nodos HTTP Request
- [x] Prueba mínima: lectura, escritura y `status: tentative` verificados
- [x] WF3 probado de punta a punta: Meet creado y correo enviado
- [ ] 🐛 **Arreglar la descripción del evento en el WF3** (sigue diciendo «RESERVA SIN PAGAR» después
      de pagar)
- [ ] Repetir la prueba del WF3 con husos horarios **realmente distintos** — la primera salió
      degenerada
- [ ] **Borrar el evento de prueba** `fnrat2iln058co1enpgj5qg1ac` (4 de enero de 2027). El limpiador
      **no** lo va a recoger: está fuera de su ventana de 60 días, que es justamente lo que se quería
      al ponerlo tan lejos
- [ ] Restaurar el **CC a `claudia@leosfirm.com`** en el nodo de Gmail — se quitó para poder probar
      sin mandarle una confirmación falsa
- [ ] Verificar el WF4 con una reserva de más de 10 minutos dentro de la ventana de 60 días, mirar la
      lista del filtro, y **solo entonces** conectar el nodo de borrar
- [x] Campos del WF2 y el WF3 renombrados al `snake_case` en inglés del § Contrato exacto
- [x] 🐛 Descripción del evento corregida en el WF3 y **CC a Claudia restaurado**
- [x] **WF1 y WF2 publicados** y probados con el contrato definitivo
- [x] **Ciclo ADR-011 verificado de punta a punta**: reservar → el hueco desaparece de la
      disponibilidad
- [ ] **Borrar el evento de prueba** `jopd89gge2hud9jkddlr14s72k` (14 de septiembre de 2026). Este
      **sí** está dentro de la ventana del limpiador — sirve para la verificación de abajo
- [ ] Verificar el WF4: esperar a que la reserva de prueba pase de 10 minutos, ejecutarlo a mano,
      comprobar que el filtro la lista, y **solo entonces** conectar el nodo de borrar y publicar
- [ ] Repetir la prueba del WF3 con husos horarios **realmente distintos** — la primera salió
      degenerada
- [ ] Comprobar con `curl` real que el WF1 devuelve el array en la raíz del body (Next.js acepta las
      dos formas, así que no es bloqueante)
- [ ] Pasar las Production URLs a `.env.local` **y a Vercel**, y **volver a desplegar**

## Endpoints de Next.js

| Método | Ruta | Qué hace |
|--------|------|----------|
| GET | `/api/v1/availability?from&to&tz` | Ocupados de n8n ∩ `BUSINESS_HOURS` = slots libres, en UTC y en el huso del cliente |
| POST | `/api/v1/appointments` | Revalida el slot → reserva tentativa en n8n → CRM `stage='agenda'` → devuelve `eventId` |

Detalle de contratos en [`../API_DOCS.md`](../API_DOCS.md) cuando se implementen.

## Reglas de husos horarios

Sin cambios respecto a `02-architecture.md`, y son la parte del diseño donde es más fácil equivocarse:

- Los slots se **calculan** en `America/Chicago` (horario de oficina de la firma).
- Se **presentan** en el huso del navegador, detectado con `Intl.DateTimeFormat().resolvedOptions().timeZone`.
- La confirmación muestra **siempre las dos horas**: la del cliente y la de San Antonio.
- Todo pasa por `src/lib/utils/timezone.ts`. Nunca `new Date(string)` a mano.
- El horario de verano no se calcula: lo resuelve `@date-fns/tz` con la base de datos IANA.

## Cómo quedó construido

```
NAVEGADOR                          SERVIDOR                        n8n
─────────                          ────────                        ───
BookingFlow ── useAvailability ──▶ GET  /api/v1/availability ──▶ (mock por ahora)
  ├─ TimezoneNotice                     └─ fetchBusyBlocks
  ├─ AvailabilityCalendar               └─ buildAvailability   ← toda la aritmética
  ├─ SlotPicker                              (función PURA)
  └─ BookingForm ─────────────────▶ POST /api/v1/appointments ──▶ (mock por ahora)
                                         └─ isSlotBookable    ← revalida
                                         └─ holdSlot
                                         └─ syncAppointmentToCrm (n8n real)
```

| Archivo | Qué hace |
|---------|----------|
| `src/lib/utils/timezone.ts` | Única puerta a las fechas. `TZDate` para calcular, `Intl` para presentar |
| `src/services/availability.service.ts` | **Pura**: ocupados ∩ `BUSINESS_HOURS`. Sin red, sin reloj propio |
| `src/services/scheduling.service.ts` | Lo que sí toca n8n: pedir ocupados, apartar el slot |
| `src/services/appointment.service.ts` | El lado del navegador: habla con **nuestra** API, nunca con n8n |
| `src/hooks/useAvailability.ts` | Estado del mes en pantalla; cancela peticiones viejas |
| `src/lib/validation/appointment.schema.ts` | El mismo Zod en cliente y servidor |
| `src/lib/n8n/mock.ts` | ⚠️ Temporal. Se borra cuando existan los webhooks |

```
src/components/features/scheduling/
├── BookingFlow/             # Orquesta mes → día → hora → confirmar
├── AvailabilityCalendar/    # Rejilla del mes; marca los días con cupo
├── SlotPicker/              # Horas del día elegido, en el huso del visitante
├── BookingForm/             # Confirma contacto y registra la aceptación de la política
└── TimezoneNotice/          # "Ves los horarios en <tu huso>. Claudia atiende en San Antonio."
```

`BookingForm` no estaba en el diseño original: hace falta porque la aceptación de la política es
entregable de esta fase y tiene que ocurrir en algún sitio. Ningún componente habla con la red
(Mandamiento II).

### Decisiones que tomó la implementación

- **`toUtcIso()` existe por una trampa real.** `TZDate` **sobrescribe** `toISOString()` y devuelve
  `2026-08-12T09:00:00.000-05:00` en vez de `...T14:00:00.000Z`. Nombran el mismo instante, pero
  todo lo que sale de la app está documentado como UTC. Nunca llamar `.toISOString()` sobre un
  `TZDate`.
- **Los días se agrupan por el huso del VISITANTE**, no por el de la firma. Un hueco de las 10:00 en
  San Antonio ya es el día siguiente en Tokio, y tiene que aparecer en el cuadrito que esa persona
  miraría. Por eso `tz` es parámetro del endpoint.
- **`isSlotBookable` está construido ENCIMA de `buildAvailability`.** Una segunda implementación de
  la misma regla se desincroniza el día que cambie el horario de oficina; así, lo que se ofrece y lo
  que se acepta son literalmente el mismo cálculo.
- **`null` ≠ `[]` al pedir ocupados.** `[]` es "la agenda está libre"; `null` es "no pudimos
  preguntar". Convertir el segundo en el primero mostraría una agenda abierta construida sobre
  ninguna información. Por eso un fallo de n8n devuelve `502` y el teléfono.
- **Quien llega a `/agendar` sin diagnóstico** recibe un `leadId` nuevo, y la etapa `agenda` escribe
  también nombre, correo y teléfono — si no, Claudia vería una cita bajo un UUID pelado.

## Qué falta para que esto sea real

| # | Pendiente | De quién depende |
|---|-----------|------------------|
| 1 | Los 4 workflows de n8n + credencial de Calendar | Equipo de n8n · § Manual de puesta en marcha |
| 2 | `N8N_AVAILABILITY_WEBHOOK_URL` y `N8N_BOOKING_WEBHOOK_URL` en `.env.local` y en Vercel | — |
| 3 | Las 2 columnas nuevas de la hoja del CRM | Equipo de n8n · [`crm-sheets.md`](./crm-sheets.md) |
| 4 | Pago con Square: hoy la pantalla final ofrece el teléfono | FASE 6 |
| 5 | Confirmar `bufferMinutes` con la clienta | § Bloque C, decisión 6 |

**Nada de eso exige tocar el código de Next.js.** El punto 2 es poner dos variables y volver a
desplegar; el mock deja de usarse solo.

## Restricciones

- **La disponibilidad no se cachea entre visitantes.** Claudia también agenda a mano y por otros
  canales (ADR-003); un slot con 30 segundos de antigüedad es un slot que puede estar vendido.
- **El servidor revalida el slot antes de reservar.** El navegador no decide qué está libre.
- **La cita no se confirma sin pago** (`context.md` §8). El evento tentativo no es una cita.
- **La aceptación de la política de cancelación** se registra en este paso con `accepted_at` e IP —
  no en el diagnóstico.
- **Un fallo de n8n no puede dejar un cobro sin cita.** Si Square confirma y la confirmación en
  Calendar falla, el pago está hecho y hay que compensar: registrar el fallo y avisar a Claudia. Esto
  se define al construir el webhook de Square.

## Manual de puesta en marcha

Lo que hay que tener resuelto **antes** de escribir la primera línea. Los bloques A y B son
bloqueantes; el C se puede asumir con valores por defecto y ajustar después.

### Estado de la puesta en marcha (2026-08-05)

**✅ El criterio de entrada de la FASE 5 está cumplido y verificado con llamadas reales.**

| Requisito | Estado | Detalle |
|-----------|--------|---------|
| `GOOGLE_CALENDAR_ID` real | ✅ | `c_4a1fcc0c…cbabfaf@group.calendar.google.com` — calendario **«Consultas Leos Firm»**, dedicado |
| Credencial de Calendar | ✅ | `Google Calendar - Leos Firm`, cuenta `marco@leosfirm.com` |
| Credencial de Gmail | ✅ | `Gmail - Leos Firm` — creada, **todavía sin probar** |
| Credencial Header Auth compartida | ✅ | `Leos Firm - Token del sitio`, la misma del CRM |
| Consentimiento OAuth | ✅ | `leosfirm.com` **es Google Workspace** → tipo *Interno*. El refresh token **no caduca**: el riesgo de los 7 días no aplica |

Prueba real del 2026-08-05 (ejecuciones 431, 432 y 433 en n8n):

```
WF1 Disponibilidad → 200, [] sobre el calendario vacío   ← lectura OK
WF2 Reservar slot  → creó el evento fnrat2iln058co1enpgj5qg1ac
                     "status": "tentative"               ← ADR-011 CONFIRMADO
                     organizer: "Consultas Leos Firm"
                     creator:   marco@leosfirm.com
WF4 Limpiador      → filtro devolvió [] con la reserva recién creada
                     (21 segundos de antigüedad)         ← la condición de TTL funciona
```

**La trampa del `drive.file` efectivamente no aplica a Calendar.** Queda verificado con una llamada
real, no por teoría: la credencial crea eventos en un calendario que ella no creó.

> ⚠️ **La credencial se pierde en cada actualización desde el MCP.** Al crear o actualizar un
> workflow por el SDK, n8n **ignora el nombre** que se le pide y asigna la primera credencial de ese
> tipo que encuentra — en esta instancia, `api_google_calendar_aiinovate`, que es del equipo de
> desarrollo y responde **404** sobre este calendario.
>
> Consecuencia operativa: **elegir la credencial a mano es siempre el último paso**, después de
> cualquier cambio hecho desde el MCP. Y n8n **no auto-asigna nada** a los nodos HTTP Request: esos
> nacen sin credencial y hay que elegirla sí o sí.
>
> Cómo leer un fallo: **404** = quedó la credencial `aiinovate` · **401/403** = el nodo quedó sin
> credencial · **200 con `[]`** = funciona y el calendario está vacío.

Cuando los webhooks estén publicados, Next.js necesitará sus URLs de producción en dos variables
nuevas (nombres sugeridos, los fija quien construya la mitad de Next.js):
`N8N_AVAILABILITY_WEBHOOK_URL` y `N8N_APPOINTMENTS_WEBHOOK_URL`. El token es el
`N8N_WEBHOOK_TOKEN` que ya existe. Y como siempre: **también hay que ponerlas en Vercel**, y volver
a desplegar.

> La zona horaria de la instancia de n8n es **`America/Sao_Paulo`**. No afecta a nada: todos los
> cálculos de tiempo usan `DateTime.utc()` o `$now.toISO()`, que son instantes absolutos. Pero
> conviene saberlo antes de leer un log y asustarse.

### Bloque A · Credencial de Google Calendar en n8n

> **Cuenta definida (2026-08-05):** el calendario y sus credenciales van en el **Google Console del
> cliente, bajo `marco@leosfirm.com`** — dominio de la firma, no una cuenta personal del equipo de
> desarrollo. Es lo contrario de lo que pasó con la hoja del CRM, y es lo correcto: ver
> **ADR-012** y [`crm-sheets.md`](./crm-sheets.md) § Propiedad de la hoja.

> **La trampa del `drive.file` NO aplica aquí.** La credencial de Google Calendar pide permiso
> completo sobre calendarios, no el permiso por-archivo que rompió el CRM. Por eso aquí un
> calendario **compartido sí funciona**. Aun así: **verificarlo con una llamada real** antes de dar
> nada por hecho (§ Verificación antes de codear).

Con la cuenta ya decidida, quedan dos formas de conectarla. Ambas terminan en una credencial de n8n
que escribe en el calendario de la firma; cambian en **de quién es la aplicación OAuth** que pide el
permiso.

**Camino A1 — cliente OAuth propio en el Google Console de `marco@leosfirm.com` (lo acordado)**

La firma es dueña del proyecto de Google, de la pantalla de consentimiento y del cliente OAuth. Nada
del flujo depende de una aplicación ajena.

1. Entrar a **console.cloud.google.com** con `marco@leosfirm.com`
2. Crear (o elegir) un proyecto — sugerido: `leos-firm-web`
3. **APIs y servicios** → *Biblioteca* → habilitar **Google Calendar API**
   (habilitar también **Gmail API** si los correos de la FASE 7 salen de aquí)
4. **Pantalla de consentimiento OAuth** → tipo **Interno** si `leosfirm.com` es Google Workspace;
   **Externo** si es una cuenta suelta — en ese caso añadir a `marco@leosfirm.com` como usuario de
   prueba **o publicar la app**, porque en modo *Testing* el token **caduca a los 7 días** y el
   agendamiento se cae solo un martes cualquiera
5. **Credenciales** → *Crear credenciales* → **ID de cliente de OAuth** → tipo **Aplicación web**
6. En **URI de redireccionamiento autorizados**, pegar la URL que muestra n8n en el panel de la
   credencial (campo *OAuth Redirect URL*). **Copiarla de n8n, no escribirla a mano** — un carácter
   de diferencia y Google responde `redirect_uri_mismatch`
7. Copiar **Client ID** y **Client Secret** a la credencial de n8n:
   **Credentials** → *Add credential* → **Google Calendar OAuth2 API**
8. *Sign in with Google* **con `marco@leosfirm.com`** → aceptar los permisos
9. Nombrarla `Google Calendar - Leos Firm (marco@leosfirm.com)` → *Save*

**Camino A2 — la aplicación OAuth que trae n8n (más rápido, sirve para desarrollar)**

Se salta los pasos 1 a 6: se crea la credencial en n8n y se firma igual con `marco@leosfirm.com`. El
calendario y los datos siguen siendo de la firma; lo que no es suyo es la aplicación que pide el
permiso. Vale para probar el flujo; para producción se prefiere A1, que es lo acordado.

> **Si hace falta desarrollar desde otra cuenta:** Claudia o Marco comparten el calendario
> (Google Calendar → ⚙ *Configuración* → el calendario → **Compartir con determinadas personas**)
> con permiso **«Hacer cambios en los eventos»** — «Ver todos los detalles» **no** alcanza, porque
> hay que crear y borrar eventos. El dueño del calendario no cambia.

### Bloque B · `GOOGLE_CALENDAR_ID`

Se saca del calendario que vive en la cuenta del Bloque A:

1. Google Calendar, **con `marco@leosfirm.com`** → ⚙ **Configuración**
2. Barra izquierda: clic en el calendario que se va a usar
3. Bajar hasta **«Integrar calendario»**
4. Copiar **ID de calendario**

Es el correo (`marco@leosfirm.com`) si es el calendario principal de esa cuenta, o
`c_a1b2c3…@group.calendar.google.com` si es uno secundario — que es lo recomendado:

> **Usar un calendario dedicado a las consultas, no el personal de nadie.** El sitio lee la
> disponibilidad **completa** del calendario que le indiquemos, y ADR-011 crea y borra eventos en él.
> Con uno dedicado (sugerido: **«Consultas Leos Firm»**), los compromisos privados quedan fuera del
> alcance del sistema. Crear uno: *Otros calendarios* → **+** → *Crear calendario*, y darle a Claudia
> permiso de **«Hacer cambios en los eventos»** para que vea y gestione las citas desde su cuenta.

> ⚠️ **`GOOGLE_CALENDAR_ID` sigue sin confirmar.** El `.env` local todavía tiene
> `claudia@leosfirm.com`, que viene de la plantilla y **no** corresponde a este montaje.
> Reemplazarlo por el ID real de la cuenta de Marco antes de la primera prueba — y acordarse de que
> el valor va **además** dentro de los 5 nodos de n8n que hoy dicen
> `REEMPLAZAR_CON_GOOGLE_CALENDAR_ID`, porque los workflows no leen el `.env`.

### Bloque C · Decisiones de negocio

| # | Decisión | Valor por defecto si no se define |
|---|----------|-----------------------------------|
| 1 | Horario de atención | Lunes a viernes, 9:00–17:00 `America/Chicago` (`BUSINESS_HOURS`) |
| 2 | Anticipación mínima para agendar | 24 h |
| 3 | Ventana máxima hacia adelante | 60 días |
| 4 | Duración de la sesión | 60 min para los 8 servicios |
| 5 | Días u horas bloqueados fijos | Ninguno |
| 6 | ¿Se respeta `bufferMinutes` entre citas? | **No** — ver abajo |

#### ⚠️ Decisión 6: `bufferMinutes` está en conflicto consigo mismo

`BUSINESS_HOURS` (`src/constants/business.ts`) declara `bufferMinutes: 15` y lo describe como
*"gap between appointments"*, pero también declara `slotIntervalMinutes: 60` con sesiones de 60
minutos. **Los dos no caben:** si las citas empiezan cada hora y duran una hora, no queda hueco
donde meter 15 minutos.

Aplicar el buffer literalmente tendría un costo de negocio grande y nada evidente: una cita a las
9:00 invalidaría la de las 10:00, y la agenda de Claudia pasaría de **8 huecos al día a 4**.

**Lo que hace el código mientras tanto:** calcula solape estricto — un slot está libre si no se pisa
con ningún evento. `bufferMinutes` queda declarado pero **sin usar**, y anotado como tal en el
código para que nadie crea que se olvidó.

**Lo que hay que preguntarle a la clienta:** ¿quiere un descanso real entre consultas? Si la
respuesta es sí, lo correcto **no** es aplicar el buffer al cálculo, sino acortar la sesión a 45
minutos dentro del hueco de 60 — se conservan los 8 huecos diarios y el descanso es real. Es un
cambio de `durationMinutes` en el catálogo, no de la aritmética.

### Verificación antes de codear

Con la credencial creada, comprobar que **lee y escribe de verdad** antes de construir encima —
la lección de la noche del 2026-08-04 es que una credencial que "existe" no es una credencial que
funcione:

1. Workflow desechable de un nodo: Google Calendar → `event: getAll` sobre el calendario objetivo.
2. Si devuelve eventos (o una lista vacía sin error), leer funciona.
3. Segundo nodo: `event: create` con un evento de prueba → borrarlo.
4. Si ambos pasan, el Bloque A está resuelto.

**Qué mirar si falla, según el camino elegido:**

| Síntoma | Causa probable |
|---------|----------------|
| `redirect_uri_mismatch` al firmar | La URI de redireccionamiento del Console no es idéntica a la que muestra n8n (camino A1, paso 6) |
| `Calendar API has not been used in project…` | Falta habilitar la Google Calendar API en el proyecto (paso 3) |
| Funcionó y a la semana dejó de funcionar | Pantalla de consentimiento en modo *Testing*: el refresh token caduca a los 7 días (paso 4) |
| `404 Not Found` sobre el calendario | `GOOGLE_CALENDAR_ID` equivocado, o el calendario no pertenece ni está compartido con la cuenta de la credencial |
| Lee pero no puede crear eventos | Calendario compartido con «Ver todos los detalles» en vez de «Hacer cambios en los eventos» |

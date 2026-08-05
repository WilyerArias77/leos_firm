# Feature: Agendamiento — calendario propio sobre Google Calendar

> **Estado:** 📐 Diseñado, sin implementar
> **Última actualización:** 2026-08-05
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

Ninguno está creado todavía. Los tres primeros son webhooks que llama Next.js; el cuarto es
programado.

### 1. `Leos Firm - Disponibilidad`

```
Webhook POST /leos-firm/disponibilidad
  → Google Calendar · event: getAll (timeMin, timeMax del body, calendario de Claudia)
  → Respond: [{ start, end, status }]
```

Devuelve los eventos crudos del rango, **incluidos los tentativos** — una reserva sin pagar ocupa
igual. Next.js decide qué hacer con ellos.

### 2. `Leos Firm - Reservar slot`

```
Webhook POST /leos-firm/reservar
  → Google Calendar · event: create
      summary: "RESERVA SIN PAGAR — {{ nombre }}"
      status: tentative · transparency: opaque
      description: lead_id, servicio, teléfono, correo
  → Respond: { eventId }
```

`transparency: opaque` es lo que hace que el hueco desaparezca para el siguiente visitante.
El `eventId` vuelve a Next.js y viaja hasta el webhook de Square.

### 3. `Leos Firm - Confirmar cita`

```
Webhook POST /leos-firm/confirmar
  → Google Calendar · event: update (eventId)
      summary: "Consulta — {{ nombre }} — {{ servicio }}"
      status: confirmed · conferenceData: crea el Meet
  → Gmail: confirmación al cliente + copia a Claudia
  → Respond: { meetingUrl }
```

Lo dispara el webhook de Square, nunca el navegador (ADR-002).

### 4. `Leos Firm - Limpiar reservas vencidas`

```
Schedule Trigger (cada 10 min)
  → Google Calendar · event: getAll (próximos 60 días)
  → Filter: status = tentative Y creado hace más de SLOT_HOLD_MINUTES
  → Google Calendar · event: delete
```

Sin este workflow, cada checkout abandonado bloquea una hora de la agenda de Claudia para siempre.
**Es parte del entregable, no un extra.**

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

## Componentes previstos

```
src/components/features/scheduling/
├── AvailabilityCalendar/    # Rejilla del mes; marca los días con cupo
├── SlotPicker/              # Horas del día elegido, en el huso del visitante
└── TimezoneNotice/          # "Ves los horarios en <tu huso>. Claudia atiende en San Antonio."
```

`useAvailability.ts` (hook) trae los slots; `appointment.service.ts` hace las llamadas. Los
componentes no hablan con la red (Mandamiento II).

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

> ⚠️ **`GOOGLE_CALENDAR_ID` del `.env` no está confirmado.** El valor de `.env.example` es
> `claudia@leosfirm.com`, que es de la plantilla y **no** de este montaje. Reemplazarlo por el ID
> real de la cuenta de Marco antes de la primera prueba.

### Bloque C · Decisiones de negocio

| # | Decisión | Valor por defecto si no se define |
|---|----------|-----------------------------------|
| 1 | Horario de atención | Lunes a viernes, 9:00–17:00 `America/Chicago` (`BUSINESS_HOURS`) |
| 2 | Anticipación mínima para agendar | 24 h |
| 3 | Ventana máxima hacia adelante | 60 días |
| 4 | Duración de la sesión | 60 min para los 8 servicios |
| 5 | Días u horas bloqueados fijos | Ninguno |

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

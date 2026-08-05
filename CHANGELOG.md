# Changelog — Leos Firm LLC

> Formato: [Semantic Versioning](https://semver.org/)
> Cada entrada incluye: fecha, tipo de cambio, archivos afectados y request original.
> **Mandamiento IV:** cada request que modifique código genera una entrada aquí.

---

## [2026-08-05] — De quién son las cuentas de Google — v0.4.3

### Request original
> google sheet donde se esta guardando la informacion de los formularios esta en el drive de
> wilyerernestoarias@gmail.com, el google calendar va a estar en el google console del cliente
> marco@leosfirm.com, por favor documenta esto usando el metodo ainnovate y subelo a github

### Tipo de cambio
- **ADDED (docs)**: **ADR-012** — las dos integraciones de Google viven en cuentas de dueños
  distintos. Queda escrito **quién es dueño de qué**, por qué, y cuál es la ruta de salida
- **DOCUMENTED (riesgo)**: la hoja del CRM —con la PII de los clientes de la firma— es propiedad de
  `wilyerernestoarias@gmail.com`, una cuenta personal del equipo de desarrollo. No fue una elección
  de diseño: es la consecuencia del permiso `drive.file`. Pasa a ser **deuda con dueño y fecha**
  (migrar después de la FASE 5), no un detalle implícito
- **DOCUMENTED (decisión)**: el calendario y sus credenciales van en el **Google Console del cliente,
  `marco@leosfirm.com`**. El manual de la FASE 5 se reescribe alrededor de esa cuenta
- **ADDED (docs)**: procedimiento completo del cliente OAuth propio (habilitar la API, pantalla de
  consentimiento, URI de redireccionamiento) y tabla de diagnóstico de los 5 fallos típicos

### Archivos modificados
- `docs/02-architecture.md` — ADR-012 completo; `GOOGLE_CALENDAR_ID` con su cuenta dueña
- `docs/03-security.md` — nueva sección **«Propiedad de las cuentas de Google»** con el inventario de
  dueños; dos filas nuevas en el modelo de amenazas; la regla de que toda integración nueva con
  Google nace en el Console del cliente
- `docs/features/crm-sheets.md` — sección **«Propiedad de la hoja»**: compartir ≠ transferir, y los
  dos caminos de migración (transferencia en Drive o Service Account en el Console del cliente)
- `docs/features/scheduling.md` — Bloques A y B reescritos sobre `marco@leosfirm.com`: caminos A1
  (cliente OAuth propio) y A2 (app de n8n), calendario dedicado, tabla de diagnóstico
- `docs/01-project-overview.md` — «Quién es quién» incorpora a Marco y nombra la cuenta de desarrollo;
  tabla nueva **«Dónde vive cada cosa hoy»**
- `docs/00-roadmap.md` — criterio de entrada de la FASE 5 con la cuenta correcta; la deuda de la hoja
  queda visible en la cabecera del Bloque B
- `docs/SKILLS.md` — advertencia: el MCP de Google Calendar **no** está conectado a la cuenta del
  proyecto
- `.env.example` — `GOOGLE_CALENDAR_ID` deja de sugerir `claudia@leosfirm.com` (valor de plantilla) y
  pasa a un ID de calendario dedicado, con instrucciones de dónde sacarlo

### Cambios en base de datos
- Ninguno (Supabase congelado, ADR-010).

### Validación
- Solo documentación: no se tocó código de aplicación, así que no cambia el resultado de
  `npm run build`. Sin dependencias nuevas ni variables nuevas.

### Notas
- ⚠️ **La trampa del `drive.file` NO aplica a Google Calendar** — está verificado en la teoría del
  permiso, no todavía con una llamada real. La verificación sigue siendo el primer paso de la FASE 5.
- ⚠️ **La pantalla de consentimiento OAuth no puede quedarse en modo *Testing***: el refresh token
  caduca a los 7 días y el agendamiento se caería sin aviso una semana después de funcionar.
- Punto por confirmar con el cliente: si `leosfirm.com` es **Google Workspace** (consentimiento
  *Interno*, sin caducidad) o una cuenta suelta (*Externo*, hay que publicar la app).
- Sigue pendiente compartir la hoja del CRM con Claudia como Editora.

---

## [2026-08-05] — Cierre de la FASE 4 y manual de la FASE 5 — v0.4.2

### Request original
> ya hice la validacion y el weebhook de n8n y el archivo google sheet funcionan correctamente,
> procedamos con la siguiente fase. dime que necesitas y como lo resuelvo punto por punto tipo
> manual. antes de eso, respondeme a que te refieres cuando hablas de "claudia" · Puede documentar
> todo y subirlo en GitHub

### Tipo de cambio
- **VERIFICADO**: producción entrega al CRM. `POST https://leos-firm.vercel.app/api/v1/leads` →
  `delivery: "delivered"`. **La FASE 4 queda cerrada**
- **ADDED (docs)**: sección **«Quién es quién»** en `01-project-overview.md` — quién es Claudia, qué
  significa «la clienta», y por qué eso decide de quién deben ser las credenciales de Google
- **ADDED (docs)**: **manual de puesta en marcha** de la FASE 5 en `scheduling.md`, paso a paso:
  credencial de Calendar (dos caminos), `GOOGLE_CALENDAR_ID`, 5 decisiones de negocio con sus
  valores por defecto, y un procedimiento de verificación antes de codear

### Archivos modificados
- `docs/01-project-overview.md` — «Quién es quién», visión actualizada a ADR-009, tabla de estado
  reescrita a 12 fases, bloqueante de publicación marcado como resuelto
- `docs/features/scheduling.md` — manual de puesta en marcha; se documenta que la trampa del
  `drive.file` **no aplica** a Google Calendar, con la advertencia de verificarlo igual
- `docs/features/README.md` — índice al día; se marcan como canceladas las features de las fases
  eliminadas (`booking-ui`, `leads-backend`, `ai-intake`, `dashboard`)
- `docs/00-roadmap.md` — FASE 4 con su verificación de cierre; criterio de entrada de la FASE 5
  apuntando al manual

### Cambios en base de datos
- Ninguno (Supabase congelado, ADR-010).

### Notas
- Quedan filas de prueba en la hoja del CRM (`PRUEBA TECNICA - BORRAR`, `PRUEBA PRODUCCION - BORRAR`).
- ⚠️ **Sigue pendiente compartir la hoja del CRM con Claudia** como Editora.
- ⚠️ **Bloqueantes de la FASE 5:** credencial de Google Calendar en n8n y `GOOGLE_CALENDAR_ID` real.
  El `.env` tiene un valor pero no está confirmado que no sea el de la plantilla.
- Decisión pendiente y arrastrada: el acoplamiento de los 25 encabezados entre hoja, workflow y
  código. Falla en silencio. La alternativa (mapeo automático con claves en inglés) sigue sobre la mesa.

---

## [2026-08-05] — Agendamiento: la mitad de Next.js (FASE 5) — v0.5.0

### Request original
> Vamos a implementar la mitad de Next.js de la FASE 5 […] construimos contra ese contrato con un
> mock del lado del cliente n8n, de forma que cambiar al webhook real después sea solo una variable
> de entorno, sin tocar lógica. · no toques n8n mi compañero se encarga de eso ·
> comienza de inmediato a desarrollar

### Tipo de cambio
- **ADDED**: `/agendar` — calendario propio dentro del sitio, en el huso del visitante
- **ADDED**: `GET /api/v1/availability` y `POST /api/v1/appointments`
- **ADDED**: `src/lib/utils/timezone.ts` — la única puerta a las fechas
- **ADDED**: `availability.service.ts` (**pura**), `scheduling.service.ts`, `appointment.service.ts`,
  `useAvailability.ts`, 5 componentes de `features/scheduling/`
- **ADDED**: `src/lib/n8n/mock.ts` — **temporal**, se borra cuando existan los webhooks
- **CHANGED**: `requestFromN8n<T>()` junto a `postToN8n` — el CRM solo necesita saber si n8n aceptó;
  el agendamiento necesita la **respuesta**
- **CHANGED**: el botón "Agendar y pagar (próximamente)" del diagnóstico ahora lleva a `/agendar`
- **CHANGED**: la etapa `agenda` del CRM escribe también nombre, correo y teléfono

### Lo que se verificó de verdad
- **27 comprobaciones** de la aritmética de disponibilidad, con un script desechable: horario de
  verano a ambos lados del cambio del 1-nov, eventos de día completo, cancelados, marcados «Libre»,
  corrimiento de día entre husos (Tokio), anticipación de 24 h, ventana de 60 días y revalidación
  del servidor (sábados, horas inventadas, fechas basura). **Las 27 en verde.**
- Los dos endpoints, contra el mock: disponibilidad por rango, reserva válida (`201` + `eventId`),
  `409 SLOT_TAKEN` con 7 alternativas, y `400` cuando no se acepta la política.
- `/agendar`, `/agendar?servicio=payroll` y un slug inexistente → `200` los tres; el inválido cae al
  selector de servicios en vez de romper.
- `npm run lint` ✅ · `npm run build` ✅ (19 rutas)

### Dos trampas encontradas al construir
1. **`TZDate` sobrescribe `toISOString()`** y devuelve `2026-08-12T09:00:00.000-05:00` en lugar de
   `2026-08-12T14:00:00.000Z`. Nombran el mismo instante, pero todo lo que sale de la app está
   documentado como UTC: n8n y Google habrían recibido algo distinto del contrato. De ahí
   `toUtcIso()`, y la regla de **nunca** llamar `.toISOString()` sobre un `TZDate`.
2. **El linter de React prohíbe `setState` dentro de un efecto** y **leer refs en render**. El hook
   pasó a **derivar** `loading` (comparar lo pedido con lo recibido) y `BookingFlow` a
   `useSyncExternalStore` + inicializadores perezosos. Sale mejor que la versión original: un render
   menos por cada cambio de mes.

### Archivos creados
`src/lib/utils/timezone.ts` · `src/types/scheduling.types.ts` ·
`src/lib/validation/appointment.schema.ts` · `src/lib/n8n/mock.ts` ·
`src/services/{availability,scheduling,appointment}.service.ts` · `src/hooks/useAvailability.ts` ·
`src/app/api/v1/{availability,appointments}/route.ts` · `src/app/(public)/agendar/page.tsx` ·
`src/components/features/scheduling/{BookingFlow,AvailabilityCalendar,SlotPicker,BookingForm,TimezoneNotice}/`

### Archivos modificados
- `src/constants/business.ts` — `SCHEDULING`, los dos rate limits, `LEAD_CONTACT_STORAGE_KEY`
- `src/lib/env.ts` — 3 variables de n8n, **opcionales** para no tumbar el CRM
- `src/lib/n8n/client.ts` — `requestFromN8n` + salida al mock
- `src/services/crm.service.ts` · `src/types/crm.types.ts` — etapa `agenda`
- `src/services/lead.service.ts` — guarda el contacto en `sessionStorage`
- `src/constants/content/diagnostic.ts` · `.../DiagnosticResult.tsx` — CTA destrabado
- Docs: `features/scheduling.md`, `API_DOCS.md`, `00-roadmap.md`

### Cambios en base de datos
- Ninguno. Supabase sigue congelado (ADR-010).

### Notas
- ⚠️ **Los horarios que se ven hoy son del mock.** Faltan `N8N_AVAILABILITY_WEBHOOK_URL` y
  `N8N_BOOKING_WEBHOOK_URL`. En producción sin ellas, `/agendar` responde `502` con el teléfono —
  **el mock no puede activarse en un sitio publicado**.
- ⚠️ **`N8N_WEBHOOK_TOKEN` está VACÍA en el `.env.local` de esta máquina**, así que el CRM devuelve
  `delivery: "failed"` en local. No es de este cambio: viene de la FASE 4 y afecta también a
  `/leads`. En Vercel hay que verificarla aparte.
- ⚠️ **Sin las 2 columnas nuevas de la hoja**, la evidencia de aceptación de la política se pierde en
  silencio. El agendamiento funciona igual.
- ⚠️ **`bufferMinutes` sigue sin decidir** (§ Bloque C, decisión 6). Hoy no se aplica.
- La pantalla final **no dice que la cita esté confirmada**: dice que el horario está apartado y
  ofrece el teléfono. Ninguna cita existe sin pago (`context.md` §8), y el pago es la FASE 6.

---

## [2026-08-05] — Contrato Next.js ↔ n8n del agendamiento — v0.4.2

### Request original
> Vamos a implementar la mitad de Next.js de la FASE 5 […] otra persona del equipo está montando en
> paralelo los 4 workflows de n8n y la credencial de Google Calendar. Yo todavía no tengo las URLs
> reales de esos webhooks […] construimos contra ese contrato con un mock del lado del cliente n8n,
> de forma que cambiar al webhook real después sea solo una variable de entorno, sin tocar lógica.
> · no toques n8n mi compañero se encarga de eso
> · sube todo a github y documenta los cambios mi amigo esta desarrollando los 4 borradores de n8n
> si algo de esto le afecta documentalo claramente

### Tipo de cambio
- **DOCS**: se cierra el **contrato campo por campo** entre Next.js y los 4 workflows de n8n, para
  que las dos mitades de la FASE 5 se construyan en paralelo sin verse
- **ADDED (config)**: `N8N_AVAILABILITY_WEBHOOK_URL`, `N8N_BOOKING_WEBHOOK_URL` y
  `N8N_CONFIRM_WEBHOOK_URL` — **opcionales**, para no tumbar el CRM cuando faltan
- **DECIDED**: 24 h de anticipación mínima · 60 días de ventana · el mock nunca corre en producción
- **OPEN**: `bufferMinutes` se declara en conflicto consigo mismo y queda **sin aplicar**

> **Sin código.** Esta entrada es solo documentación: la mitad de Next.js todavía no se escribió.

### Lo que le afecta a quien monta los workflows

1. **El nodo Webhook tiene que responder con `Respond to Webhook`.** Con el valor por defecto
   («Immediately») n8n contesta `{"message":"Workflow got started"}` antes de consultar Calendar, y
   el calendario del sitio saldría vacío **sin ningún error a la vista**. El CRM no tiene este
   problema porque ahí basta el `200`; en agendamiento el cuerpo *es* el dato.
2. **Las claves del payload van en inglés y `snake_case`** (`full_name`, `start_utc`…), igual que el
   CRM. El boceto decía `{{ nombre }}`: era pseudocódigo. La expresión real es
   `{{ $json.body.full_name }}`.
3. **Se aceptan dos formas de respuesta** en disponibilidad: la plana `{start,end,status}` y **los
   objetos crudos de Google sin transformar**. La segunda es válida y probablemente más segura —
   menos nodos que se rompan. También se acepta `{ "id": … }` en vez de `{ "eventId": … }`, que es
   como lo devuelve el nodo de Calendar sin renombrar nada.
4. **Dos columnas nuevas en la hoja del CRM** (`Politica aceptada el`, `IP de aceptacion`): el
   esquema de los tres nodos de Sheets pasa de **25 a 27 columnas** y hay que refrescarlo.
5. **8 segundos de presupuesto.** `src/lib/n8n/client.ts` aborta ahí.
6. **La misma credencial Header Auth sirve para los cuatro webhooks.** No crear una por workflow.

### Trampas de Google Calendar que resuelve Next.js (para no resolverlas dos veces)
- **Evento de día completo** → llega `start.date` sin `dateTime`. Next.js lo trata como ocupado
  00:00–24:00. Es la peligrosa: leer solo `dateTime` haría **vender dos veces la misma hora**.
- **Evento cancelado** (`status: "cancelled"`) → se descarta.
- **Evento marcado «Libre»** (`transparency: "transparent"`) → se descarta.

El workflow puede devolver los eventos crudos sin filtrar nada.

### Archivos modificados
- `docs/features/scheduling.md` — nueva sección **§ Contrato exacto entre Next.js y n8n** (las 3
  llamadas con su JSON de ida y vuelta, las 3 trampas de Calendar, qué hace Next.js cuando n8n no
  responde, y cómo funciona el mock). Decisión 6 del Bloque C sobre `bufferMinutes`
- `docs/features/crm-sheets.md` — § *Dos columnas nuevas que hay que crear para la FASE 5*, con el
  orden de los tres pasos y qué se pierde si no se hacen
- `docs/00-roadmap.md` — FASE 5 dividida en dos mitades con dueño y estado
- `docs/02-architecture.md` — 3 variables nuevas en la tabla de entorno
- `.env.example` — bloque de agendamiento, con por qué son opcionales

### Cambios en base de datos
- Ninguno. Supabase sigue congelado (ADR-010). El CRM necesita 2 columnas nuevas **en la hoja**.

### Validación
- `npm run lint` ✅ · `npm run build` ✅ (sin cambios de código: se ejecutan para confirmar que el
  árbol sigue verde tras integrar ADR-012)

### Notas
- ⚠️ **El mock no puede activarse en producción por diseño.** Sin URL y con `NODE_ENV=production`,
  `/agendar` responde `502` con el teléfono de la firma. Un sitio publicado que ofrece horarios
  inventados y finge reservar es peor que uno que dice "llámanos" — es la misma lección de las
  variables que faltaban en Vercel y dejaron el CRM guardando cero leads en silencio.
- ⚠️ **`bufferMinutes: 15` y `slotIntervalMinutes: 60` no caben juntos** con sesiones de 60 min.
  Aplicarlo literalmente dejaría a Claudia con 4 huecos al día en vez de 8. Si la clienta quiere
  descanso real entre consultas, lo correcto es **acortar la sesión a 45 min**, no tocar la
  aritmética. Pendiente de preguntar.
- ⚠️ **Sin las 2 columnas nuevas, la evidencia de aceptación de la política se pierde en silencio.**
  El agendamiento funciona igual; lo que falta aparece el día que alguien reclame un reembolso.
- Sigue pendiente lo de v0.4.1: **`N8N_CRM_WEBHOOK_URL` y `N8N_WEBHOOK_TOKEN` en Vercel**.

---

## [2026-08-05] — El CRM entrega de verdad — v0.4.1

### Request original
> ayudame con lo que hace falta · aun sigue sin funcionar

### Tipo de cambio
- **FIXED (infraestructura)**: el CRM pasa de `delivery: "failed"` a **`delivered"`**. Cadena
  completa verificada: sitio → webhook n8n → Google Sheets, con las etapas `formulario` y `agenda`
- **CHANGED**: el CRM se muda a una hoja **creada por la propia credencial de n8n**
  (`1A2XY75na…rr3I`). La hoja original de la clienta queda descartada
- **DOCS**: se documentan las dos trampas que costaron la sesión entera

### Qué estaba roto (tres causas encadenadas)
1. **Ruta de webhook duplicada.** Un segundo workflow (`leos_firm`) estaba activo ocupando
   `leos-firm/crm`, así que el nuestro no podía publicarse y el `403` que devolvía la ruta venía de
   él. Se desactivó.
2. **`drive.file`.** La credencial de Google Sheets de n8n solo puede tocar **archivos que ella misma
   creó**. Compartir la hoja de la clienta con esa cuenta era inútil: Google respondía
   `PERMISSION_DENIED` por mucho que Drive mostrara el archivo como compartido con permiso de Editor.
   Se probó creando una hoja nueva con esa credencial — funcionó a la primera.
3. **Encabezados creados por n8n.** Con `defineBelow` sobre una hoja vacía, n8n no escribe los
   nombres de columna mapeados: escribe las claves del sobre del webhook (`headers`, `query`,
   `body`). La fila de encabezados tiene que existir **antes** de la primera ejecución.

### Archivos modificados
- `docs/features/crm-sheets.md` — nueva hoja, orden de montaje, y las dos trampas con su
  procedimiento de diagnóstico
- Workflow n8n `Leos Firm - CRM de leads` (`NYy88hBunUSkrcZk`) — apunta a la hoja nueva, esquema de
  25 columnas declarado, `authentication: oAuth2` explícito. **Publicado**

### Validación
- `POST /api/v1/leads` (local) → `delivery: "delivered"` ✅ · repetido con el mismo `leadId` ✅
- Etapa `agenda` con el mismo `leadId` → escribe solo sus 6 columnas ✅

### Notas
- ⚠️ **Faltan `N8N_CRM_WEBHOOK_URL` y `N8N_WEBHOOK_TOKEN` en Vercel.** En producción el CRM sigue
  sin recibir nada. Un `git push` no las lleva.
- ⚠️ Hay que **compartir la hoja nueva con Claudia** como Editora.
- Quedan filas de prueba en la hoja (`PRUEBA TECNICA - BORRAR`).
- El diseño depende de que 25 encabezados coincidan letra por letra entre hoja, workflow y código.
  Ya falló una vez y el modo de fallo es silencioso. Alternativa pendiente de decidir: mapeo
  automático con claves en inglés.

---

## [2026-08-04] — Cobro universal + CRM en Google Sheets — v0.4.0

### Request original
> Necesitamos modificar totalmente esto, estamos cobrando sólo dos servicios en 150 y 250$ necesito
> que estos se queden cómo están y todos los demás valgan 50$ […] Ahora queremos que todos los
> servicios sean pagos, de esta forma sin importar que servicio escojan seguirán el mismo flujo de
> agenda y pago. Ya en la llamada Claudia se encargará de recibir el resto del pago.
> Ahora necesitamos que todos los clientes que diligenciaron el formulario se guarden en un crm en
> google sheet […] con las respuestas a cada pregunta […] y sus datos personales, al final un estado
> de hasta donde llegó, sólo llenó el formulario o avanzó hasta el calendario o pago realizado.
> Necesitamos que empieces con el cambio del punto 2 y comiences también con el diseño del flujo de
> n8n para agendar las citas en el calendario, la idea es evitar usar un agente de IA y simplemente
> clonar el google calendar en la pagina […] Luego […] finalizamos esta parte con el pago en Square.

### Tipo de cambio
- **CHANGED (negocio)**: los ocho servicios se cobran en línea. Los seis que antes se cotizaban ahora
  cobran **$50 de consulta inicial abonable** al costo total → **ADR-009**
- **CHANGED (arquitectura)**: **n8n pasa a ser la capa de integración** y el CRM es una hoja de
  Google. **Supabase queda congelado** → **ADR-010**
- **ADDED**: entrega real del lead — `POST /api/v1/leads` escribe en la hoja de Claudia
- **ADDED**: `leadId` (UUID del navegador) que atraviesa el embudo, para que las tres etapas
  actualicen **una sola fila** por persona
- **REMOVED**: la bifurcación del diagnóstico. `DiagnosticOutcome`, `getOutcome()`,
  `DiagnosticRecommendation`, `Service.requiresAppointment` y la pantalla de "Claudia revisa tu caso"
- **ADDED (n8n)**: workflow `Leos Firm - CRM de leads` (`NYy88hBunUSkrcZk`)
- **ADDED (diseño)**: flujo completo de agendamiento con calendario propio → **ADR-011**

### Archivos modificados
**Catálogo y precios**
- `src/types/content.types.ts` — `priceCents: number` (ya no `| null`), nuevo `pricingModel`,
  `durationMinutes` obligatorio, se elimina `requiresAppointment`
- `src/constants/content/services.ts` — los 8 con precio + `PRICING_COPY`
- `src/constants/business.ts` — `INITIAL_CONSULTATION`, `LEAD_STORAGE_KEY`
- `src/lib/utils/formatCurrency.ts` — `formatPrice` devuelve `string`, ya no `string | null`
- `src/components/features/services/ServiceCard/ServiceCard.tsx`,
  `src/app/(public)/servicios/[slug]/page.tsx` — se elimina la insignia "Cotización"

**Diagnóstico**
- `src/types/diagnostic.types.ts`, `src/services/diagnostic.service.ts` — sin ramas
- `src/constants/content/diagnostic.ts` — un solo siguiente paso; nuevo aviso `deliveryFailed`
- `.../DiagnosticDialog/{DiagnosticDialog,DiagnosticIntro,DiagnosticResult}.tsx` y sus tipos

**CRM (nuevo)**
- `src/types/crm.types.ts`, `src/services/crm.service.ts`, `src/lib/n8n/client.ts` — nuevos
- `src/services/lead.service.ts` — acuña el `leadId` y devuelve el estado de entrega
- `src/lib/validation/lead.schema.ts` — `+leadId`, `-outcome`
- `src/app/api/v1/leads/route.ts` — entrega real
- `src/lib/env.ts` — `getN8nEnv()`, el único getter que no lanza (y por qué)
- `.env.example` — variables de n8n; Supabase marcado como congelado

**Docs**
- Nuevos: `features/crm-sheets.md`, `features/scheduling.md`
- `02-architecture.md` (ADR-009, ADR-010, variables, diagrama), `00-roadmap.md` (14 → 12 fases),
  `API_DOCS.md` (endpoints eliminados y por qué), `features/lead-diagnostic.md`, `CLAUDE.md`

### Cambios en base de datos
- Ninguno, y ya no habrá: **Supabase está congelado** (ADR-010). `DB_SCHEMA.md` queda como diseño de
  referencia, no aplicado.

### Validación
- `npm run lint` ✅ · `npm run build` ✅

### Notas
- ⚠️ **Pasos manuales pendientes en n8n antes de que el CRM funcione**: crear la hoja `Leads` con sus
  encabezados, crear la credencial Header Auth, verificar el acceso de Google Sheets y **publicar** el
  workflow. Lista completa en `features/crm-sheets.md`.
- ⚠️ **Riesgo declarado:** si n8n está caído, ese lead no se recupera solo. No se loguea la PII y no
  hay base de datos local. El visitante ve el teléfono de la firma como alternativa.
- ⚠️ **`Elecciones fiscales` cambió de naturaleza**: era un trámite sin cita y ahora empieza con una
  sesión de 60 minutos, como el resto. Se añadió una frase a su descripción explicándolo —
  **conviene que Claudia la revise**.
- La contradicción de la política de reembolso (v0.3.2) **sigue abierta** y ahora es más urgente:
  con ocho servicios cobrando, hay que unificar el texto de la FAQ con `/politicas` antes de cobrar.

---

## [2026-08-03] — Respuestas oficiales de las 7 preguntas frecuentes — v0.3.2

### Request original
> ayudame incluyendo esta informacion en la seccion de "preguntas frecuentes": [las 7 respuestas
> redactadas por Claudia] · despues ayudame con el commit para ver la pagina en vercel actualizada.

### Tipo de cambio
- **ADDED**: las 7 respuestas oficiales en `/faq` (cierra el pendiente de contenido de la FASE 2 y
  quita un bloqueante de la FASE 5)
- **CHANGED (tipos)**: `FaqItem.answer` pasa de `string | null` a `string` — ya no se puede publicar
  una pregunta sin respuesta oficial
- **REMOVED**: el aviso de "esta respuesta depende de tu situación particular" y su rama de
  renderizado, que quedaron sin uso

### Archivos modificados
- `src/constants/content/faq.ts` — respuestas literales de Claudia, sin reescribir ni resumir
- `src/types/content.types.ts` — `answer` obligatorio
- `src/app/(public)/faq/page.tsx` — se elimina la rama de "pendiente"; entradilla del hero ajustada
  (ya no anuncia que las respuestas se dan en la consultoría)
- Docs: `features/public-site.md` (fuente del contenido + pendiente cerrado), `00-roadmap.md`
  (FASE 5 pierde el bloqueante de FAQ)

### Cambios en base de datos
- Ninguno.

### Validación
- `npm run lint` ✅ · `npm run build` ✅ (18 rutas, sin errores de TypeScript)

### Notas
- ⚠️ **Contradicción de política a resolver antes de la FASE 7.** La respuesta de reembolso dice que
  *"los pagos realizados no son reembolsables"*, mientras `context.md` §8 y `/politicas` mantienen
  que con **≥24 h** de anticipación hay reembolso (menos comisiones) o crédito. Se publica el texto
  tal como lo entregó la clienta, pero ambos textos deben unificarse antes de cobrar de verdad.
- Las respuestas son afirmaciones fiscales y migratorias: **no se editan sin aprobación de la firma**.

---

## [2026-08-03] — Material audiovisual de Claudia y ajustes de UI pedidos por la clienta — v0.3.1

### Request original
> 1. que el logo se vea más grande respetando el diseño · 2. adjuntar la foto en la sección
> "sobre Claudia" · 3. mostrar el video debajo del texto, conservando medidas y diseño ·
> 4. cambiar el texto del botón "Quiero mi diagnóstico gratuito" por "Quiero acceder al servicio" ·
> 5. un botón para cerrar el formulario y seguir navegando · 6. el botón de envío del formulario
> debe decir "Enviar formulario" · 7. commit para publicar en Vercel.

### Tipo de cambio
- **ADDED**: fotografía profesional y video de presentación de Claudia en `/sobre-claudia`
  (cierra el pendiente de material audiovisual de la FASE 2)
- **CHANGED (UI)**: logo del header de 56/72 px a **64/88 px**; fila del header de 80/96 px a 80/112 px
- **CHANGED (UX)**: el popup de diagnóstico ahora **se puede cerrar en cualquier paso**
  (X + `Esc` + botón de texto en el formulario) — **enmienda al ADR-008**
- **CHANGED (copy)**: `"Quiero mi diagnóstico gratuito"` → `"Quiero acceder al servicio"`;
  `"Ver mi diagnóstico"` → `"Enviar formulario"`

### Archivos creados
- `public/claudia-leos.jpg` — retrato profesional 1024×1280 (4:5), 88 KB
- `public/claudia-leos-presentacion.mp4` — video de presentación 848×480, 37 s, 1.6 MB

### Archivos modificados
- `src/components/layout/Header/Header.tsx` — logo más grande y fila más alta en escritorio
- `src/app/(public)/servicios/[slug]/page.tsx` — `sticky top-32` → `top-40` (header más alto);
  label del CTA del aside
- `src/app/(public)/sobre-claudia/page.tsx` — la foto reemplaza el placeholder; bloque de video
  debajo del texto, dentro del mismo `Container` (mismo ancho y ritmo vertical de la página)
- `src/constants/content/company.ts` — `FOUNDER_MEDIA` (rutas, medidas intrínsecas y `alt`)
- `src/constants/content/diagnostic.ts` — `acceptLabel`, `submitLabel` y nuevo `dismissLabel`
- `src/components/ui/Modal/**` — botón de cierre opcional (`onDismiss` + `closeLabel`), foco inicial
  en el panel para no mostrar anillo al abrir
- `src/components/features/diagnostic/DiagnosticDialog/**` — prop `onDismiss`, `pt-16` en los pasos
  para que la X no pise la barra de avance, salida de texto en el paso de contacto
- `src/components/features/diagnostic/DiagnosticTrigger/DiagnosticTrigger.tsx` — cablea `dismiss`
- `src/hooks/useDiagnosticPrompt.ts` — `decline` pasa a llamarse `dismiss` y cubre rechazo, X y `Esc`
- Docs: `02-architecture.md` (enmienda ADR-008), `features/lead-diagnostic.md`,
  `features/public-site.md`

### Cambios en base de datos
- Ninguno.

### Validación
- `npm run lint` ✅ · `npm run build` ✅ (18 rutas, sin errores de TypeScript)
- Revisión visual con Chrome headless: `/sobre-claudia` (foto + video) y
  `/servicios/consultoria-fiscal-extranjeros` (popup con X, sin solapamientos)

### Notas
- El video se sirve desde `public/` porque pesa 1.6 MB. Material más pesado debe migrar a Supabase
  Storage o a un CDN antes de subirlo al repo.
- Queda **fuera de este cambio** el botón del catálogo (`/servicios`), que sigue diciendo
  *"Hacer mi diagnóstico gratuito"*: ahí el visitante todavía no eligió servicio.

---

## [2026-08-03] — Diagnóstico interactivo y captación de leads (FASE 3) — v0.3.0

### Tipo de cambio
- **CHANGED (flujo)**: el formulario de datos pasa a estar **antes** del pago, no después (ADR-008)
- **ADDED**: popup de diagnóstico gratuito con árbol de preguntas y bifurcación cobro/correo
- **ADDED**: `POST /api/v1/leads` con validación Zod compartida y rate limit
- **ADDED**: `docs/00-roadmap.md` — 14 fases en 2 bloques (front end / back end)
- **CHANGED (UI)**: header con el logo más grande y el slogan de la clienta en dorado

### Archivos creados

**Documentación (primero, Mandamiento III):**
- `docs/features/lead-diagnostic.md` — la feature completa, escrita antes del código
- `docs/00-roadmap.md` — orden de trabajo, criterios de cierre y mapeo con la numeración vieja

**Lógica y datos:**
- `src/types/diagnostic.types.ts` — tipos del árbol de preguntas y del resultado
- `src/constants/content/diagnostic.ts` — textos y **árbol de 4 preguntas** (contenido, no lógica)
- `src/services/diagnostic.service.ts` — recorre el árbol, deduce servicio y rama. Funciones puras
- `src/services/lead.service.ts` — envío del lead al endpoint
- `src/lib/validation/lead.schema.ts` — esquema Zod **compartido** cliente ↔ servidor
- `src/lib/utils/rateLimit.ts` — límite por IP en memoria
- `src/lib/utils/formatCurrency.ts` — `formatPrice` movido aquí (lo necesitan Client Components)
- `src/app/api/v1/leads/route.ts` — endpoint público

**Componentes:**
- `ui/Modal` — modal sobre `<dialog>` nativo, con modo **no descartable**
- `ui/Input` — campo con label, hint y error accesibles
- `features/diagnostic/DiagnosticDialog/` — `DiagnosticDialog` (máquina de estados) + `Intro`,
  `QuestionStep`, `ContactStep`, `Result`, `Thread`, `Progress`
- `features/diagnostic/DiagnosticTrigger/` — decide cuándo abrir; reutilizable en la portada
- `src/hooks/useDiagnosticPrompt.ts` — disparo por tiempo/scroll y memoria de la respuesta

### Archivos modificados
- `src/components/layout/Header/Header.tsx` — franja superior con el slogan en dorado; logo de 48 px
  a 56 px (móvil) / 72 px (escritorio); fila de 80 px a 96 px
- `src/constants/business.ts` — `COMPANY.slogan`, `DIAGNOSTIC_PROMPT`, `LEAD_RATE_LIMIT`
- `src/constants/routes.ts` — `API_ROUTES.leads`
- `src/services/service.service.ts` — `formatPrice` ahora se reexporta desde `lib/utils`
- `src/components/ui/Button/index.ts` — exporta también `ButtonVariant` y `ButtonSize`
- `src/app/(public)/servicios/[slug]/page.tsx` — popup automático + CTA del diagnóstico en el aside
  (el teléfono pasa a ser la acción secundaria); `sticky top-28` → `top-32` por el header más alto
- `src/app/(public)/servicios/page.tsx` — banda "¿No sabes cuál de todos necesitas?"
- Docs: `01-project-overview.md`, `02-architecture.md` (**ADR-008**), `DB_SCHEMA.md` (tabla `leads`),
  `API_DOCS.md`, `SKILLS.md`, `features/README.md`, `features/public-site.md`
- Reglas de IA: `CLAUDE.md`, `.windsurfrules`, `.cursorrules`, `.clinerules`,
  `.github/copilot-instructions.md`

### Cambios en base de datos
- Ninguno aplicado. Se **diseñó** la tabla `leads` en `DB_SCHEMA.md` (+ enums `lead_outcome` y
  `lead_status`), que será la **primera migración** del proyecto en la FASE 6.

### Documentación actualizada
- [x] `CHANGELOG.md` — esta entrada
- [x] `docs/features/lead-diagnostic.md`
- [x] `docs/00-roadmap.md`
- [x] `docs/01-project-overview.md` (roadmap de 14 fases + flujo con la bifurcación)
- [x] `docs/02-architecture.md` (ADR-008, `lib/validation/`, `features/diagnostic/`, flujo paso 0)
- [x] `docs/DB_SCHEMA.md` (tabla `leads`, RLS, enums)
- [x] `docs/API_DOCS.md` (`POST /api/v1/leads` + fases renumeradas)
- [x] `docs/SKILLS.md`, `docs/features/README.md`, `docs/features/public-site.md`

### Validación (Mandamiento X)
- [x] `npx tsc --noEmit` — sin errores de tipos
- [x] `npm run build` — 18 rutas (17 + `/api/v1/leads`)
- [x] `npm run lint` — sin errores
- [x] Flujo completo verificado en el navegador (escritorio 1280 px y móvil 390 px): popup → 3
      preguntas → contacto → resultado, en las **dos** ramas
- [x] Validación del formulario: los 5 campos muestran su error y el envío se bloquea
- [x] `POST /api/v1/leads`: `400` con `details` por campo · `201` correcto · `429` con `Retry-After`
      a partir de la 6.ª petición
- [x] Log de producción sin PII (solo rama, servicio, país y `hasUsEntity`) + advertencia de falta
      de entrega
- [x] "Solo estoy viendo" cierra el popup y **no reaparece** ni al recargar
- [x] Sin colores arbitrarios, sin `any`, **sin dependencias nuevas**

### Notas importantes
- ⚠️ **El endpoint todavía no entrega el lead.** Valida, limita y responde `201` con
  `delivery: "pending"`, pero no guarda en Supabase ni envía correo a Claudia: no existe el proyecto
  de Supabase ni el service account de Google. **Publicar el sitio antes de la FASE 6 significa
  perder todos los leads.** Está declarado en el resultado del popup, en `API_DOCS.md`,
  `DB_SCHEMA.md`, `00-roadmap.md` y en el log del servidor.
- El resultado **no simula** lo que no existe: la rama de cobro muestra el botón de pago
  deshabilitado y ambas ramas ofrecen el teléfono de la firma.
- Solo 2 de los 8 servicios tienen cobro automático (los que tienen precio). La rama se decide
  leyendo `priceCents` del catálogo, así que cuando la clienta defina precios para los demás, esos
  servicios pasan solos a la rama de pago **sin tocar código**.
- El slogan del header **no** viene de `context.md`: lo pidió la clienta el 2026-08-03. Quedó
  registrado en `COMPANY.slogan` y trazado en `features/public-site.md`.
- El popup **no tiene X** por decisión de negocio. Es accesible porque usa `<dialog showModal()>`
  (trampa de foco nativa) y el botón de rechazo es una salida real, enfocable con teclado.

### Lección aprendida
Un componente de cliente que importa `service.service.ts` arrastra la capa de datos al bundle, y en
la FASE 6 ese módulo pasará a importar el cliente de Supabase **server-only**: el build habría
fallado entonces, no ahora. Se movió `formatPrice` a `lib/utils/formatCurrency.ts` y
`service.service.ts` lo reexporta, así que ningún import existente cambió.
→ *Antes de importar algo desde un Client Component, preguntarse qué va a importar ESE módulo dentro
de tres fases.*

### Request original
> Claude necesito que modifiquemos el flujo de la pagina. Te puse que el formulario deberia aparecer
> despues del pago pero fue un error. Ahora necesito que cuando la persona consulte el servicio el
> formulario aparezca en el menu de cada servicio (…) popup con el formulario (…) sin X (…) resumen
> del servicio y un boton para dejar los datos y un segundo boton que diga "no quiero mi diagnostico
> gratuito, solo estoy viendo" (…) El logo está muy pequeño, pon el slogan en el header (…) dorado
> (…) Utiliza el metodo AInnovate (…) dime si el proyecto está estructurado en fases (…) la clienta
> NO tiene todos los datos necesarios para automatizar el cobro de todos sus servicios

---

## [2026-08-02] — Sitio público (FASE 2) — v0.2.0

### Tipo de cambio
- **ADDED**: 6 páginas públicas, biblioteca de componentes base y capa de datos del catálogo
- **FIXED**: formato de precio que renderizaba "USD 150 USD"

### Archivos creados

**Páginas** (`src/app/(public)/`):
- `layout.tsx` — Header + Footer compartidos por el sitio público
- `page.tsx` — Portada: hero, público objetivo, servicios destacados, Claudia, CTA
- `servicios/page.tsx` — Catálogo completo (8 servicios)
- `servicios/[slug]/page.tsx` — Detalle con `generateStaticParams` y `generateMetadata`
- `sobre-claudia/page.tsx` — Storytelling, diferenciador, misión, visión y 7 valores
- `faq/page.tsx` — 7 preguntas frecuentes
- `politicas/page.tsx` — Política de cancelación (10 puntos)

**Componentes:**
- `ui/Button` — `Button` y `ButtonLink`, 3 variantes y 2 tamaños
- `ui/Card`, `ui/Badge`
- `layout/Container`, `layout/Section` (+ `SectionHeading`)
- `layout/Header` — Client Component con navegación, estado activo y menú móvil
- `layout/Footer` — contacto, dirección y navegación
- `features/services/ServiceCard`

**Contenido y datos:**
- `src/constants/content/{services,company,faq,policies}.ts` — literal de `context.md`
- `src/types/content.types.ts` — `Service`, `FaqItem`, `PolicyItem`, `CompanyValue`
- `src/services/service.service.ts` — única fuente de datos del catálogo

### Archivos modificados
- `docs/features/public-site.md` — estado a Completo + lecciones aprendidas
- `docs/01-project-overview.md` — FASE 2 marcada como completa
- `docs/02-architecture.md` — estructura de `constants/content/`, nota de formato de moneda, **ADR-007**
- `.windsurfrules`, `CLAUDE.md`, `.cursorrules`, `.clinerules`, `.github/copilot-instructions.md` — tabla de lookup ampliada

### Cambios en base de datos
- Ninguno. El catálogo vive en constantes tipadas con la forma de la futura tabla `services`.
  No existe proyecto de Supabase para Leos Firm (la cuenta tiene 2, el límite del tier gratuito),
  y crearlo es una decisión con costo que corresponde al usuario.

### Documentación actualizada
- [x] `CHANGELOG.md` — esta entrada
- [x] `docs/features/public-site.md`
- [x] `docs/01-project-overview.md`
- [x] `docs/02-architecture.md` (ADR-007)
- [x] Tabla de lookup en los 6 archivos de reglas
- [ ] `DB_SCHEMA.md` (no aplica — sin cambios de schema)
- [ ] `API_DOCS.md` (no aplica — el sitio público no expone endpoints nuevos)

### Validación (Mandamiento X)
- [x] `npm run build` — 17 rutas, 8 detalles de servicio prerrenderizados vía SSG
- [x] `npm run lint` — sin errores
- [x] Las 6 páginas responden `200`; un slug inexistente responde `404`
- [x] Revisión visual en escritorio (1280px) y móvil (390px)
- [x] Sin colores arbitrarios, sin `any`, sin dependencias nuevas

### Notas importantes
- **Ninguna respuesta de FAQ fue inventada.** `context.md` §9 lista las preguntas sin respuesta;
  son afirmaciones fiscales y legales, así que se muestran remitiendo a la consultoría. Las
  respuestas oficiales las debe redactar Claudia.
- Los CTA de agendamiento **no simulan** un flujo que no existe: el detalle de servicio ofrece
  contacto telefónico e indica que el pago en línea llega en FASE 3.
- Falta el material audiovisual de Claudia (`context.md` §2): hay un placeholder marcado como tal.

### Lección aprendida
`Intl.NumberFormat` en locale `es-MX` con `currency: "USD"` devuelve `"USD 150"`, no `"$150"` —
al añadir el sufijo " USD" salía **"USD 150 USD"**. Ni el build ni el lint detectan texto
duplicado; se encontró en la revisión visual. La revisión de pantallas no es opcional, es parte
del Mandamiento X.

### Request original
> procedamos con la fase 2

---

## [2026-08-02] — Setup Inicial (Método AInnovate FASE 1) — v0.1.0

### Tipo de cambio
- **ADDED**: estructura completa del proyecto, documentación base y reglas para IA

### Archivos creados

**Documentación (Método AInnovate):**
- `docs/01-project-overview.md` — Visión, objetivos, stack, catálogo de servicios, identidad visual derivada del logo, roadmap de 10 fases, reglas de negocio no negociables
- `docs/02-architecture.md` — Estructura de carpetas, flujo de datos end-to-end, manejo de zonas horarias, design system, variables de entorno, convenciones y 6 ADRs
- `docs/03-security.md` — Modelo de amenazas, autenticación sin cuenta de cliente, RLS, PCI/Square, scopes de Google, prompt injection, PII y estado de vulnerabilidades
- `docs/04-deployment.md` — Entornos, servicios externos a configurar, webhooks, cron jobs, checklist pre-deploy y rollback
- `docs/DB_SCHEMA.md` — Modelo de datos diseñado: 12 tablas, 6 enums, diagrama ER, políticas RLS, constraint anti doble-reserva y datos semilla
- `docs/API_DOCS.md` — 21 endpoints diseñados con auth, formatos de respuesta y códigos de error
- `docs/SKILLS.md` — Registro de 7 MCP servers y 10 skills disponibles, mapeados a cada feature
- `docs/features/` — Carpeta vacía (se llena en FASE 2)

**Reglas para IA (6 IDEs):**
- `.windsurfrules` — Windsurf / Cascade
- `CLAUDE.md` — Claude Code
- `.cursorrules` — Cursor
- `.github/copilot-instructions.md` — GitHub Copilot
- `.clinerules` — Cline / Continue
- `.aider.conf.yml` — Aider
- `AGENTS.md` — Apunta a `CLAUDE.md`, preservando la advertencia de Next.js 16 del scaffold

**Código base:**
- Proyecto Next.js 16.2.12 + React 19.2.4 + TypeScript + TailwindCSS v4
- `src/app/globals.css` — Design tokens derivados del logo (`@theme` de Tailwind v4)
- `src/app/layout.tsx` — Layout raíz en español, con tipografías y metadata de la firma
- `src/app/(public)/page.tsx` — Placeholder de estado del proyecto (se reemplaza en FASE 2)
- `src/lib/env.ts` — Validación de variables de entorno con Zod
- `src/lib/supabase/{client,server,admin}.ts` — Clientes de Supabase (Next 16: `await cookies()`)
- `src/lib/utils/cn.ts` — Utilidad de composición de clases
- `src/constants/` — `business.ts` (horario, políticas, husos) y `routes.ts`
- `src/types/` — Tipos globales
- `src/app/api/v1/health/route.ts` — Health check
- `.env.example` — Todas las variables necesarias, sin valores reales
- `docs/features/README.md` — Plantilla del ciclo de features de FASE 2
- Estructura de carpetas completa según `docs/02-architecture.md`

### Archivos modificados
- `README.md` — Reemplazado el README genérico de `create-next-app` por el del proyecto
- `.gitignore` — Añadida excepción `!.env.example`: la regla `.env*` también lo ignoraba, y ese
  archivo **debe** commitearse (Mandamiento VIII)
- `package.json` — Nombre corregido de `scaffold-tmp` a `leos-firm`

### Dependencias instaladas
`@supabase/supabase-js`, `@supabase/ssr`, `zod`, `react-hook-form`, `@hookform/resolvers`,
`square`, `googleapis`, `@anthropic-ai/sdk`, `date-fns`, `@date-fns/tz`, `lucide-react`, `sonner`,
`server-only`. Cada una está justificada en la tabla de `docs/02-architecture.md`.

### Validación (Mandamiento X)
- [x] `npx tsc --noEmit` — sin errores de tipos
- [x] `npm run build` — compila correctamente (Turbopack, 5 rutas)
- [x] `npm run lint` — sin errores
- [x] `GET /api/v1/health` responde `200` con `{"status":"ok"}`
- [x] `GET /` responde `200` y los design tokens renderizan (verificado con captura)
- [x] Sin credenciales hardcodeadas · sin `any` · sin dependencias no justificadas

### Cambios en base de datos
- Ninguno. El schema está **diseñado y documentado** en `DB_SCHEMA.md`, pero no se aplicó ninguna
  migración: las tablas se crean en FASE 2, una por feature.

### Documentación actualizada
- [x] `CHANGELOG.md` — esta entrada
- [x] `docs/01-project-overview.md`
- [x] `docs/02-architecture.md`
- [x] `docs/03-security.md`
- [x] `docs/04-deployment.md`
- [x] `docs/DB_SCHEMA.md`
- [x] `docs/API_DOCS.md`
- [x] `docs/SKILLS.md`
- [x] Reglas de los 6 IDEs con tabla de lookup inicial

### Decisiones arquitectónicas registradas
- **ADR-001** — El cliente final no crea cuenta; usa un `access_token` opaco enviado por correo
- **ADR-002** — El webhook de Square es la fuente de verdad del pago
- **ADR-003** — Google Calendar es la fuente de verdad de la disponibilidad
- **ADR-004** — Google Meet por defecto, Zoom como adaptador intercambiable
- **ADR-005** — El agente IA asiste, no decide (con fallback estático obligatorio)
- **ADR-006** — Precios en centavos y calculados siempre en el servidor

### Notas importantes
- **Next.js 16 rompe patrones conocidos.** `middleware.ts` pasó a ser `proxy.ts`; `cookies()`,
  `headers()`, `params` y `searchParams` son **solo asíncronos**. La documentación oficial de
  `@supabase/ssr` todavía usa los patrones viejos y hay que adaptarla. Documentado en
  `docs/02-architecture.md` y en las reglas de los 6 IDEs.
- `npm audit` reporta 3 vulnerabilidades altas transitivas de `next@16.2.12` (`postcss`, `sharp`).
  El "fix" de npm degradaría a `next@9.3.3`. Riesgo aceptado y documentado en `docs/03-security.md`.
- El MCP server de **Vercel requiere autorización** del usuario antes de poder usarse.

### Request original
> Lee el archivo METODO_AINNOVATE.md completo y sigue las instrucciones de la FASE 1.
> Mi proyecto es: [flujo completo: sitio web → catálogo de servicios → selección → pasarela de pago
> Square → agente IA → formulario inteligente → validación → Google Calendar → cita → Google
> Meet/Zoom → CRM → correo al cliente y al administrador → estado pendiente de atención → atendido.
> Integraciones: Página Web, Square, Agente IA, Google Calendar, Google Meet/Zoom, Gmail, CRM,
> Base de Datos]
> Stack que quiero usar: [Next.js + Supabase + TailwindCSS]

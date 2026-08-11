# Changelog — Leos Firm LLC

> Formato: [Semantic Versioning](https://semver.org/)
> Cada entrada incluye: fecha, tipo de cambio, archivos afectados y request original.
> **Mandamiento IV:** cada request que modifique código genera una entrada aquí.

---

## [2026-08-10] — Una variable de entorno que faltaba se comía los pagos en silencio — v0.11.1

### Request original
> *«hizo el pago pero no envio correos, no actualizó el crm, no hizo la reserva del calendario»*

Incidente con dinero real. Pago `rLtRSJy3GCId0rcn6sYb0Tv38NVZY`, USD 50.00 `COMPLETED` el
2026-08-10T23:32:15Z. Ni correo, ni cita confirmada, ni CRM en `pagado`.

### Causa
`confirmAppointment()` acuña el enlace de gestión del cliente (FASE 9) en su **primera línea**, antes
de hablar con n8n. `createAppointmentToken()` → `getAppointmentTokenSecret()` **lanza** si
`APPOINTMENT_TOKEN_SECRET` falta o mide menos de 32 caracteres — y esa variable **nunca se puso en
Vercel**.

El `throw` salía de `fulfil()`, que es el callback de `after()`, y **`after()` se traga el rechazo**.
Ni `fail()` llegaba a ejecutarse, ni quedaba error en los logs, ni entrega fallida en el panel de
Square. La fila de `Pagos` se quedaba en `recibido` — *«money taken and nothing delivered»*, dicho por
el propio código.

El 2026-08-06 se confirmó con este mismo código porque el enlace de gestión todavía no existía.

### Tipo de cambio
- **PAGOS (`src/app/api/v1/webhooks/square/route.ts`)**: `fulfil()` envuelve la entrega en
  `try/catch` y manda cualquier excepción a `fail()`, que escribe la fila con el motivo. Una variable
  de entorno ausente no puede volver a comerse un cobro sin decirlo
- **PAGOS (misma ruta)**: `export const maxDuration = 60`. **No era la causa** —el trabajo moría a los
  milisegundos, no a los diez segundos— pero la cadena completa puede rozar el default de Vercel
- **INFRA**: `APPOINTMENT_TOKEN_SECRET` en Vercel. Sin ella el arreglo de código solo consigue que el
  fallo sea visible, no que desaparezca

### Cómo se encontró
Lo cerró una sonda: un webhook firmado con un `payment_id` inexistente, que recorre el camino corto
—una llamada a Square que falla y una escritura— y **escribió** su fila en `error`. Eso probó que
`after()` sí se ejecuta, y lo único que separa ese camino del real es la acuñación del token.

### Descartado durante el diagnóstico
Queda escrito para no volver a recorrerlo: la URL de Square coincidía con `NEXT_PUBLIC_SITE_URL`; la
clave de firma era correcta (verificado mandando una petición firmada a producción → 200); las seis
ejecuciones de «Leos Firm - Registrar pago» del día 10 terminaron todas bien, así que n8n y sus
credenciales estaban sanas; «Leos Firm - Confirmar cita» no registró **ninguna** ejecución, lo que
situó el fallo antes de esa llamada; y el monto cobrado coincidía con el catálogo.

### Pendiente
- La carrera del reclamo: cuatro entregas simultáneas leyeron la hoja antes de que ninguna escribiera
  y las cuatro respondieron `duplicate: false`. El `If-Match` con ETag de «Leos Firm - Confirmar cita»
  impide la doble confirmación y el segundo correo (ADR-013), así que no hay daño — pero el primer
  candado no es atómico y conviene decidir si el trabajo debe pasar a ser síncrono
- Los dos pagos huérfanos (`PHo4qclOAl4APCPYLhhkf2HPJWSZY` del 07-08 y `rLtRSJy3…` del 10-08) siguen
  en `recibido` y sin cita. Ambos son pruebas propias, no de clientas

---

## [2026-08-07] — Las citas bajan a 30 minutos y la firma deja de hablarle al cliente con la voz de Marco — v0.9.4

### Request original
> Necesito que hagamos unos cambios visuales en la página: 1. **Cambiar texto:** reemplazar la
> palabra **"cancelado"** por la palabra **"pagado"**. 2. **Retirar botón:** retirar el botón que
> contiene el número de esta parte del formulario. 3. **Duración de las citas:** las citas reservadas
> son de **30 minutos**. Cambiar todo lo que diga **"60 minutos"** y poner únicamente **"30
> minutos"**. Implementar este cambio a la hora de programar las citas en google calendar. 4.
> **Correo de confirmación:** el correo electrónico de confirmación de la cita debe enviarse desde la
> cuenta de claudia@leosfirm.com. 5. **Calendario:** el calendario debe hospedarse en el HUB del
> correo de claudia@leosfirm.com. Nota: *Retirar del proceso el correo de marco@leosfirm.com. *Haz un
> análisis de los cambios solicitados y pideme todo lo que requieras para cumplir con la tarea.
> *(dos capturas: el aviso del abono y la pantalla de resultado del diagnóstico con el botón del
> teléfono recuadrado)*

### Tipo de cambio
- **COPY (`src/constants/content/services.ts`)**: `DEPOSIT_NOTICE` — «El valor **pagado** para la
  consulta será tomado como abono para el servicio contratado». En varios países de la región
  «cancelar una factura» sí significa pagarla, pero el mercado de la firma lee «cancelado» como
  *anulado* primero — justo la idea contraria al lado de un cobro
- **UI (`DiagnosticResult.tsx`)**: fuera el botón azul de ancho completo con el teléfono. La pantalla
  de resultado se queda con **una sola llamada a la acción**: *Elegir día y hora*
- **UX (`src/constants/content/diagnostic.ts`)**: el número **no desaparece del todo**, se muda al
  texto de `deliveryFailed`. Ese aviso ya decía «Llámanos» y su único camino de vuelta era el botón
  que se acaba de quitar: dejarlo sin número convertía un lead perdido en un lead irrecuperable.
  `callLabel` se elimina
- **NEGOCIO (`src/constants/business.ts`)**: la sesión pasa de **60 a 30 minutos**
  (`INITIAL_CONSULTATION.durationMinutes`), y los dos servicios de precio cerrado con su literal
  propio en el catálogo. **La rejilla baja también a 30** (`slotIntervalMinutes`): el día de Claudia
  pasa de 8 a **16 huecos**, de 9:00 a 16:30, pegados
- **DOCS**: **ADR-017** en `02-architecture.md` — supera parcialmente a ADR-012, que declaraba la
  cuenta de Marco «✅ Definitivo». `features/scheduling.md` § Bloque C reescrito (decisiones 4 y 6),
  `features/notifications.md` con la tabla del remitente y los pendientes reales, `API_DOCS.md`

### Lo que NO hizo falta tocar, y por qué importa
✅ **Google Calendar recibió los 30 minutos gratis.** El WF2 «Reservar slot» nunca supo cuánto dura
una consulta: recibe `start_utc` y `end_utc` ya calculados por `POST /api/v1/appointments`, que
multiplica `service.durationMinutes`. **La duración vive en un solo sitio y el calendario la
hereda.** Es exactamente lo contrario de `SLOT_HOLD_MINUTES`, que sí está duplicado dentro del nodo
Code del WF4 y ya provocó un cobro sin cita.

Tampoco hizo falta tocar ni un texto de la UI: los cuatro sitios que muestran la duración
(`/agendar`, detalle de servicio, `ServiceCard`, `DiagnosticIntro`) leen `service.durationMinutes`.
No había ningún «60 minutos» escrito a mano.

### Hallazgo que cambia el plan del punto 4
🔑 **El nodo Gmail de n8n no tiene campo «From».** Verificado contra la definición del nodo (v2.2,
`message:send`): expone `sendTo`, `ccList`, `bccList`, `replyTo` y `senderName`, y nada más. El «De:»
real es **siempre la cuenta autenticada de la credencial**, que hoy es `marco@leosfirm.com`.

Consecuencia: mandar desde Claudia **no es editar un workflow**, es crear una credencial OAuth nueva
en n8n autenticada como ella. Es un consentimiento de Google — **no se puede hacer por MCP ni por
API**, y por eso el punto 4 queda entregado como procedimiento y no como cambio.

### Decisiones de la clienta tomadas en esta sesión
| Pregunta | Elegido |
|---|---|
| ¿La rejilla sigue siendo horaria o baja a 30 min? | **30 min — 16 citas al día**, sobre mantener 8 con media hora de aire |
| ¿Qué pasa con el «Llámanos» si el CRM falla? | **El número, como texto**, dentro del propio aviso |
| ¿Calendario nuevo bajo Claudia o el mismo con su credencial? | **El mismo** — el ID no cambia y ninguna cita se rompe |
| ¿La credencial de Claudia a qué correos? | **A los seis**, no solo al de confirmación |

### Lo que queda pendiente, y ninguno es código
- 🔴 **Credencial Gmail de `claudia@leosfirm.com`** en n8n → aplicarla a los 6 nodos de Gmail
- 🔴 **Compartir el calendario** con Claudia como *Hacer cambios y gestionar el uso compartido* y
  reponer con su cuenta la credencial de Calendar
- 🔴 **Quitar el `CC: marco@leosfirm.com`** del WF3 — **a mano en la UI**: actualizar por MCP le borra
  las credenciales a los nodos y el WF3 está activo en producción
- ⚠️ **La tolerancia de 15 min es ahora la mitad de la sesión** (`context.md` §8). No se tocó: es una
  regla de negocio de la clienta, pero conviene que lo sepa
- ⚠️ **Marco sigue siendo superadministrador del Workspace** y el DKIM pendiente depende de él.
  Retirarlo del proceso no lo retira de ese rol

### Validación
`npm run build` ✅ · `npm run lint` ✅ (sin warnings) · 21 páginas generadas

---

## [2026-08-07] — ✅ El correo de la firma estuvo un día caído por nuestro despliegue, y ya volvió — v0.9.3

### Request original
> el correo claudia@leosfirm.com esta presentando problemas para recibir mensajes. haz un analisis
> completo a ver si nosotros hicimos algo que este afectando el funcionamiento de este correo
> electronico · *(después)* revisa este mensaje de error de su correo *(captura: Gmail → Ajustes →
> Sin conexión → «Offline unavailable. Contact your administrator»)*

### Tipo de cambio
- **INCIDENTE (producción, sin código)**: `leosfirm.com` **no tiene registros MX**. Sin MX no existe
  ruta de entrega, así que **ningún correo `@leosfirm.com` se puede recibir** — ni el de Claudia ni
  el de Marco
- **CAUSA**: al conectar el dominio a Vercel se **delegaron los nameservers** (`ns1/ns2.vercel-dns.com`)
  en lugar de dejar el DNS donde estaba. Eso **abandona la zona anterior entera**: Vercel crea una
  nueva con los registros del sitio y nada más. Se fueron con ella el `MX`, el SPF, el DKIM y el
  `TXT` de verificación de Google
- **DOCS (`docs/04-deployment.md`)**: sección nueva *DNS del dominio — y por qué se llevó por delante
  el correo*, con el incidente, la tabla exacta de registros a restaurar, el orden de restauración y
  los comandos de comprobación. Bloque nuevo *DNS y correo del dominio* en el checklist pre-deploy.
  La cabecera deja de decir que no se ha desplegado
- **SIN CAMBIOS EN PRODUCCIÓN**: no se tocó el DNS. El conector de Vercel **no está autenticado** en
  esta sesión, y el DNS de la firma no se modifica sin confirmación (Ley 4)

### Evidencia recogida
| Comprobación | Resultado |
|---|---|
| `MX leosfirm.com` contra ns1/ns2.vercel-dns.com, 8.8.8.8 y 1.1.1.1 | ❌ **ninguno** (NODATA/SOA) |
| `TXT` apex · `google._domainkey` · `_dmarc` | ❌ ninguno — sin SPF, DKIM, DMARC ni verificación |
| `A` apex `64.29.17.65` · `www` `216.198.79.65` | ✅ Vercel; `HTTP 200`, `server: Vercel` |
| SMTP `:25` en `64.29.17.65` (el «MX implícito» del RFC 5321) | ❌ conexión rechazada |
| Serial SOA `1786070274` | 2026-08-07 02:37 UTC — zona modificada anoche |
| `.vercel/project.json` creado | 2026-08-06 00:41, junto al commit `719419b` |

### Descartado (no fue el código ni n8n)
- **La app no manda ni recibe correo.** Cero coincidencias de `gmail|smtp|resend|nodemailer` en
  `src/` fuera de dos comentarios. Next.js nunca tiene credenciales de Google (ADR-010)
- **n8n solo envía.** Revisados nodo a nodo el WF3 y el WF6 (el WF7 es su gemelo): operación
  *message: send* y nada más. **No hay Gmail Trigger, ni lectura, ni borrado, ni etiquetas, ni
  filtros.** Nada del proyecto toca la bandeja de Claudia
- **El volumen tampoco.** Los recordatorios no han corrido nunca sobre una cita real
- **«Offline unavailable» es ruido.** Es la política de *Gmail sin conexión* del Admin de Workspace:
  guarda en el navegador correo **ya recibido**, no interviene en la entrega. Muy probablemente lleva
  así desde siempre. **Su valor fue otro:** el *«contacta a tu administrador»* prueba que la cuenta es
  **Google Workspace administrado**, lo que confirma qué `MX` corresponde

### Segundo hallazgo, del mismo origen
La **verificación del dominio ante Google está rota por las tres vías** a la vez: el `TXT` se fue con
la zona, y el archivo HTML / la etiqueta `<meta>` desaparecieron porque el sitio nuevo reemplazó al
anterior — comprobado que no hay ninguna en el HTML que sirve `www.leosfirm.com` ni nada en `public/`.
No se puede ver desde fuera si Google ya marcó el dominio como no verificado: eso solo está en
`admin.google.com`.

### Archivos modificados
- Docs: `docs/04-deployment.md` · `CHANGELOG.md`
- **Cero archivos de código.**

### Cambios en base de datos
- Ninguno.

### Resolución — el mismo día
Wilyer aplicó los registros en el panel de Vercel; verificado desde aquí contra `ns1.vercel-dns.com`:

| Registro | Valor final |
|---|---|
| `MX` | ✅ `smtp.google.com.` prioridad `1`, destino alcanzable en `:25` |
| `TXT` apex | ✅ `v=spf1 include:_spf.google.com ~all` |
| `TXT _dmarc` | ✅ `v=DMARC1; p=none; rua=mailto:marco@leosfirm.com` |
| `TXT google._domainkey` | ✅ `v=DKIM1; k=rsa; p=…` — publicado el mismo día |

**El `MX` solo restauró la recepción**; SPF, DMARC y DKIM no influyen en que el correo entre. Caída
total ≈ 30 h.

- ✅ **El DKIM se validó decodificando la clave**, no mirándola: RSA de **2048 bits**, exponente
  65537, 392 caracteres de base64. Vercel tuvo que partirla en dos cadenas TXT —el límite por cadena
  es de 255— y los resolutores las concatenan. **Que decodifique a una clave RSA válida es la prueba
  de que no se perdió ningún trozo**; a ojo, una clave truncada es indistinguible de una entera
- **DOCS**: el procedimiento completo del DKIM queda escrito en `04-deployment.md`, repartido en los
  tres tramos reales (Marco genera → Vercel publica → Marco activa) con el plan B de 1024 bits si el
  panel rechaza la cadena por longitud

- 🧨 **El panel de DNS de Vercel mutila los valores de TXT — tres intentos hicieron falta.** El 1.º
  guardó el SPF con `Name = _dmarc` (el campo arrastró la fila anterior); el 2.º se comió **el
  prefijo `v=`** de ambos; el 3.º cortó **todo lo posterior al `;`**, dejando un `v=DMARC1` sin `p=`
  que se descarta igual que si no existiera. Lo que funcionó: escribir a mano y **reabrir el registro
  tras guardar**. Documentado en `04-deployment.md` porque volverá a pasar con el DKIM

### Validación
- Sin build: el cambio es solo documental
- ✅ `MX`, SPF y DMARC verificados contra el NS autoritativo, no contra un resolutor con caché
- ⏳ **Falta activar el DKIM.** El registro ya está publicado y validado; lo que queda es que Marco
  pulse *Iniciar autenticación* en `admin.google.com`. Es lo único pendiente con efecto real: sin
  DKIM, el correo que **sale** del dominio —el de Claudia y el de los workflows de n8n— tiene más
  probabilidad de caer en spam, y ahí lo que se pierde es el enlace de Meet de un cliente que ya pagó
- ⏳ **Falta revisar la verificación del dominio** en Workspace. Las tres vías siguen caídas
- ⏳ **Falta la prueba de recepción de verdad**: mandar un correo desde una cuenta externa a
  `claudia@leosfirm.com`. El DNS está bien, pero eso es lo que lo cierra
- ⚠️ **Lo perdido no se recupera.** Lo encolado se entregó al volver el `MX`; lo que ya había rebotado
  está perdido y el remitente cree que Claudia lo ignoró. Se le avisó de que pida reenvíos
- ⚠️ **Sigue sin corregir, aparte de esto:** el nodo Gmail del WF3 lleva `CC: marco@leosfirm.com`
  **y** `BCC: claudia@leosfirm.com` a la vez. `notifications.md` pedía eliminar el `CC`; hoy cada
  cliente ve una dirección interna de la firma

---

## [2026-08-06] — El encabezado se queda sin CTA y el aviso del abono se ve — v0.9.2

### Request original
> 1. Eliminar este botón de la página. 2. Cambiar el texto de este botón y poner "Agendar
> consultoría". 3. Aumentar de tamaño el mensaje "El valor cancelado para la consulta será tomado
> como abono para el servicio contratado" y usar un color de fuente que se diferencie sin afectar
> demasiado el estilo de la página. 4. Ponerlo en negrita en cada formulario.

### Tipo de cambio
- **UI (`src/components/layout/Header/Header.tsx`)**: **fuera el CTA "Agendar consultoría"**, en
  escritorio y en el menú móvil. Con él se va el import de `ButtonLink`. El encabezado queda con
  slogan, logo, navegación y menú
- **UI (`src/app/(public)/servicios/page.tsx`)**: el botón del atajo al diagnóstico pasa de *"Hacer
  mi diagnóstico gratuito"* a **"Agendar consultoría"** — hereda el texto del CTA eliminado, y de
  paso deja de decir "gratuito" como el resto de la tarjeta
- **UI (las dos apariciones de `DEPOSIT_NOTICE`)**: `text-accent`, negrita y un punto más grande
  (`text-base`, `sm:text-lg` en el catálogo). **No se usó `gold`**: sobre `surface-muted` da 2.3:1 de
  contraste y la restricción de A11Y pide ≥ 4.5:1; `accent` da 5.1:1 y ya es el color de los enlaces

### Archivos modificados
- `src/components/layout/Header/Header.tsx` · `src/app/(public)/servicios/page.tsx` ·
  `src/app/(public)/servicios/[slug]/page.tsx`
- Docs: `docs/features/public-site.md` · `docs/features/lead-diagnostic.md` · `CHANGELOG.md`

### Cambios en base de datos
- Ninguno.

### Validación
- `npm run build` ✅ · `npm run lint` ✅
- ⚠️ **Advertido:** ninguna página fuera de `/servicios` tiene ya un botón de acción visible en el
  encabezado. Si la conversión cae, ese es el primer sitio donde mirar

---

## [2026-08-06] — La tarjeta del diagnóstico deja de ofrecer el teléfono — v0.9.1

### Request original
> 1. Cambiar el título en todos los formularios: quitar "DIAGNÓSTICO GRATUITO" y poner
> "ACCEDE A TU DIAGNÓSTICO". 2. Dejar igual "¿Es este el servicio que necesitas?". 3. Cambiar
> "Responde 3 preguntas y te decimos qué corresponde a tu caso y cuál es el siguiente paso" por
> "Responde estas preguntas y te indicaremos a qué corresponde tu caso y cuál es el siguiente paso".
> 4. Quitar el botón con el número telefónico en todos los formularios y agregar el mensaje "El valor
> cancelado para la consulta será tomado como abono para el servicio contratado". 5. En servicios,
> arriba de todos los formularios, poner ese mismo mensaje.

### Tipo de cambio
- **CONTENT (`src/constants/content/diagnostic.ts`)**: `eyebrow` pasa de *"Diagnóstico gratuito"* a
  *"Accede a tu diagnóstico"* — el CSS lo pone en mayúsculas. Nuevo `teaser`, el texto que pidió la
  clienta, **compartido** por la tarjeta del servicio y el atajo del catálogo
- **CONTENT (`src/constants/content/services.ts`)**: `DEPOSIT_NOTICE`, el aviso del abono, palabra por
  palabra
- **UI (`src/app/(public)/servicios/[slug]/page.tsx`)**: el antetítulo y el teaser dejan de estar
  escritos a mano y se leen de `DIAGNOSTIC_COPY`; **fuera el botón del teléfono** y en su lugar
  `DEPOSIT_NOTICE`. Se van los imports de `COMPANY` y `Phone`, que ya no tenían lector
- **UI (`src/app/(public)/servicios/page.tsx`)**: `DEPOSIT_NOTICE` arriba de la rejilla de tarjetas, y
  el teaser del atajo unificado con el de la tarjeta
- **SIN CAMBIO, a propósito**: el título *"¿Es este el servicio que necesitas?"* (pedido explícito) y
  el teléfono de `DiagnosticResult`, que ahí no es un CTA sino la salida cuando el CRM rechaza el lead

### Archivos modificados
- `src/constants/content/{diagnostic,services}.ts` ·
  `src/app/(public)/servicios/page.tsx` · `src/app/(public)/servicios/[slug]/page.tsx`
- Docs: `docs/features/public-site.md` · `docs/features/lead-diagnostic.md` · `CHANGELOG.md`

### Cambios en base de datos
- Ninguno.

### Validación
- `npm run build` ✅ (21 rutas, las 8 de servicio siguen prerrenderizando) · `npm run lint` ✅
- ⚠️ **Advertido a la clienta:** `DEPOSIT_NOTICE` se muestra en los 8 servicios pero solo es cierto en
  los 6 de `pricingModel: "deposit"`. En `consultoria-fiscal-extranjeros` ($150) y
  `elecciones-fiscales` ($250) convive con *"Precio cerrado del servicio"* y lo contradice. Queda
  como pendiente en [`public-site.md`](docs/features/public-site.md); condicionarlo es una línea

---

## [2026-08-06] — El cliente ya puede cancelar su propia cita — v0.9.0

### Request original
> FASE 9 — Cancelar y reprogramar cita (versión mínima). […] TOKEN DE ACCESO, SIN BASE DE DATOS […]
> NO implementes: reembolsos automáticos, reprogramación en vivo, panel de administración.

### Tipo de cambio
- **FEAT (`src/lib/utils/appointmentToken.ts`)**: token de cita **firmado y sin estado** (ADR-016).
  `base64url(eventId) + "." + base64url(HMAC-SHA256(eventId, secreto))`, comparado con
  `timingSafeEqual` igual que la firma de Square. Sin PII dentro: solo el `eventId` de Google
- **FEAT (`src/lib/env.ts`)**: `getAppointmentTokenSecret()` — el único getter nuevo que **sí lanza**;
  y `N8N_APPOINTMENT_WEBHOOK_URL` · `N8N_CANCEL_WEBHOOK_URL` · `N8N_RESCHEDULE_WEBHOOK_URL`
- **FEAT (`src/app/(public)/agendar/cita/[token]/page.tsx`)**: la página de la cita. Verifica el HMAC,
  lee el evento, calcula **en el servidor y en UTC** las horas que faltan y dice qué aplica según
  `context.md` §8. Muestra las dos horas —la del visitante y la de San Antonio— y el enlace de Meet
- **FEAT (`src/app/api/v1/appointments/[token]/cancel`)**: cancela. Libera el slot, CRM a `cancelado`
  y dos correos. **El correo a Claudia lleva el veredicto ≥24 h / <24 h**, que es lo que le dice si
  reembolsa. Ningún reembolso se ejecuta aquí (`03-security.md`)
- **FEAT (`src/app/api/v1/appointments/[token]/reschedule-request`)**: **no reagenda**. Manda el
  horario preferido (texto libre, máx. 500, Zod) a Claudia y responde **`202`**, no `200`
- **FEAT (`src/services/appointment-management.service.ts`)**: `describeCancellationWindow`,
  `fetchAppointment`, `cancelAppointment`, `requestReschedule`. Toda la política §8 vive aquí
- **FEAT (`src/types/crm.types.ts`)**: `cancelado` en `CrmStage` con el número **más alto** de
  `CRM_STAGE_ORDER` — eso solo la hace terminal, sin regla nueva. Más `canAdvanceStage()`
- **FEAT (`src/types/payment.types.ts` · `payment.service.ts`)**: `ConfirmAppointmentPayload` gana
  `access_token` y `appointment_url`. El token se firma en Next.js: la clave nunca sale de la app
- **FEAT (componentes)**: `AppointmentActions` (los dos botones, con confirmación antes de cancelar) y
  `AppointmentTime` (la hora en el huso real del navegador, con `useSyncExternalStore` como
  `BookingFlow` — no un `useEffect`, que el lint de React Compiler rechaza)
- **FEAT (n8n)**: WF8 `Consultar cita` (`84YbxlHq8PKOkzoh`), WF9 `Cancelar cita` (`KsSCuk7Rw9FV0cr3`)
  y WF10 `Pedir otro horario` (`JFOoJwE7Uw8zWiEc`). **Creados y SIN PUBLICAR**

### Archivos modificados
- Nuevos: `src/lib/utils/appointmentToken.ts` · `src/types/appointment.types.ts` ·
  `src/services/appointment-management.service.ts` ·
  `src/lib/validation/appointment-management.schema.ts` ·
  `src/app/(public)/agendar/cita/[token]/page.tsx` ·
  `src/app/api/v1/appointments/[token]/{cancel,reschedule-request}/route.ts` ·
  `src/components/features/appointments/{AppointmentActions,AppointmentTime}/`
- Modificados: `src/lib/env.ts` · `src/lib/n8n/{client,mock}.ts` · `src/services/payment.service.ts` ·
  `src/services/appointment.service.ts` · `src/types/{crm,payment}.types.ts` ·
  `src/constants/{business,routes}.ts` · `.env.example`
- Docs: **`docs/features/appointment-management.md` (nuevo)** · `docs/API_DOCS.md` ·
  `docs/02-architecture.md` (ADR-016 + 6 variables) · `docs/00-roadmap.md` · `CHANGELOG.md`

### Cambios en base de datos
- Ninguno en Supabase (congelado). **Ninguna columna nueva en la hoja**: la cancelación escribe solo
  `ID`, `Estado` y `Actualizado`, para no exigir un paso manual más en el CRM.

### Validación
- `npm run build` ✅ · `npm run lint` ✅
- ⬜ **Sin probar contra n8n real**: los tres workflows están creados pero no publicados, y publicar
  pone tres webhooks en producción — **eso necesita autorización explícita** (4 Leyes de Operación)

### Notas
- **ADR-016 nace de un hueco de ADR-001.** Aquel prometía un `access_token` UUID guardado junto a la
  cita; con Supabase congelado no hay dónde guardarlo, y un UUID sin un sitio donde esté escrito no
  significa nada. Firmarlo resuelve lo mismo sin estado y sin una llamada de red por página servida
- ⚠️ **Rotar `APPOINTMENT_TOKEN_SECRET` invalida TODOS los enlaces ya enviados por correo**, sin
  período de gracia. No puede haberlo sin estado
- **Firma inválida y cita inexistente responden lo mismo** (`notFound()` / `404`). Distinguirlas sería
  un oráculo para saber qué tokens son criptográficamente válidos
- **El veredicto que cuenta es el del endpoint, no el de la página.** Alguien puede abrir el enlace a
  24 h y 10 minutos y pulsar cancelar media hora después: el endpoint recalcula con su propio reloj
- **La cancelación usa `transparency: transparent`, no `DELETE` ni `status: cancelled`.** Las tres
  liberan el hueco, pero un `DELETE` no tiene deshacer y `status: cancelled` **es** un borrado para la
  API de Google. Con `transparent` el hueco vuelve a ofrecerse y Claudia conserva el rastro
- 🔴 **Al crear los workflows, n8n asignó `api_gmail_aiinovate` a los tres nodos de Gmail** y dejó los
  tres HTTP sin credencial. Es exactamente lo que advertían `payments.md` y `scheduling.md`, y hay que
  arreglarlo a mano antes de publicar
- 🔧 **El correo del WF3 todavía no usa el enlace.** El payload ya lo lleva; falta pegarlo en el HTML
  del nodo de Gmail, **a mano en la UI** para no perder las credenciales del workflow que sostiene la
  confirmación de todas las citas

---

## [2026-08-06] — Los $50 no compran una consulta: apartan la cita — v0.8.2

### Request original
> El sistema pone 50$ para las citas que antes no tenían precio y ahora sí, pero lo toma como cita
> inicial, NO este valor es para reservar la cita, es un abono al valor real, que recibirá la persona
> al entrar realmente a la reunión, que ya claudia se encargará de decirles cual es

### Tipo de cambio
- **BREAKING (interno) — `PricingModel`**: `"initial-consultation"` → **`"deposit"`**. El nombre era el
  error, no solo la copy: hacía leer los $50 como una consulta más barata —un producto con su propio
  alcance— cuando no compran nada por sí solos. Renombrado en el tipo, en los seis servicios del
  catálogo y en la clave de `PRICING_COPY`
- **FIX (copy, `PRICING_COPY`)**: el `label` que veía el visitante pasa de **«Consulta inicial»** a
  **«Abono al total»**, y el `note` de «Se abona al costo total del servicio que contrates» a *«Este
  pago aparta tu cita y se descuenta completo del costo del servicio. No es el precio del servicio:
  Claudia te dice cuánto es durante la llamada, porque el costo depende de tu caso.»*
- **DOCS**: corregidos `CLAUDE.md` (dos sitios), `02-architecture.md` (ADR-009 y su tabla),
  `features/lead-diagnostic.md`, y los comentarios de `content.types.ts` y `business.ts`

### Archivos modificados
- `src/types/content.types.ts` · `src/constants/content/services.ts` · `src/constants/business.ts`
- `CLAUDE.md` · `docs/02-architecture.md` · `docs/features/lead-diagnostic.md` · `CHANGELOG.md`
- **Ningún componente cambia**: los cinco que muestran el precio leen `PRICING_COPY`, que es el punto
  de extensión que se dejó justo para esto (Mandamiento II)

### Cambios en base de datos
- Ninguno en Supabase (congelado). En la hoja del CRM, la columna `Tipo de cobro` empieza a escribir
  **«Abono al total»** en lugar de «Consulta inicial» — sale de `PRICING_COPY[...].label`. Las filas
  históricas conservan el texto viejo; no se reescriben.

### Validación
- `npm run build` ✅ · `npm run lint` ✅
- Cero apariciones de `initial-consultation` en `src/`, salvo la nota histórica del tipo que existe
  precisamente para que nadie lo reintroduzca

### Notas
- **Que un solo `sed` y dos textos arreglaran esto es la prueba de que `PRICING_COPY` estaba bien
  diseñado.** Su comentario original decía que existía «para que la clienta pueda reformular qué
  significan los $50 sin que nadie toque JSX». Ocurrió exactamente eso, y ningún componente se tocó
- **`INITIAL_CONSULTATION` en `business.ts` NO se renombró**, y es deliberado: su
  `durationMinutes` sí describe la primera sesión, que es real. Solo `priceCents` es el abono. Queda
  documentado en el propio constante para que la próxima lectura no repita el malentendido
- **Lo que sigue diciéndolo mal está fuera del repo:** el correo de confirmación que manda
  `Leos Firm - Confirmar cita` no menciona el abono, y debería — un cliente que pagó $50 tiene que
  saber que ese monto se le descuenta. Es un cambio en n8n, no en código

---

## [2026-08-06] — Primer pago real, y las políticas dejan de contradecirse — v0.8.1

### Request original
> corrige las politicas usa la de 24h tercero revisa lo del pago […] eso ya resuelve tus dudas no?

### Tipo de cambio
- **FIX (`src/constants/content/faq.ts`)**: la respuesta de reembolsos decía **«No. […] los pagos
  realizados no son reembolsables»**, que contradecía `context.md` §8 y la propia página de políticas.
  Ahora explica los cuatro casos reales: ≥24 h reembolso menos comisiones o crédito · <24 h no
  reembolsable · reprogramar gratis con ≥24 h · si cancela la firma, el cliente elige
- **FIX (`src/constants/content/policies.ts`)**: el punto *«Ventas finales: todas las ventas son
  finales…»* contradecía el punto de 24 h **dos líneas más arriba, en la misma página**. Pasa a
  *«Consultoría ya iniciada»*, que es lo que quería decir: el pago no se devuelve una vez empezada la
  sesión, y antes de eso rigen los plazos
- **DOCS**: FASE 5 y FASE 6 marcadas completas con la evidencia de los cuatro intentos

### Archivos modificados
- `src/constants/content/faq.ts` · `src/constants/content/policies.ts`
- `docs/00-roadmap.md` · `CHANGELOG.md`

### Cambios en base de datos
- Ninguno en Supabase (congelado). En la hoja, cuatro filas nuevas escritas por el flujo real.

### Validación
- `npm run build` ✅ · `npm run lint` ✅
- **✅ FASE 5 CERRADA**: las columnas Z y AA se llenaron por primera vez —y cuatro veces—, incluidas
  las tres reservas cuyo pago falló, que es justo lo que ADR-008 quería
- **✅ FASE 6 CERRADA — primer pago real** el 2026-08-06 a las 14:48:59 UTC: Marco Bustamante,
  `bookkeeping`, $50. Cobró, el evento pasó a confirmado, Google generó el Meet
  (`meet.google.com/mdf-dwrq-aog`), el correo llegó y la fila `110b82aa-…` avanzó a `pagado`

### Notas
- **Los cuatro intentos fechan el fallo y el arreglo al minuto**, y confirman el diagnóstico de v0.7.5:
  tres pagos fallidos a las 03:35, 04:27 y 05:17 con el token equivocado; token verificado a las 14:35;
  pago bueno a las 14:48. **Nada estaba roto en el código** — era una variable de Vercel
- **Corrección a mi propio análisis:** la fila que revisé como «el pago que no se registró»
  (`db0979de-…`, `agenda`, sin datos de pago) era **uno de los tres intentos fallidos**, no el bueno.
  El bueno es otra fila, con otro `leadId`. La alarma era mía, no del sistema
- 💡 **Hallazgo de producto:** cada pasada por el embudo acuña un `leadId` nuevo y el upsert va por
  `ID`, así que un reintento crea fila nueva en vez de actualizar. Marco quedó con cuatro. No es un bug
  (ADR-008 conserva al que abandona), pero si molesta se deduplica por correo en el WF1 — **nunca**
  tocando el `leadId`, que es lo que ata el embudo entero
- **Limpieza pendiente en la hoja:** borrar las tres filas `agenda` de Marco. Sus eventos tentativos ya
  los borró el WF4

---

## [2026-08-06] — El sitio ya sabe qué decir cuando algo no existe o se rompe — v0.8.0

### Request original
> primero termina el tema del desarrollo front end cierra eso de una vez

### Tipo de cambio
- **FEAT (`src/app/not-found.tsx`)**: 404 con las tres salidas reales — catálogo, FAQ y teléfono
- **FEAT (`src/app/error.tsx`)**: 500 dentro del layout público, con `reset`. Dice que **el horario
  sigue apartado**, porque es cierto: la reserva tentativa sobrevive a un render fallido
- **FEAT (`src/app/global-error.tsx`)**: el fallo del layout raíz. Trae su propio `<html>`/`<body>`
- **FEAT (`src/app/robots.ts`)**: `/robots.txt`
- **FEAT (`src/app/sitemap.ts`)**: `/sitemap.xml` con los 8 servicios leídos del catálogo
- **FEAT (`src/constants/site.ts`)**: `SITE_URL`, antes copiado con su fallback en tres sitios
- **FEAT (`src/app/layout.tsx`)**: `openGraph`, `twitter`, `robots` y `canonical`
- **FEAT (A11Y, `src/app/(public)/layout.tsx`)**: skip link + `id="contenido"` en el `<main>`

### Archivos modificados
- Nuevos: `src/app/not-found.tsx` · `src/app/error.tsx` · `src/app/global-error.tsx` ·
  `src/app/robots.ts` · `src/app/sitemap.ts` · `src/constants/site.ts`
- Modificados: `src/app/layout.tsx` · `src/app/(public)/layout.tsx`
- Docs: `docs/features/public-site.md` · `docs/00-roadmap.md` · `CHANGELOG.md`

### Cambios en base de datos
- Ninguno.

### Validación
- `npm run build` ✅ — `/robots.txt` y `/sitemap.xml` aparecen en la tabla de rutas, 21 páginas
  generadas
- `npm run lint` ✅ sin avisos
- Accesibilidad revisada: las dos `<Image>` con `alt`, `Input` con `htmlFor`, 12 `aria-label`

### Notas
- **`not-found.tsx` va en la raíz y dibuja el chrome a mano; `error.tsx` no.** Una URL que no coincide
  con ninguna ruta nunca entra en un grupo, así que un `not-found` dentro de `(public)` no la vería y
  ese layout no está en el árbol. `error.tsx` sí vive dentro del layout: repetir Header y Footer
  mostraría dos de cada uno
- **`global-error.tsx` no importa nada del proyecto, a propósito.** Si un módulo falla al evaluarse
  puede ser la razón por la que se renderiza; el respaldo de una página rota no puede romperse igual.
  El teléfono está escrito a mano ahí — la única duplicación deliberada del código
- **`SITE_URL` no es una limpieza cosmética.** Su cuarto lector es indirecto y es el que muerde: el
  HMAC del webhook de Square se calcula sobre `notificationUrl + rawBody`, así que un carácter de
  diferencia invalida **todas** las firmas
- 🔴 **Encontrado al documentar, y es urgente:** la FAQ dice *"los pagos no son reembolsables"* y
  `context.md` §8 dice que con ≥24 h hay reembolso menos comisiones o crédito. El pendiente decía
  «unificar antes de cobrar de verdad» — **ese momento ya pasó**. Los dos textos le llegan al mismo
  cliente. Lo decide la clienta, no el código
- **Roadmap recortado el mismo día:** *Referidos* y *Post-cita* salen del alcance. *Gestión de la cita*
  se queda pero recortada a lo mínimo (cancelar y pedir cambio con token, sin reembolso automático) y
  pasa a ser la FASE 9; *Hardening + deploy* pasa a ser la FASE 10

---

## [2026-08-06] — El token era, y ahora está probado: `404` en vez de `401` — v0.7.5

### Request original
> Ya reemplacé con los valores correctos de producción el Square access token y la signature key […]
> mira aquí están si están agregadas → *(export de logs de Vercel)* miraaa

### Tipo de cambio
- **VERIFICACIÓN (producción, sin cobrar nada)**: las dos credenciales que mueven dinero, comprobadas
  por separado y sin pasar una tarjeta:
  - **`SQUARE_ACCESS_TOKEN`** ✅ — las cuatro peticiones de prueba a `/api/v1/orders/[id]/status` con
    una orden inventada devuelven `[pago] no pudimos leer el estado de la orden (404 ·
    INVALID_REQUEST_ERROR/NOT_FOUND)`. **`404`, no `401`**: Square autenticó y solo se quejó de la
    orden. El checkout ya puede cobrar
  - **`SQUARE_WEBHOOK_SIGNATURE_KEY`** ✅ — *Send Test Event* → `POST /api/v1/webhooks/square` `200`,
    `Square Connect v2`, 1215 ms, **sin ninguna línea de error**. Confirmado por los dos lados, no solo
    por el código que muestra Square
  - **`NEXT_PUBLIC_SITE_URL`** ✅ — incluida en el mismo `200`: va dentro del HMAC, así que un carácter
    distinto lo habría roto
- **VERIFICACIÓN (inventario)**: las **12 variables** que la app exige están en Vercel, ninguna falta y
  ninguna sobra. Y las ausentes (`SUPABASE_*`, `GOOGLE_*`, `ANTHROPIC_API_KEY`, `CRON_SECRET`) son
  inocuas: `getServerEnv()` —el único validador que las pide— solo se llama desde
  `src/lib/supabase/admin.ts`, congelado y sin uso (ADR-010). Ninguna ruta viva lo toca
- **VERIFICACIÓN (bundle desplegado)**: `/agendar` sirve `sq0idp-Ny5NuCHxdDE78vhPBitpZw` y
  `7Z92KDMVTEGHQ`, con **cero** apariciones del location de sandbox
- **DOCS**: nueva § *Verificar las credenciales de producción sin cobrar un centavo* en `payments.md`,
  con las dos pruebas como procedimiento repetible, la tabla `401`/`403`/`404`, y **cómo encontrar la
  línea en el panel de Vercel** — que es donde se perdieron dos intentos

### Archivos modificados
- `docs/features/payments.md` · `docs/00-roadmap.md` · `CHANGELOG.md`
- **Ningún cambio de código.**

### Cambios en base de datos
- Ninguno.

### Validación
- `npm run build` ✅ · `npm run lint` ✅
- Contra el sitio desplegado, 4 peticiones (`14:31:59`, `14:32:21`, `14:32:21`, `14:32:22` UTC) más una
  quinta de control (`14:35:44`): las cinco con el mismo `404 · NOT_FOUND`
- Despliegue confirmado: `dpl_HRWAymtUDpJv9vsvjbMdbRVCLj3b`, `production`, rama `main`, región `iad1`

### Notas
- **El diagnóstico de v0.7.4 era correcto y esta vez además está probado.** La diferencia de método es
  toda la lección de este episodio: v0.7.3 dedujo por eliminación y se equivocó dos días; v0.7.4 probó
  los tokens contra la API; v0.7.5 probó el token que **de verdad corre en producción**, que no es lo
  mismo que el que uno cree haber pegado
- **Atajo que ahorra abrir el panel:** una latencia estable de 240–350 ms ya demuestra que Square está
  siendo contactado. Si faltara una variable, `getSquareEnv()` devolvería `null` y `readOrderStatus`
  cortaría en decenas de ms sin llamar a nadie
- **Dos exports de log se perdieron antes de acertar**, y por un motivo que merecía documentarse: el
  filtro por defecto muestra `"type": "static"`, que **no lleva log** (`message` vacío). Un export con
  `HeadlessChrome` y `undici` es Vercel precalentando el build, no la petición que se busca. Hay que
  quedarse con `"type": "function"` y mirar antes de que expire la retención de ~1 h
- `404 Â· INVALID_REQUEST_ERROR` **no es un bug**: es el `·` mal decodificado por el exportador de Vercel
- 🎯 **Queda una sola cosa en el bloque de pagos: la prueba de punta a punta con tarjeta real.** Cobra
  de verdad ($50 de consulta inicial, reembolsables desde Square) y **cierra las FASES 5, 6 y 7 a la vez**

---

## [2026-08-06] — Square no necesitaba ninguna verificación: le faltaba un token en Vercel — v0.7.4

### Request original
> Necesito resolver lo de square al parecer nada que logra recibir los pagos, no hemos descubierto
> porqué, sigues diciendo que falta verificación de Square pero la clienta recibe pagos por ahí,
> entonces no es congruente con lo que dices que no está verificado o se necesita un nivel extra de
> verificacion para integrarlo a la pagina? segundo si ya realizaste una auditoria y todo estaba
> correcto, que sigue pasando? debo de ir a algun lugar a traerte info adicional???

### Tipo de cambio
- **VERIFICACIÓN (Square, por API)**: los **dos tokens del repo probados contra los dos entornos**, que
  es lo que la auditoría anterior nunca hizo — solo había verificado sandbox. Resultado: el token de
  producción es **válido** y es el de la clienta (merchant `QVGQDZCV0X3WD`, *Leos Firm LLC*, `ACTIVE`,
  `USD`, location `7Z92KDMVTEGHQ` en `America/Chicago` con `AUTOMATIC_TRANSFERS`, **creada en 2020**),
  y la suscripción `leos_firm_pago_consulta` está `enabled` con los 4 eventos y la `api_version` que
  fija `square@45`. **En Square no falta nada**
- **CONFIG (`.env.vercel`, no versionado)**: `NEXT_PUBLIC_SQUARE_LOCATION_ID` pasa de
  `LB2XHFGDVRJZJ` —el de **sandbox**— a `7Z92KDMVTEGHQ`. Tenía el location de sandbox junto al
  application id y el token de producción
- **CONFIG (`.env`, no versionado)**: `SQUARE_ENVIRONMENT` vuelve de `production` a `sandbox`. Había
  quedado así tras reproducir el 401 a propósito en v0.7.3, y con las tres credenciales de sandbox al
  lado **ningún pago local podía funcionar**
- **DOCS**: corregidas dos afirmaciones **falsas** que llevaban dos días en la documentación — que la
  cuenta de Square estaba sin verificar y «tarda días», y que `.env.vercel` tenía credenciales de
  sandbox (tenía una mezcla). Nueva § *Los cuatro tokens probados contra la API*
- **CÓDIGO**: el comentario de `CURRENCY` citaba solo el location de sandbox como prueba de que la
  moneda es USD; ahora cita los dos, verificados

### Archivos modificados
- `src/services/payment.service.ts` — solo el comentario de `CURRENCY`; ninguna lógica cambia
- `docs/features/payments.md` · `docs/00-roadmap.md` · `CHANGELOG.md`
- `.env` y `.env.vercel` — no versionados (`.gitignore`, v0.7.3)

### Cambios en base de datos
- Ninguno.

### Validación
- `npm run build` ✅ · `npm run lint` ✅
- **Contra la API real de Square**, matriz completa de 4 llamadas:

  | Token | `connect.squareup.com` | `connect.squareupsandbox.com` |
  |---|---|---|
  | `.env` (`EAAAlyGy…`) | **401** `AUTHENTICATION_ERROR/UNAUTHORIZED` | **200** · `LB2XHFGDVRJZJ` |
  | `.env.vercel` (`EAAAl_RH…`) | **200** · `7Z92KDMVTEGHQ` | **401** `AUTHENTICATION_ERROR/UNAUTHORIZED` |

- `GET /v2/merchants/me` y `GET /v2/webhooks/subscriptions` en producción: `200` los dos

### Notas
- **La causa del `401` es una sola variable: `SQUARE_ACCESS_TOKEN` en Vercel no es el de producción.**
  Es la única hipótesis que sobrevive a la matriz, y es exactamente reproducible — el token de sandbox
  contra la API de producción devuelve el mismo `401 AUTHENTICATION_ERROR/UNAUTHORIZED` que registró
  el log. Encaja con lo demás: alguien actualizó a mano el application id y el location en el panel de
  Vercel y **no actualizó el token**
- **La auditoría de v0.7.3 acertó el diagnóstico y falló el método.** Cerró «token que no corresponde
  al entorno» **por eliminación**, sin probar el token, y en la misma frase repitió como pendiente una
  verificación de cuenta que nadie había comprobado. Una llamada `GET /v2/locations` lo habría cerrado
  en un minuto: **el token estaba en el repo desde el principio**
- ⚠️ **Queda un segundo bloqueante escondido detrás del primero:** si `SQUARE_WEBHOOK_SIGNATURE_KEY`
  en Vercel es la de sandbox, al arreglar el token el cobro pasará y el webhook rebotará por firma
  inválida → **dinero cobrado y cita sin confirmar**, el peor estado posible del sistema. Las dos
  variables se cambian juntas, no una y luego la otra
- ⚠️ **La próxima prueba de punta a punta cobra dinero real.** `4111 1111 1111 1111` es de sandbox y
  en producción la rechaza el banco. Se prueba con los $50 de consulta inicial y se reembolsa desde el
  panel de Square

---

## [2026-08-06] — El pago fallaba por dos motivos distintos, y solo uno era el que se veía — v0.7.3

### Request original
> ayudame haciendo una auditoria para resolver este error al momento de hacer el pago
> *(captura de `/agendar` con el 502)*, y después:
> junto con la auditoria realizada y los errores contenidos en este archivo proveniente de vercel ve
> si te funciona y corrije el error

### Tipo de cambio
- **FIX (`payment.service.ts`)**: la clave de idempotencia del **pago** ahora incluye el `sourceId`.
  La de la **orden** no cambia. Eran una sola clave y no podían serlo
- **FIX (`payment.service.ts`)**: los cuatro `console.error` de Square pasan a registrar
  `category/code`, no solo el estado HTTP
- **DOCS**: `payments.md` — el paso 4 de `/checkout` reescrito, § *Las dos claves de idempotencia*
  nueva, § *Diagnóstico del 401 en producción* nueva, y el pendiente de producción corregido

### Archivos modificados
- `src/services/payment.service.ts`
- `docs/features/payments.md` · `CHANGELOG.md`

### Cambios en base de datos
- Ninguno.

### Validación
- `npm run build` ✅ · `npm run lint` ✅ (sin avisos)
- **Contra el endpoint real y Square sandbox**, la secuencia que fallaba: tarjeta rechazada `402` →
  **reintento con otra tarjeta `201 paid`** (antes `502`) → la misma petición reenviada devuelve el
  **mismo `orderId` y el mismo `paymentId`**: cero cobro doble
- Cobro doble descartado también por el lado de Square: un segundo pago contra una orden ya pagada
  responde `BAD_REQUEST · "The order is already paid"`
- **El 401 de producción reproducido en local** (token de sandbox con `SQUARE_ENVIRONMENT=production`)
  para comprobar el log nuevo: `[pago] Square rechazó el cobro (401 · AUTHENTICATION_ERROR/UNAUTHORIZED)`

### Notas
- **Los dos fallos son independientes y el de producción NO era el de la idempotencia.** El log de
  Vercel dice `401` en los dos intentos: Square no acepta las credenciales. El del `IDEMPOTENCY_KEY_REUSED`
  es un `400` y solo aparece al reintentar; estaba latente esperando a que hubiera un cobro que
  reintentar
- **Lo que hacía indescifrable el 401 era nuestro propio log.** `[pago] Square respondió 401` no
  distingue un token de otro entorno (`401`) de un location de otra cuenta (`403`) de una clave
  reusada (`400`). Los tres códigos son identificadores, no PII: caben en el log
- **El `.env.vercel` del repo está desactualizado** y es una trampa: dice `sandbox`, y el bundle
  desplegado sirve `sq0idp-…` con location `7Z92KDMVTEGHQ` — producción. Quien resincronice desde ese
  archivo devolvería el sitio a sandbox. No se tocó porque el token real no está aquí

---

## [2026-08-06] — La evidencia de la política ya tiene dónde caer — v0.7.2

### Request original
> ok, columnas creadas → workflow actualizado y publicado

### Tipo de cambio
- **PRODUCCIÓN (Google Sheets)**: columnas **Z `Politica aceptada el`** y **AA `IP de aceptacion`**
  añadidas al final de la hoja `Leads`. Al final y no intercaladas, para no desplazar las filas que
  ya existían
- **PRODUCCIÓN (n8n)**: **WF1 `CRM de leads`** con el esquema refrescado en sus tres nodos de Google
  Sheets (25 → 27 columnas) y las dos claves nuevas mapeadas en `Guardar cita elegida`. Publicado
- **DOCS**: el pendiente pasa a hecho en `crm-sheets.md`, `scheduling.md` y el roadmap
- **CÓDIGO**: se retira el comentario ⏳ de `CrmAppointmentRow`, que describía un estado que ya no es

### Archivos modificados
- `src/types/crm.types.ts` — solo el comentario del tipo; ningún campo cambia
- `docs/features/crm-sheets.md` · `docs/features/scheduling.md` · `docs/00-roadmap.md` · `CHANGELOG.md`

### Cambios en base de datos
- Ninguno en Supabase (congelado, ADR-010). El CRM es la hoja: dos columnas nuevas, 27 en total.

### Validación
- `get_workflow_details` contra la instancia real: el `value` de `Guardar cita elegida` incluye las
  dos claves, `matchingColumns: ["ID"]` sigue en los tres nodos y `versionId === activeVersionId`
  —o sea, lo publicado es lo editado

### Notas
- **Refrescar el esquema no es mapear.** En el primer intento los pasos 1 y 2 estaban hechos y el 3
  no: el nodo listaba las 27 columnas y las celdas seguían vacías. Se ve idéntico a estar bien. La
  distinción quedó escrita en `crm-sheets.md` porque va a volver a pasar
- Con esto **se cae el último bloqueante de la FASE 5**. Falta la comprobación: una reserva real en
  producción que llene Z y AA por primera vez —la misma prueba que cierra la FASE 6

---

## [2026-08-06] — Los dos recordatorios revisados y publicados — v0.7.1

### Request original
> workflows de la fase 7 revisados y publicados

### Tipo de cambio
- **PRODUCCIÓN (n8n)**: **WF6 `Recordatorio 24 h` y WF7 `Recordatorio 1 h` publicados**, con sus
  credenciales corregidas a mano — los cuatro nodos HTTP habían quedado sin credencial y los dos de
  Gmail auto-asignados a `api_gmail_aiinovate`. **Verificado por MCP:** ambos con `active: true` y
  `triggerCount: 1`
- **DOCS**: estado actualizado en `notifications.md` y en el roadmap. Con esto **los tres correos del
  embudo están publicados**: confirmación, recordatorio de 27 h y aviso del mismo día

### Archivos modificados
- `docs/features/notifications.md` · `docs/00-roadmap.md` · `CHANGELOG.md`
- **Sin cambios de código.**

### Cambios en base de datos
- Ninguno.

### Validación
- `search_workflows` contra la instancia real para confirmar el estado activo de los dos, en vez de
  darlo por hecho

### Notas
- **La fase no está cerrada.** Ningún recordatorio ha corrido todavía sobre una cita real: los dos
  filtran por `status = confirmed` y las tres reservas que hay en la hoja quedaron en `agenda` sin
  pagar —son justamente las que fallaron mientras el sitio cobraba en sandbox. **La primera cita
  pagada de verdad es la que estrena los dos workflows**, y conviene mirar esa ejecución
- Quedan las tres correcciones al correo de confirmación (acentos, `CC` → `BCC`, destinatario), que
  van a mano: un `update` por MCP le borraría las credenciales a cuatro nodos del WF3

---

## [2026-08-06] — Square en producción, y arranca la FASE 7 con su doc — v0.7.0

### Request original
> ya puse las credenciales en vercel de square · ya hice el redeplyment, continuemos de una vez con
> la fase 7

### Tipo de cambio
- **PRODUCCIÓN**: **Square pasó de sandbox a producción.** Las cinco variables actualizadas en Vercel
  y redeploy hecho. **Verificado desde fuera**, no por confianza: se descargaron los 11 chunks de
  JavaScript de `/agendar` en el sitio desplegado y el `NEXT_PUBLIC_SQUARE_APPLICATION_ID` incrustado
  pasó de `sandbox-sq0idb-4u2D…` a `sq0idp-Ny5N…`. **El sitio ya cobra dinero real**
- **FOUND**: la primera comprobación, hecha antes del redeploy, encontró el bundle **todavía en
  sandbox** pese a que las variables ya estaban guardadas en Vercel. Es la tercera vez que este
  proyecto tropieza con lo mismo y conviene fijar el porqué exacto: las `NEXT_PUBLIC_*` **se
  incrustan en el bundle durante el build**, así que el JavaScript ya publicado lleva el valor viejo
  compilado adentro. No es que Vercel «no recoja» la variable — es que hace falta **compilar de
  nuevo**, no reiniciar
- **DIAGNÓSTICO**: la causa de los fallos de pago que reportó el usuario era que **el sitio estaba
  cobrando en sandbox**, donde ninguna tarjeta real funciona. Tres reservas reales de la hoja
  (`agenda`, para el 7, 13 y 14 de agosto) intentaron pagar y no pudieron. Sus slots ya los liberó el
  limpiador: **hay que llamarlas**
- **DOCS**: creado [`docs/features/notifications.md`](docs/features/notifications.md) — la FASE 7
  documentada antes de tocar nada, como manda el método. Incluye **ADR-015** (propuesta) y el
  inventario verificado de lo que el correo de confirmación ya hace hoy
- **ADDED (n8n)**: **WF6 `Leos Firm - Recordatorio 24 h`** (`6836anE95HmUiyDg`) y **WF7
  `Leos Firm - Recordatorio 1 h`** (`Edd15W7W2FS1Cagf`), creados y **sin publicar**. Cada uno:
  Schedule → leer la ventana en Calendar → filtrar en un Code → Gmail → `PATCH` que marca el evento
- **DECIDED**: la copia interna de cada cita pasa a **`BCC` a `claudia@leosfirm.com`** (hoy es un `CC`
  a `marco@leosfirm.com`, que además le muestra al cliente una dirección interna), y el recordatorio
  «de 24 h» se manda a las **27 h**. Con 24 exactas el correo ofrecería reprogramar sin costo en el
  preciso instante en que el plazo vence
- **FOUND (API)**: el descarte de «ya recordado» **no se puede hacer en la API de Calendar**.
  `privateExtendedProperty` solo empareja por igualdad; no existe un «que NO tenga esta propiedad».
  El doc decía lo contrario antes de construirlo. Se trae la ventana entera y el filtro vive en el
  Code
- **DECIDED**: la ventana del WF6 empieza en **+2 h**, no en «ahora», para **no solaparse con la del
  WF7**. Si Google reescribiera las `extendedProperties` en el `PATCH` en vez de fusionarlas, un
  workflow borraría la marca del otro y el WF6 mandaría un segundo correo. Separar las ventanas hace
  que esa duda deje de importar sin tener que resolverla
- **FOUND (MCP)**: al crear los workflows, n8n **auto-asignó `api_gmail_aiinovate`** a los dos nodos
  de Gmail —la cuenta del equipo de desarrollo, exactamente contra lo que advierte el WF3— y dejó los
  cuatro nodos HTTP **sin credencial**. Anotado en las sticky notes de ambos workflows y en el
  checklist del doc

### Archivos modificados
- `docs/features/notifications.md` — **nuevo**
- `docs/00-roadmap.md` — FASE 7 en curso, con lo que ya está en producción
- `docs/features/README.md` · `CHANGELOG.md`
- **En n8n (no en el repo):** WF6 `6836anE95HmUiyDg` y WF7 `Edd15W7W2FS1Cagf` — creados, sin publicar
  y sin credenciales asignadas
- **Sin cambios de código.** La FASE 7 no toca el repositorio: el scheduler y las credenciales de
  Google viven en n8n (ADR-010)

### Cambios en base de datos
- Ninguno.

### Validación
- `curl` de los chunks del sitio desplegado, antes y después del redeploy, buscando el prefijo del
  application id — la única verificación de las cinco variables que se puede hacer desde fuera
- Inspección del WF3 `Leos Firm - Confirmar cita` por MCP para documentar el correo real y no el
  recordado

### Notas
- **ADR-015 invierte el orden respecto al WF3 a propósito:** el recordatorio se **manda primero** y se
  **marca después**. En la confirmación el candado va antes porque un segundo correo es un desastre;
  en un recordatorio, uno duplicado molesta y uno perdido produce un no-show que por la política
  cuesta dinero y confianza. Queda escrito porque es justo el detalle que alguien «uniforma» dentro de
  seis meses
- **Falta el pago de prueba de punta a punta en producción.** Con Square en vivo ya no hay tarjeta de
  sandbox: la verificación es un cobro real de $50 y su reembolso desde el dashboard
- Sigue pendiente de la FASE 5 lo único que la bloquea: las columnas `Politica aceptada el` e
  `IP de aceptacion` (Z y AA) y su mapeo en el WF1

---

## [2026-08-05] — Las ADR de la FASE 6 al registro, y `payments.md` deja de describir un pasado — v0.6.6

### Request original
> continua

### Tipo de cambio
- **DOCS**: **ADR-013** (la idempotencia la da el evento de Calendar; la hoja es el registro) y
  **ADR-014** (el contexto de la cita viaja en la metadata de la orden de Square) copiadas de
  `features/payments.md` a `02-architecture.md`, que es el registro autoritativo. En el feature doc
  pasan de *propuesta* a **aceptada**, con una nota de que la autoridad es el otro archivo
- **FOUND**: **ADR-011 nunca había llegado al registro.** `02-architecture.md` saltaba de la 010 a la
  012, y ADR-011 —la retención del slot es un evento tentativo— es la base sobre la que se apoya
  ADR-013 y está citada por media documentación. Copiada también, con el aprendizaje del día
  incorporado: `SLOT_HOLD_MINUTES` vive en dos sitios y desincronizarlos cobra sin poder entregar
- **DOCS**: `payments.md` describía un estado que dejó de ser cierto hace horas. Corregidos el
  encabezado (*«falta la mitad de n8n, WF5 no existe»*), la tabla de workflows (WF3 y WF5 constaban
  «sin publicar») y el § *Qué pasa hoy si alguien paga*, que narraba la secuencia previa a WF5
  terminando en `503`. Ahora describe la cadena completa y **tabula los caminos de fallo** que
  siguen vigentes
- **FIXED (doc)**: en `crm-sheets.md`, `Enlace de la reunion` figuraba en la etapa `agenda`. La
  escribe `pagado` — el Meet no existe antes del pago. Era la última secuela del defecto corregido en
  el WF1

### Archivos modificados
- `docs/02-architecture.md` — ADR-011, ADR-013 y ADR-014
- `docs/features/payments.md` · `docs/features/crm-sheets.md` · `CHANGELOG.md`
- **Sin cambios de código ni de workflows.**

### Cambios en base de datos
- Ninguno.

### Validación
- Lectura del registro de ADR en `02-architecture.md` para confirmar el hueco de la 011 antes de
  escribir nada

### Notas
- El § *Qué pasa hoy si alguien paga* pasa de narrar una carencia a documentar garantías. Los cuatro
  caminos de fallo tabulados —`503` y reintento de 72 h, segundo correo evitado, 412 por `If-Match`,
  y el `404` del limpiador— son justamente lo que se verificó con ejecuciones reales

---

## [2026-08-05] — El TTL del limpiador en 30 y publicado: cierra el riesgo de cobrar sin entregar — v0.6.5

### Request original
> si, arranquemos · cambios hechos en el nodo. puse 30 · cambio realizado sigue con la publicacion

### Tipo de cambio
- **FIXED (producción)**: `SLOT_HOLD_MINUTES = 30` en el nodo Code del WF4
  `Leos Firm - Limpiar reservas vencidas`, **publicado** — versión activa
  `60eb490d-d599-427f-8c09-653c5494cac6`. Era la mitad que faltaba del riesgo descrito en
  `payments.md`: el `30` vive en dos sitios y solo estaba en el repo, así que **el limpiador borraba
  a los 10 minutos slots que el código creía retenidos 30**. Con los cobros ya activos, un visitante
  que tardara entre 10 y 30 minutos en pagar podía ser cobrado mientras su slot desaparecía. **Ya no**
- **CHANGED**: la frecuencia del cron del WF4 pasó de 10 a 30 min. No era necesario y no es dañino
  —con TTL 30 el barrido nunca borra antes de tiempo— pero un slot abandonado ahora se libera entre
  los 30 y los 60 minutos en vez de entre 30 y 40
- **FOUND**: el `10` no vivía en dos sitios sino en **tres**. Además de
  `src/constants/business.ts` (ya en 30) y del nodo Code del WF4, el **WF2** escribe
  *«Si el pago no llega en 10 minutos, el limpiador la borra»* en la `description` de **cada** evento
  tentativo. No rompe nada —el limpiador filtra por `summary`, no por la descripción— pero es texto
  que Claudia lee en su calendario, y es el mismo defecto que ya se había corregido en el WF3
- **DECIDED**: el cambio se aplica **a mano en la UI de n8n**, no por MCP. Los dos workflows avisan en
  sus propias sticky notes que el MCP resetea la credencial de Google Calendar al actualizarlos, y en
  el WF4 uno de esos nodos **borra eventos del calendario real de la clienta**. Un `update_workflow`
  por un número dejaría más trabajo manual del que ahorra, con un fallo posible peor
- **REASONED**: subir el TTL es **estrictamente conservador** —con un umbral mayor el filtro devuelve
  un subconjunto de lo que devolvía— así que **no** exige repetir el ensayo en seco que precedió a
  conectar el nodo de borrar. Bajarlo sí lo exigiría. Queda escrito para la próxima vez
- **CLARIFIED**: `10` y `30` son dos números distintos y la doc los confundía. El trigger corre cada
  **10 minutos** (frecuencia del cron); el TTL es de **30** (retención). No hay que tocar el trigger:
  con esa combinación un slot abandonado se borra entre los 30 y los 40 minutos
- **DOCS**: puestos al día los estados que la sesión anterior dejó vencidos — WF3 publicado,
  `N8N_PAYMENTS_WEBHOOK_URL` en Vercel, WF4 verificado y con el nodo de borrar conectado, prueba de
  husos repetida con `Europe/Madrid`. La lista de pendientes de `scheduling.md` tenía cuatro entradas
  duplicadas y cinco ya cumplidas

### Archivos modificados
- `docs/features/scheduling.md` — nueva sección *El limpiador y el TTL*; tabla de workflows,
  costo de ADR-011 y lista de pendientes al día
- `docs/features/payments.md` — el § *El riesgo del limpiador* gana la tabla de los tres cambios y el
  porqué de hacerlos a mano
- `docs/00-roadmap.md` — FASE 6 pasa a 🔨 *casi*; el riesgo del WF4 queda escrito como lo único
  abierto que ya cuesta dinero
- `CHANGELOG.md`
- **Sin cambios de código.** `SLOT_HOLD_MINUTES` ya valía 30 en `src/constants/business.ts`

### Cambios en base de datos
- Ninguno.

### Validación
- `mcp__n8n__get_workflow_details` sobre el WF4 (`hLWyt2vHv3CrCVBt`) y el WF2 (`5MnPI0yaiahvOybZ`)
  para leer el valor real en producción en vez de fiarse de la doc — de ahí salió el hallazgo del WF2
- **Tres lecturas de la instancia, una por intento**, comparando `versionId` con `activeVersionId`.
  Los dos primeros intentos habrían pasado por buenos mirando solo la pantalla del editor
- `publish_workflow` → `activeVersionId: 60eb490d-…`, que es exactamente el borrador verificado

### Notas
- 🐛 **El primer intento cambió el nodo equivocado**: el Schedule Trigger (frecuencia) en vez del nodo
  Code (retención). Publicar eso habría sido **peor que no hacer nada** — cron cada 30 min con TTL
  todavía en 10 borra entre los 10 y los 40 minutos: sigue matando reservas a los 10 y encima deja la
  basura más tiempo. Se detectó leyendo la instancia, no el editor
- 🐛 **Los dos primeros intentos quedaron sin publicar**, con `versionId` ≠ `activeVersionId`. El
  editor mostraba el `30` y producción ejecutaba el `10`. Misma trampa que la corrección fantasma del
  WF1. **La verificación que sirve es comparar los dos ids**
- 🏷️ El nodo del trigger se sigue llamando «Cada 10 minutos» y corre cada 30, igual que la
  `description` del workflow. No afecta a nada; anotado para la próxima vez que se toque el WF4
- 💤 **DEUDA ACEPTADA: el WF2 se deja como está.** Cada evento tentativo sigue diciendo *«Si el pago
  no llega en 10 minutos, el limpiador la borra»* y el plazo real ya es 30. **No puede causar ningún
  comportamiento incorrecto** —el limpiador filtra por `summary` y `status`, nunca por la
  descripción—, el WF2 sostiene todo el agendamiento y su nodo HTTP Request pierde la credencial de
  Calendar con facilidad. Verificado sin cambios: `versionId` = `activeVersionId` = `ff5d064b-…`,
  `updatedAt` 15:40:41Z, anterior a esta sesión. Se corrige al abrir el WF2 por un motivo real

---

## [2026-08-05] — WF3 probado contra Calendar y Gmail reales — v0.6.4

### Request original
> ya actualicé los nodos

### Tipo de cambio
- **VERIFIED (de punta a punta, contra servicios reales)**: evento tentativo creado con el WF2
  (`1c7lj6lmd2rfq128vftsid6jeg`) y WF3 corrido contra él:
  - lectura del evento + ETag `200`
  - **parseo de la `description`** del WF2: nombre, correo, teléfono, servicio, slug y huso salieron
    correctos del texto plano
  - PATCH con `If-Match` → `200`, `status: confirmed`, **Meet creado**
    (`createRequest.status: success`)
  - correo enviado
  - **segunda llamada al mismo evento** → entra por `Ya estaba confirmada`, responde
    `alreadyConfirmed` y **el nodo de Gmail no llega a ejecutarse**: cero segundo correo
- **VERIFIED**: el bug de la descripción quedó cerrado — el evento ya dice *"CITA CONFIRMADA. Pago …
  por USD … el …"* en vez de *"RESERVA SIN PAGAR"*
- **VERIFIED**: 🎯 **la prueba de los dos husos, por fin no degenerada.** `scheduling.md` la tenía
  pendiente porque las dos horas coincidían. Con `Europe/Madrid`: **21:00 del cliente · 14:00 en San
  Antonio**, del mismo instante
- **VERIFIED (antes, con un `event_id` inventado)**: `404` → `502` explícito. Es el camino del
  limpiador borrando el slot mientras alguien paga, y antes habría sido un timeout de 8 s

### Archivos modificados
- `docs/features/payments.md` · `docs/features/scheduling.md` · `CHANGELOG.md`
- Fuera del repo: credenciales del WF3 puestas a mano · evento de prueba en el calendario

### Cambios en base de datos
- Ninguno.

### Validación
- Ejecuciones `490` (404 → 502), `491` (WF2 crea el tentativo), `492` (confirma + Meet + correo),
  `493` (duplicado sin correo), todas verificadas nodo por nodo

### Notas
- ⚠️ **Lo único que la prueba NO pudo determinar: desde qué cuenta salió el correo.** Gmail devolvió
  `labelIds: ["UNREAD","SENT","INBOX"]` y ese `INBOX` es ambiguo: aparece igual si envía la cuenta
  correcta (que se auto-copia por el `ccList`) o la equivocada (que se auto-envía al destinatario de
  prueba). **Se resuelve mirando el "De:" del correo recibido.**
- ⛔ **El WF3 sigue sin publicar.** Probado y funcionando, pero inactivo.
- 🧹 Dos limpiezas pendientes: la fila `PRUEBA-BORRAR-001` en `Pagos` y el evento
  `1c7lj6lmd2rfq128vftsid6jeg` del calendario. **El limpiador no borrará el evento**: al confirmarse
  dejó de cumplir su filtro, que es exactamente lo que se quería demostrar.

---

## [2026-08-05] — WF3 reescrito: el candado contra confirmar dos veces — v0.6.3

### Request original
> arranca

### Tipo de cambio
- **CHANGED**: `Leos Firm - Confirmar cita` (`5Tx6yxAmPBMghDBS`) reescrito. **Sigue sin publicar**
- **ADDED**: **contrato nuevo (ADR-014)** — entra `{ event_id, lead_id, payment_id, amount_usd,
  paid_at }`, **solo identificadores**. El nombre, correo, teléfono, servicio y huso del cliente se
  **leen del evento tentativo**: del `summary` y de las líneas de la `description` que escribe el WF2
- **ADDED**: **`If-Match` con el ETag** leído en un GET previo (ADR-013). Es el candado real: el WF5
  frena los duplicados que llegan **en serie** mirando la hoja, pero una hoja no es atómica. Si los
  dos avisos de Square llegan **a la vez**, Google responde `412` a la segunda y esa ejecución no
  hace nada — ni segundo Meet, ni segundo correo
- **DECIDED**: los dos HTTP usan **`fullResponse` + `neverError`** en vez de ramas de error. Así el
  `412` es **un dato que se enruta**, no una excepción que tumba el flujo **sin responderle a
  nadie** — y un webhook mudo es un `null` en Next.js, o sea una fila en `error` por algo que en
  realidad salió bien
- **ADDED**: **404 en el primer GET tratado explícitamente** — el limpiador borró el slot mientras se
  pagaba. Responde `502` y la fila queda en `error`. Antes habría sido un timeout de 8 s
- **FIXED**: 🐛 **el bug de la descripción** (`scheduling.md`): una cita pagada y confirmada seguía
  diciendo *"RESERVA SIN PAGAR… el limpiador la borra"* en el calendario de Claudia
- **FOUND**: al actualizar, n8n auto-asignó al nodo de Gmail la credencial **`api_gmail_aiinovate`**
  —la del equipo de desarrollo, no la de la firma—, que es **exactamente** lo que advertía la nota
  del propio workflow. Los tres nodos HTTP quedaron **sin credencial**

### Archivos modificados
- `docs/features/payments.md` · `docs/features/scheduling.md` · `CHANGELOG.md`
- Fuera del repo: workflow `5Tx6yxAmPBMghDBS` (borrador, sin publicar)

### Cambios en base de datos
- Ninguno (Supabase congelado, ADR-010).

### Validación
- `validate_workflow` ✅ (20 nodos)
- ❌ **Sin ejecutar**: los nodos HTTP no tienen credencial, así que cualquier prueba daría 401.

### Notas
- ⛔ **Antes de publicar, a mano:** `Google Calendar - Leos Firm` en los **tres** nodos HTTP, y
  `Gmail - Leos Firm` en el de Gmail. n8n no asigna credenciales a nodos HTTP Request y **las pierde
  en cada actualización desde el MCP**. Es el último paso, siempre.
- **Los cuatro caminos de salida** están mapeados contra lo que Next.js ya espera: `200 {meetingUrl}`,
  `200 {alreadyConfirmed}` en los dos casos de duplicado, y `502` para todo fallo real — que
  `requestFromN8n` convierte en `null` y el webhook en una fila `error`.

---

## [2026-08-05] — WF5 publicado y probado contra la hoja real — v0.6.2

### Request original
> dame los 11 encabezados para la pestaña "Pagos" … ya cree la pestaña pagos con sus encabezados …
> ya hice las correcciones

### Tipo de cambio
- **PUBLISHED**: `Leos Firm - Registrar pago` (`PkwmwCia2wqQzXwG`) — activo
- **VERIFIED (contra la hoja real, no en seco)**: los tres caminos del WF5 con
  `payment_id = PRUEBA-BORRAR-001`:
  1. primer aviso → escribe la fila, responde `{ duplicate: false }`
  2. **el mismo pago otra vez** —lo que Square hace siempre— → responde `{ duplicate: true }` y **no
     escribe una segunda fila**. Es el anti-replay de ADR-013 funcionando de verdad
  3. cierre con `status: confirmado` → actualiza **la misma** fila con lead, servicio, evento y Meet
- **VERIFIED**: el cierre **no pisa `Recibido el`**. Probado con un centinela: se mandó
  `9999-99-99-NO-DEBE-ESCRIBIRSE` en `received_at` y no llegó a la hoja
- **FOUND por la prueba**: la pestaña se había creado con los encabezados escritos a mano y se habían
  caído los **seis paréntesis** (`Pago` en vez de `Pago (Square)`, `Evento` en vez de
  `Evento (Calendar)`…) y una mayúscula (`Id del lead`). n8n respondió *"Column names were updated
  after the node's setup"* y **no escribió nada**. Corregido pegando la fila de encabezados

### Archivos modificados
- `docs/features/payments.md` · `CHANGELOG.md`
- Fuera del repo: pestaña `Pagos` en la hoja del CRM · workflow `PkwmwCia2wqQzXwG` publicado

### Cambios en base de datos
- Ninguno (Supabase congelado, ADR-010). En la hoja: pestaña `Pagos` creada con sus 11 encabezados.

### Validación
- Tres ejecuciones reales del WF5 (`482` fallida, `483`, `484`, `485` correctas), verificadas nodo por
  nodo con `get_execution`

### Notas
- ⛔ **Sigue sin poder cobrar nadie, y ahora por otro motivo:** falta
  `N8N_PAYMENTS_WEBHOOK_URL` en Vercel =
  `https://aiwebhookn8n.growingup.digital/webhook/leos-firm/pago`. Sin ella,
  `requestFromN8n("payments")` devuelve `null` **sin llamar a nadie** y el webhook de Square responde
  `503` igual que si el WF5 no existiera. Misma lección que ya costó tener el CRM guardando cero leads
  en silencio: **Vercel no recoge variables nuevas en un despliegue ya hecho**.
- **La prueba se hizo antes de publicar, a propósito.** El primer intento falló por los encabezados;
  de haberlo publicado primero, ese error habría aparecido con el primer pago real de un cliente.
- 🧹 Queda por borrar la fila de prueba `PRUEBA-BORRAR-001` (fila 2 de `Pagos`).

---

## [2026-08-05] — WF5 `Registrar pago` creado, y un dato que se perdía en silencio — v0.6.1

### Request original
> seguimos con el WF5

### Tipo de cambio
- **ADDED**: workflow `Leos Firm - Registrar pago` (`PkwmwCia2wqQzXwG`) — **creado, sin publicar**.
  Atiende las dos llamadas del webhook por cobro: reclama el `payment_id` en la pestaña `Pagos` y
  después cierra la misma fila como `confirmado` o `error`
- **DECIDED**: `Always Output Data` en el nodo de búsqueda. Sin eso, un pago que **no** está en la
  hoja hace que el nodo no emita ningún item, el flujo se corta, nadie responde el webhook y Next.js
  lo lee como «WF5 no respondió». Y ese es el camino **normal**: la primera vez que llega un pago la
  hoja siempre está vacía
- **DECIDED**: el nodo de reclamo lee del webhook **por nombre**
  (`$('Recibir pago de Square').item.json.body…`). Después del lookup `$json` es el resultado de la
  búsqueda —vacío en el caso normal—, así que `$json.body.payment_id` habría escrito una fila en blanco
- **DECIDED**: el nodo de cierre **no mapea `Recibido el`**, para no machacar la hora del reclamo con
  la del cierre — es el único dato que dice cuánto tardó en confirmarse
- **FIXED (defecto en producción)**: el WF1 `CRM de leads` **perdía el enlace de la videollamada**.
  Su nodo *Guardar pago confirmado* no mapeaba `Enlace de la reunion`, así que el `meeting_url` que
  manda `syncPaymentToCrm` no se escribía nunca; y *Guardar cita elegida* sí la mapeaba, contra un
  campo que `CrmAppointmentRow` no tiene, escribiendo vacío. Estaba anotado como corrección
  documental en `crm-sheets.md`; era un dato que se perdía. Corregido y **publicado**
- **FIXED (encontrado al reconstruir el WF1)**: el nodo de `agenda` **descartaba `Nombre`, `Correo` y
  `Telefono`**, que `CrmAppointmentRow` manda desde siempre y a propósito. Para quien hizo el
  diagnóstico son los mismos valores reescritos; para quien agenda en frío era la diferencia entre
  una fila con nombre y una fila con un UUID pelado. **Es un cambio más de lo anunciado al pedir
  autorización** — se deja hecho porque es estrictamente aditivo y el contrato del tipo ya lo pedía
- **LEARNED**: **guardar un workflow no lo pone en producción.** Esta instancia separa `versionId` de
  `activeVersionId`: un `update_workflow` deja un borrador y el webhook que corre sigue siendo el
  anterior. La llamada responde `success`, el workflow sigue `active: true` y todo parece hecho
  mientras la corrección no existe para nadie. Documentado en `crm-sheets.md`

### Archivos modificados
- `docs/features/payments.md` · `CHANGELOG.md`
- Fuera del repo: workflow `PkwmwCia2wqQzXwG` en la instancia de n8n

### Cambios en base de datos
- Ninguno. En la hoja del CRM: la pestaña **`Pagos`** sigue pendiente de crearse a mano.

### Validación
- `validate_workflow` ✅ (11 nodos) · credenciales asignadas automáticamente al crear:
  `Leos Firm - Token del sitio` y `api_sheet_aiinovate`
- ❌ **Sin ejecutar.** No puede probarse hasta que exista la pestaña `Pagos`: contra una pestaña
  inexistente el nodo lanza y nadie responde el webhook.

### Notas
- ⛔ **Orden obligatorio para que esto funcione:** crear la pestaña `Pagos` con sus 11 encabezados →
  publicar el WF5 → recién entonces probar. Publicar antes de crear la pestaña cambia un `503` por
  otro.
- **Los encabezados van sin tildes** y **antes** de la primera ejecución, por la misma razón que en
  `Leads`: son nombres de clave, y con la hoja vacía n8n escribe las claves del sobre del webhook en
  vez de las columnas mapeadas.

---

## [2026-08-05] — FASE 6: el cobro con Square, de punta a punta del lado de Next.js — v0.6.0

### Request original
> Ya cargué las variables de Square en Vercel, por favor ayúdame con lo siguiente: 1. cambia el texto
> de este botón y pon "Realizar pago". 2. crea la conexión con Square para recibir los pagos. 3. una
> vez realizado y confirmado el pago procede a dejar un mensaje al usuario en la página diciendo que
> la cita está confirmada y que recibirá un correo con la confirmación. 4. cambia el texto de la
> segunda imagen y pon lo siguiente: "Para confirmar la cita es necesario realizar el pago, recuerda
> que el espacio queda separado por poco". 5. ayúdame con el commit en GitHub.

### Tipo de cambio
- **ADDED**: `POST /api/v1/checkout` — crea la orden con la metadata de la cita (ADR-014) y cobra.
  El monto sale del catálogo; **el esquema no tiene campo para un importe** (ADR-006). El
  `idempotencyKey` se **deriva** de `leadId + eventId + priceCents`, no es un UUID por clic
- **ADDED**: `POST /api/v1/webhooks/square` — la secuencia completa de `payments.md`: body crudo →
  HMAC con `timingSafeEqual` → filtro por `status === "COMPLETED"` → reclamo del `payment_id` en
  `Pagos` → `200` → `after()` de `next/server` para releer Square, confirmar vía WF3, avanzar el CRM y
  cerrar la fila
- **ADDED**: `GET /api/v1/orders/[id]/status` — poll de tres valores (`pending` · `paid` · `failed`) y
  nada más
- **ADDED**: `PaymentPanel` con el Web Payments SDK, dentro de `/agendar`. Los campos de tarjeta son
  **iframes de Square**; la tarjeta no entra al bundle ni al servidor
- **ADDED**: `payment.service.ts` (servidor), `checkout.service.ts` (navegador),
  `webPayments.ts` (carga del SDK), `syncPaymentToCrm`, `payment.types.ts`, `square.types.ts`,
  `checkout.schema.ts`, `square-webhook.schema.ts`, `CHECKOUT_RATE_LIMIT`, `ORDER_STATUS_RATE_LIMIT`,
  `PAYMENT_POLL`
- **CHANGED (pedido de la clienta)**: el botón de la pantalla de horario apartado pasa de
  «Llamar y confirmar · (210) 630 7878» (un `tel:`) a **«Realizar pago»**, que ahora cobra de verdad
- **CHANGED (pedido de la clienta)**: el aviso pasa de «El pago en línea todavía no está disponible en
  el sitio…» a **«Para confirmar la cita es necesario realizar el pago, recuerda que el espacio queda
  separado por poco»** — literal, tal como llegó
- **ADDED (pedido de la clienta)**: pantalla de **cita confirmada** al acreditarse el pago, con el
  aviso de que llega un correo con la confirmación y el enlace de la videollamada
- **CHANGED**: `SLOT_HOLD_MINUTES` **10 → 30**. Es la decisión que quedaba pendiente y sin ella el
  limpiador podía borrar el slot en medio del pago: cobro hecho, slot perdido
- **DECIDED**: el poll lee el **estado de la orden**, no el del pago como decía el doc — una llamada a
  Square por tick en vez de dos, y `COMPLETED` responde justo la pregunta que hace la pantalla
- **DECIDED**: el entorno del SDK del navegador se deduce del **prefijo del Application ID**
  (`sandbox-sq0idb-` vs `sq0idp-`) en lugar de una variable nueva. Dos valores que pueden
  contradecirse son una forma de publicar un sitio en vivo apuntando a sandbox
- **FIXED (antes de que existiera)**: el `200` de reconocimiento del webhook se construye por llamada
  y no como constante de módulo. Un `Response` solo se puede leer una vez; compartir la instancia
  habría fallado en cuanto llegaran dos notificaciones a la vez

### Archivos modificados
- `src/app/api/v1/checkout/route.ts` · `src/app/api/v1/webhooks/square/route.ts` ·
  `src/app/api/v1/orders/[id]/status/route.ts` — **nuevos**
- `src/services/payment.service.ts` · `src/services/checkout.service.ts` ·
  `src/lib/square/webPayments.ts` · `src/lib/validation/checkout.schema.ts` ·
  `src/lib/validation/square-webhook.schema.ts` · `src/types/payment.types.ts` ·
  `src/types/square.types.ts` ·
  `src/components/features/payments/PaymentPanel/{PaymentPanel.tsx,PaymentPanel.types.ts,index.ts}` —
  **nuevos**
- `src/components/features/scheduling/BookingFlow/BookingFlow.tsx` · `src/services/crm.service.ts` ·
  `src/constants/business.ts` · `src/constants/routes.ts`
- `docs/features/payments.md` · `docs/API_DOCS.md` · `docs/00-roadmap.md` · `CHANGELOG.md`

### Cambios en base de datos
- Ninguno (Supabase congelado, ADR-010). En la hoja del CRM: la pestaña **`Pagos`** sigue pendiente de
  crearse a mano, con sus 11 encabezados.

### Validación
- `npm run build` ✅ (las tres rutas nuevas aparecen como dinámicas) · `npm run lint` ✅ ·
  `npx tsc --noEmit` ✅
- ❌ **Sin probar contra Square todavía.** La prueba de punta a punta necesita el sitio desplegado: en
  local el HMAC se calcula sobre `http://localhost:3000` y nunca coincide con la URL registrada.

### Notas
- ⛔ **Nadie puede pagar todavía, y el `503` es a propósito.** Sin el WF5 `Leos Firm - Registrar
  pago`, el webhook no puede saber si un pago ya se procesó, y seguir adelante arriesgaría reemplazar
  un enlace de Meet ya enviado por correo (ADR-013). Responde `503`, Square reintenta durante 72 h y
  **los pagos pendientes se confirman solos en cuanto WF5 se publique** — sin tocar una línea de
  código. Lo mismo aplica al WF3, que sigue sin publicar a propósito.
- ⛔ **El `30` de `SLOT_HOLD_MINUTES` vive también dentro del nodo Code del WF4**, que es la única
  copia fuera del repo. Mientras el WF4 siga en 10, el limpiador borra slots que el código cree
  retenidos durante 30 minutos.
- **No se añadió ninguna dependencia** (Mandamiento I). El Web Payments SDK se carga como `<script>`
  desde el CDN de Square porque los campos de tarjeta son iframes de su origen — es lo que mantiene la
  tarjeta fuera del alcance de PCI, y empaquetar el SDK no cambiaría eso. Los tipos que hacían falta
  están escritos a mano en `src/types/square.types.ts`.
- **`verifyBuyer` (3-D Secure) se intenta y su fallo no es fatal.** La mayoría de las tarjetas
  estadounidenses no se desafían; negarse a cobrar porque un paso opcional se rompió perdería pagos
  reales. Cuando el token hacía falta de verdad, Square rechaza con
  `CARD_DECLINED_VERIFICATION_REQUIRED`, que ya tiene su mensaje.
- ⚠️ **El texto nº 4 quedó literal**, terminando en «…queda separado por poco». Si faltaba «tiempo»,
  es un cambio de un segundo.

---

## [2026-08-05] — Square conectado y verificado: la base de la FASE 6 — v0.5.4

### Request original
> Ya tengo la cuenta de Square, pídeme lo que necesitas para hacer la conexión. … ¿Cómo obtengo esta
> credencial? El resto ya está en `.env`.

### Tipo de cambio
- **VERIFIED (contra la API real, no por captura)**: `GET /v2/locations` → `200`, location
  `LB2XHFGDVRJZJ` *Default Test Account*, `ACTIVE`, `USD`, `US`, y coincide con el `.env`. El
  Application ID lleva el prefijo `sandbox-sq0idb-` que corresponde al entorno
- **VERIFIED**: `GET /v2/webhooks/subscriptions` → `200`, suscripción `Leos Firm - pagos`, `enabled`,
  apuntando a `https://leos-firm.vercel.app/api/v1/webhooks/square`, con `api_version 2026-07-15` —
  **la misma que fija `square@45`**, así que no hay desfase entre lo que Square manda y lo que el SDK
  espera
- **ADDED**: `src/lib/square/client.ts` (SDK + conversión de los `bigint` de Square) y
  `signature.ts` (HMAC con `node:crypto` y `timingSafeEqual`)
- **ADDED**: `getSquareEnv()` en `src/lib/env.ts`
- **ADDED**: `CrmPaymentRow`, los webhooks `confirm` y `payments`, y `N8N_PAYMENTS_WEBHOOK_URL`
- **CHANGED**: `src/lib/n8n/mock.ts` **se niega a simular** `confirm` y `payments`. El mock existía
  para horarios; una confirmación falsa marcaría como pagada una cita que nadie pagó
- **CORRECTED (por inspeccionar la suscripción real)**: la clave de la pestaña `Pagos` pasa de
  `event_id` a **`payment_id`**. Square manda **dos eventos por el mismo cobro** —`payment.created` y
  `payment.updated`— y **cada uno trae su propio `event_id`**: la clave anterior los habría dejado
  pasar a los dos, con dos confirmaciones y dos correos. El `event_id` se conserva como columna de
  auditoría
- **CORRECTED**: el webhook acepta `payment.created` **además de** `payment.updated`, y filtra por
  `status === "COMPLETED"`. Un cobro con tarjeta que se completa de inmediato puede notificarse ya
  como `COMPLETED` en el `created`; escuchar solo `updated` arriesgaba no confirmar nunca una cita
  pagada

### Archivos modificados
- `src/lib/square/client.ts` · `src/lib/square/signature.ts` — **nuevos**
- `src/lib/env.ts` · `src/lib/n8n/client.ts` · `src/lib/n8n/mock.ts` · `src/types/crm.types.ts` ·
  `.env.example`
- `docs/features/payments.md` · `CHANGELOG.md`

### Cambios en base de datos
- Ninguno (Supabase congelado, ADR-010).

### Validación
- `npm run build` ✅ · `npx eslint src --max-warnings=0` ✅ (0 avisos)
- Credenciales probadas contra `connect.squareupsandbox.com` con dos llamadas reales

### Notas
- **`getSquareEnv()` existe porque `getServerEnv()` no servía.** Ese esquema exige las claves de
  Supabase, Google y Anthropic —vacías, y las de Supabase vacías para siempre (ADR-010)—, así que
  leerlo para cobrar habría lanzado por variables que el cobro no usa. Es exactamente la misma razón
  por la que `getN8nEnv()` se separó en su momento, y el comentario de `env.ts` ya lo anticipaba.
- **`SQUARE_WEBHOOK_SIGNATURE_KEY` es opcional en el esquema, a propósito.** Square solo la emite al
  crear la suscripción, y eso exige una URL pública. Exigirla habría bloqueado el checkout por un
  valor que solo usa el webhook; la ruta del webhook la exige explícitamente y se niega a correr sin
  ella.
- ⚠️ **En local la firma no puede validar, y está bien.** `NEXT_PUBLIC_SITE_URL` es
  `http://localhost:3000` y el HMAC se calcula sobre `notificationUrl + rawBody`, así que no coincide
  con la URL registrada. El webhook se prueba **sobre el sitio desplegado** — Square no alcanza una
  máquina local de todos modos. En Vercel esa variable **tiene que ser el dominio real**.
- ⏳ **Sigue sin respuesta la decisión de `SLOT_HOLD_MINUTES` (10 → 30).** No bloquea el código, pero
  sí es el riesgo de cobrar sin poder entregar. Pendiente en `payments.md`.

---

## [2026-08-05] — FASE 6 documentada antes de codear: `payments.md` — v0.5.3

### Request original
> ¿Cómo conecto "app.squareup.com" al desarrollo de la página web que estoy creando? … prepara el
> doc `docs/features/payments.md` con ese hueco resuelto, para tenerlo listo cuando cierre la FASE 5.

### Tipo de cambio
- **ADDED**: `docs/features/payments.md` — diseño completo de la FASE 6 (Mandamiento III: el doc
  existe **antes** que el código)
- **DECIDED (ADR-013, propuesta)**: sin base de datos, **la idempotencia y el registro se separan**.
  La exclusión mutua real es la transición `tentative → confirmed` del evento de Calendar con
  `If-Match` sobre el ETag —Google devuelve `412` a la segunda ejecución, que es un
  *compare-and-swap* de verdad—; el registro auditable de `event_id` es una **pestaña `Pagos`** en la
  hoja del CRM. Se elige la hoja sobre el Data Table de n8n porque el archivo **ya lo creó la
  credencial** (no reaparece la trampa del `drive.file`), porque Claudia lo ve donde ya trabaja, y
  porque es el registro que la FASE 9 necesita para los reembolsos
- **DECIDED (ADR-014, propuesta)**: el contexto de la cita (`lead_id`, `event_id`, `service_slug`)
  viaja en la **`metadata` de la orden de Square**, más `reference_id = lead_id` en el pago. Nada de
  PII ahí: nombre y correo salen del evento tentativo, que el WF3 ya lee
- **CORRECTED**: la nota abierta de `API_DOCS.md` decía que un reintento del webhook era «un cobro
  duplicado esperando a pasar». **No lo es** — `CreatePayment` lleva `idempotency_key` y el webhook
  solo *informa* de un cobro ya hecho. Lo que duplicaría son los efectos de confirmar: un Meet nuevo
  que invalida el ya enviado por correo, y un segundo correo de confirmación. Por eso la guardia va
  sobre el evento y no solo en la puerta del endpoint
- **FOUND**: **el limpiador puede borrar el slot mientras el cliente paga.** `SLOT_HOLD_MINUTES = 10`
  cuenta desde antes de que se vea el formulario de tarjeta. Si expira, el webhook confirma un evento
  que ya no existe: **cobro hecho, slot perdido**. Recomendación: subirlo a **30** en los dos sitios
  donde está escrito, y tratar el `404` de Calendar como `error`, nunca como éxito
- **FOUND**: `crm-sheets.md` atribuye `Enlace de la reunion` a la etapa `agenda`. Es imposible — el
  Meet lo crea el WF3 **después** del pago. Pertenece a `pagado`

### Archivos modificados
- `docs/features/payments.md` — **nuevo**
- `docs/00-roadmap.md` · `docs/API_DOCS.md` · `docs/features/README.md` ·
  `docs/features/crm-sheets.md` · `docs/features/scheduling.md` — referencias cruzadas y la
  corrección del contrato del WF3

**Sin cambios en `src/`.** Es un cambio de documentación: la FASE 6 no ha empezado.

### Cambios en base de datos
- Ninguno (Supabase congelado, ADR-010). La pestaña `Pagos` es una hoja de cálculo, y la crea a mano
  quien mantiene el workflow — igual que las dos columnas de la FASE 5.

### Validación
- Sin código nuevo: no aplican `build` ni `lint`. Verificado contra el árbol real que
  `src/lib/square/`, `src/app/api/v1/checkout/` y `src/app/api/v1/webhooks/square/` están **vacíos**,
  que `square@^45` ya está instalado y exporta `SquareClient` / `WebhooksHelper`, y que `after()` de
  `next/server` existe en Next 16 (`node_modules/next/dist/docs/…/functions/after.md`)

### Notas
- **ADR-013 y ADR-014 son propuestas** y viven de momento dentro de `payments.md`. Se copian a
  `docs/02-architecture.md` al abrir la FASE 6, no antes: no se ejecutan todavía.
- **El criterio de entrada de la FASE 6 depende de la clienta y tarda días**: cuenta de Square a
  nombre de Leos Firm LLC, identidad verificada y banco vinculado. Conviene arrancar ese trámite en
  paralelo a la FASE 5 — el código no, que depende del `eventId`.

---

## [2026-08-05] — Las dos mitades conectadas: el mock se apaga — v0.5.2

### Request original
> Tu tarea es CONECTAR las dos mitades. No rehagas nada de Next.js: ya está hecho, probado y
> compilando.

### Tipo de cambio
- **CONNECTED**: las tres variables de agendamiento en `.env` local. El mock de
  `src/lib/n8n/mock.ts` **se apaga solo**; no se tocó una línea de código
- **VERIFIED (punta a punta, contra datos reales)**: `GET /api/v1/availability` para el
  2026-09-14 devuelve el día **sin la franja de las 15:00Z**, que es exactamente donde está la
  reserva tentativa de prueba creada por el WF2. El 15 de septiembre sí la tiene. La cadena
  navegador → Next.js → n8n → Google Calendar → hueco descontado **funciona**
- **VERIFIED**: `/agendar?servicio=consultoria-fiscal-extranjeros` responde `200` y el log del
  servidor **no** muestra `[n8n] ⚠️ MOCK activo`
- **VERIFIED**: los 4 workflows cumplen 5 de los 6 puntos del contrato (ver § Notas para el sexto)
- **VERIFIED (escritura de punta a punta)**: `POST /api/v1/appointments` con un lead real devolvió
  `201`, `eventId: 7gpr7fcrese3gcsv7u9h4l4c4c` y **`crmDelivery: "delivered"`**. Consultar la
  disponibilidad justo después devuelve el día **sin la franja recién reservada**. El bucle completo
  —reservar, revalidar, descontar— queda cerrado sobre datos reales
- **CHANGED (n8n)**: el WF4 tiene el **nodo de borrar conectado**, después de verificar el filtro en
  seco con las dos mitades de la condición de TTL (ejecuciones 437 y 438)
- **PUBLISHED**: `Leos Firm - Limpiar reservas vencidas` (`384dd1f3`). **Los 3 workflows que corren
  hoy están publicados**; el de confirmar espera a Square. En la ejecución 444, con dos reservas
  tentativas en el calendario, borró la de 52 minutos y **dejó intacta la de 8** — en la misma pasada
  y solo por antigüedad. La condición que protege una reserva que se está pagando queda demostrada,
  no razonada

### Archivos modificados
- `.env` — tres variables nuevas (**no se commitea**, está en `.gitignore`)
- `CHANGELOG.md` · `docs/features/scheduling.md` — estado de la conexión y la desviación del WF1

**Sin cambios en `src/`.** Conectar era poner variables, exactamente como estaba previsto.

### Cambios en base de datos
- Ninguno (Supabase congelado, ADR-010).

### Validación
- `npm run build` ✅ · `npm run lint` ✅ (sin avisos)
- `/agendar` → `200` · `/api/v1/availability` → slots reales del calendario de la firma

### Notas
- 🔴 **Vercel sigue pendiente y no lo puedo hacer yo:** el conector de Vercel **no está autenticado**
  en esta sesión. Las tres variables hay que ponerlas a mano en el panel de Vercel y **volver a
  desplegar** — Vercel no recoge variables nuevas en un despliegue ya hecho.
- ⏳ **Las dos columnas del CRM siguen sin crear.** El paso 1 (añadirlas a la hoja) es manual: no
  tengo acceso de escritura a ese documento. Los pasos 2 y 3 (refrescar el esquema a 27 columnas y
  mapear los dos campos en el nodo `agenda`) los hago yo en cuanto existan. Mientras tanto,
  `policy_accepted_at` y `policy_accepted_ip` **se pierden en silencio**.
- ⚠️ **Punto 5 del contrato incumplido: el WF1 sí transforma.** Su nodo Code descarta los
  `cancelled` y los `transparency: transparent`, y convierte los eventos de día completo
  (`start.date`) a medianoche UTC. Next.js ya hace las tres cosas, así que hoy es trabajo duplicado
  y **funciona correctamente** — la conversión de día completo cubre de sobra la franja 9-17
  `America/Chicago`. Pero el contrato pide crudo y el doc lo llama "probablemente la más segura":
  menos nodos, menos que se rompa. **Queda como deuda, no como fallo.**
- ✅ **El WF4 quedó PUBLICADO** y corre cada 10 minutos. Se estrenó limpiando sus propias pruebas.
- ⚠️ La reserva de prueba del endpoint real dejó una **fila de prueba en el CRM** que conviene quitar
  a mano al revisar la hoja (`lead_id 4d7e2b16-9c31-4f0a-b8e2-5a1c9f3d7e64`).
- `N8N_CONFIRM_WEBHOOK_URL` queda puesta pero **no responde**: el WF3 existe y está probado, pero no
  se publica hasta la FASE 6 porque lo dispara Square.

---

## [2026-08-05] — Contrato alineado y los dos webhooks publicados — v0.5.1

### Request original
> autorizado · [tras reasignar credenciales] hecho

### Tipo de cambio
- **FIXED (bloqueante)**: el **WF2 y el WF3 renombrados al `snake_case` en inglés** del § Contrato
  exacto. Las dos mitades ya se hablan
- **ADDED**: el WF2 guarda `client_timezone` en la descripción del evento — antes se perdía, y a
  Claudia le sirve saber en qué huso vive quien la va a llamar
- **FIXED (🐛)**: el PATCH del WF3 ahora **reescribe la descripción** a «CITA CONFIRMADA. Pago
  recibido.» con la política de tolerancia y reprogramación. Antes una cita pagada seguía diciendo
  «RESERVA SIN PAGAR … el limpiador la borra»
- **RESTORED**: el CC a `claudia@leosfirm.com` en el nodo de Gmail
- **PUBLISHED**: `Leos Firm - Disponibilidad` (`b4cdb752`) y `Leos Firm - Reservar slot`
  (`ff5d064b`). **Los dos webhooks están vivos en producción**
- **VERIFIED (ciclo completo de ADR-011)**: se reserva un slot y **el hueco desaparece de la
  disponibilidad**. Es la demostración de punta a punta del diseño, contra el calendario real

### Archivos modificados
- `docs/features/scheduling.md` — estado por workflow, **Production URLs**, checklist actualizada
- `CHANGELOG.md` — esta entrada

**Sin cambios en `src/`.**

### Cambios en base de datos
- Ninguno (Supabase congelado, ADR-010).

### Validación
- Ejecución **435**: el WF2 creó `jopd89gge2hud9jkddlr14s72k` leyendo `full_name`, `service_name`,
  `start_utc` y `client_timezone` correctamente.
- Ejecución **436**: el WF1 devolvió ese bloque como ocupado, con `status: "tentative"`.

### Notas
- ⚠️ **Queda un evento de prueba**: `jopd89gge2hud9jkddlr14s72k`, 14 de septiembre de 2026. A
  diferencia del anterior, este **sí** cae dentro de la ventana de 60 días del limpiador — sirve para
  verificarlo antes de conectarle el borrado.
- ⚠️ **El sitio desplegado sigue sin usar esto** hasta que `N8N_AVAILABILITY_WEBHOOK_URL` y
  `N8N_BOOKING_WEBHOOK_URL` estén en Vercel **y se vuelva a desplegar**.
- El WF3 queda sin publicar a propósito: lo dispara el webhook de Square en la FASE 6.

---

## [2026-08-05] — Las dos mitades de la FASE 5 se encuentran (y no se hablan) — v0.5.0

### Request original
> claude entra al GitHub y haz el merge de ambas partes para hacer el commit general y ver
> actualizado en vercel

### Tipo de cambio
- **MERGED**: la mitad de n8n (documentación de los 4 workflows) se integra con la mitad de Next.js
  que ya estaba en `main` (`87f3fce`). Conflicto en `docs/features/scheduling.md` resuelto
  **conservando ambas partes**: el § Contrato exacto de Next.js y el estado real de los workflows
- **🔴 FOUND (bloqueante)**: **los nombres de campo no coinciden.** Next.js manda `full_name`,
  `email`, `phone`, `service_name`, `service_slug`, `start_utc`, `end_utc`, `client_timezone`; los
  workflows WF2 y WF3 leen `nombre`, `correo`, `telefono`, `servicio`, `start`, `end`. **Solo
  coincide `lead_id`.** Con las URLs reales, `{{ $json.body.start }}` llega vacío y Google responde
  `400`: ninguna reserva funcionaría
- **DECIDED**: **gana la nomenclatura de Next.js** — `snake_case` en inglés, que es la que ya usa el
  payload del CRM (`full_name`, `email`, `phone`). Las claves en español venían del pseudocódigo del
  diseño y se apartaban de la convención del repo. Se adapta n8n, no el código
- **DOCUMENTED (causa de raíz)**: el contrato en español se fijó y se documentó, pero **la rama nunca
  se pusheó**. El compañero no tenía forma de verlo y dedujo —bien— los nombres a partir del payload
  del CRM. La lección es de proceso, no de código: **un contrato que no está en `main` no existe**

### Archivos modificados
- `docs/features/scheduling.md` — merge de las dos mitades; el § Contrato exacto queda marcado como
  **la autoridad**; los ejemplos JSON del WF2 y WF3 corregidos al `snake_case` inglés, con un aviso
  de que los workflows todavía no los leen; cabecera de estado reescrita
- `CHANGELOG.md` — esta entrada

**Sin cambios en `src/`.**

### Cambios en base de datos
- Ninguno (Supabase congelado, ADR-010).

### Validación
- Merge sin pérdida: las dos secciones en conflicto se conservaron enteras.
- **La integración real sigue sin probarse**: los workflows no están publicados y las variables
  `N8N_*_WEBHOOK_URL` no están en Vercel, así que el sitio desplegado usa el **mock** de
  `src/lib/n8n/mock.ts`. Es el comportamiento correcto y deliberado.

### Notas
- ⚠️ **Nada cambia visiblemente en Vercel con este merge**: los workflows siguen sin publicar y las
  variables sin poner, así que el calendario del sitio sigue mostrando datos del mock.
- 🔴 **Lo primero de la próxima sesión**: renombrar los campos del WF2 y el WF3. Bloquea la
  publicación.

---

## [2026-08-05] — FASE 5, mitad de n8n: los 4 workflows de agendamiento — v0.5.0-alpha

### Request original
> Vamos a implementar la mitad de n8n de la FASE 5 del roadmap: "Agendamiento — calendario propio".
> Mi compañero está construyendo en paralelo, en otra rama, la mitad de Next.js (aritmética de
> disponibilidad, endpoints, componentes) contra el contrato que ya está documentado. Mi trabajo es
> SOLO n8n + Google Calendar. No debo tocar código de Next.js ni archivos de src/

### Tipo de cambio
- **ADDED (n8n)**: los **4 workflows** de la FASE 5, creados como **borradores sin publicar**:
  `Leos Firm - Disponibilidad` (`hYS8Fk87wUfadriW`), `Leos Firm - Reservar slot`
  (`5MnPI0yaiahvOybZ`), `Leos Firm - Confirmar cita` (`5Tx6yxAmPBMghDBS`) y
  `Leos Firm - Limpiar reservas vencidas` (`hLWyt2vHv3CrCVBt`)
- **DOCUMENTED (hallazgo bloqueante)**: **el nodo `googleCalendar` v1.3 de n8n no expone `status`**.
  Solo tiene `showMeAs` (que es `transparency`), y tampoco expone `conferenceData` en `update`. Como
  ADR-011 se sostiene entero sobre `status: 'tentative'`, los workflows 2 y 3 usan **HTTP Request**
  con `nodeCredentialType: googleCalendarOAuth2Api` contra la API de Calendar. La credencial sigue
  dentro de n8n y **el contrato con Next.js no cambia**
- **DOCUMENTED (contrato)**: se fijan los **nombres de campo de entrada** del WF2 y el WF3, que el
  diseño nunca había definido — solo decía `{{ nombre }}`. `eventId` y `meetingUrl` quedan en
  camelCase (como ya estaba escrito); el resto en snake_case, igual que el payload del CRM
- **DOCUMENTED (riesgo)**: n8n **auto-asignó** a los nodos las credenciales
  `api_google_calendar_aiinovate` y `api_gmail_aiinovate`, que son **del equipo de desarrollo, no de
  la firma**. Publicar así repetiría con el calendario de la clienta el error que ADR-012 documenta
  para la hoja del CRM. Queda marcado como bloqueante antes de publicar
- **SAFETY**: en el limpiador, el nodo de borrado queda **desconectado a propósito** hasta verificar
  el filtro con datos reales, y el filtro exige **tres** condiciones (`status`, prefijo del título y
  antigüedad) para no borrar los eventos tentativos que Claudia cree a mano

### Archivos modificados
- `docs/features/scheduling.md` — estado por workflow con sus IDs, contratos JSON exactos de los 4,
  sección nueva **«Estado de la puesta en marcha»** con el criterio de entrada verificado, el
  hallazgo del nodo sin `status`, las tres trampas del WF1 y la lista de lo que falta para publicar
- `CHANGELOG.md` — esta entrada

**Sin cambios en `src/`**: el trabajo de Next.js va en otra rama y este request no lo toca.

### Cambios en base de datos
- Ninguno (Supabase congelado, ADR-010). La retención del slot es un evento tentativo en Calendar.

### Validación
- Los 4 workflows pasan `validate_workflow` del SDK de n8n. El único aviso es el
  `DISCONNECTED_NODE` del nodo de borrado, que es intencional.
- **No se probó nada contra Google.** No hay credencial de la firma ni `GOOGLE_CALENDAR_ID` real, así
  que ningún workflow se ha ejecutado jamás contra un calendario.
- Solo se tocó documentación en el repo: `npm run build` no cambia de resultado. Sin dependencias ni
  variables de entorno nuevas.

### Notas
- Los tres webhooks reusan la credencial Header Auth del CRM, así que **no hay secreto nuevo que
  repartir**: es el mismo `N8N_WEBHOOK_TOKEN`.
- Falta por verificar con un `curl` real: que el nodo *Respond to Webhook* devuelva un **array** en
  la raíz del body (WF1) y no lo envuelva en un objeto.

---

## [2026-08-05] — FASE 5: criterio de entrada cumplido y ADR-011 verificado — v0.5.0-beta

### Request original
> dame los pasos para hacer el paso 1 tipo manual · [tras ejecutarlo] el Calendar ID es: c_4a1fcc0c…

### Tipo de cambio
- **VERIFIED (bloqueante resuelto)**: el **criterio de entrada de la FASE 5 está cumplido**.
  Calendario dedicado **«Consultas Leos Firm»** (`c_4a1fcc0c…cbabfaf@group.calendar.google.com`) en
  la cuenta `marco@leosfirm.com`, con credenciales `Google Calendar - Leos Firm` y `Gmail - Leos Firm`
- **VERIFIED (ADR-011)**: **`status: "tentative"` funciona**. El WF2 creó un evento real
  (`fnrat2iln058co1enpgj5qg1ac`) y Google devolvió `"status": "tentative"`, con
  `organizer: "Consultas Leos Firm"` y `creator: marco@leosfirm.com`. Es la primera confirmación
  empírica de que la retención del slot por evento tentativo es viable
- **VERIFIED**: la **trampa del `drive.file` no aplica a Calendar** — comprobado con una llamada
  real, no por teoría: la credencial escribe en un calendario que ella no creó
- **VERIFIED**: `leosfirm.com` **es Google Workspace** → consentimiento *Interno* → el refresh token
  **no caduca**. El riesgo de "se cae solo a los 7 días" queda cerrado
- **VERIFIED**: las tres trampas del WF1. Con el calendario vacío, el nodo *Respond* **sí dispara** y
  devuelve `[]` en vez de colgar la petición
- **VERIFIED**: la condición de TTL del limpiador. Con una reserva de 21 segundos, el filtro devolvió
  lista vacía: no mata una reserva que se está pagando
- **CHANGED (n8n)**: el `GOOGLE_CALENDAR_ID` real reemplaza al marcador en los 5 nodos de los 4
  workflows
- **DOCUMENTED (trampa operativa nueva)**: **el MCP de n8n pierde la credencial en cada
  actualización.** Ignora el nombre pedido en `newCredential()` y asigna la primera de ese tipo —
  aquí `api_google_calendar_aiinovate`, del equipo de desarrollo, que responde **404**. Elegir la
  credencial a mano pasa a ser **siempre el último paso**. Costó tres ejecuciones fallidas
  descubrirlo
- **DOCUMENTED**: `get_workflow_details` **oculta las credenciales**, así que no se pueden verificar
  leyendo el workflow — solo ejecutándolo

### Archivos modificados
- `docs/features/scheduling.md` — § Estado de la puesta en marcha reescrita con los resultados
  reales, tabla de estado por workflow, la trampa de la credencial y la checklist de lo que falta
- `CHANGELOG.md` — esta entrada

**Sin cambios en `src/`.**

### Cambios en base de datos
- Ninguno (Supabase congelado, ADR-010).

### Validación
- Ejecuciones reales en n8n contra el calendario de la firma: **431** (WF1, verde), **432** (WF2,
  creó el evento tentativo), **433** (WF4, filtro en seco devolvió vacío correctamente).
- WF3 **sin probar**: manda un correo de verdad al cliente y con copia a Claudia. Requiere permiso.
- Solo documentación en el repo: `npm run build` no cambia de resultado.

### Notas
- ⚠️ **Queda un evento de prueba en el calendario:** `fnrat2iln058co1enpgj5qg1ac`, el 4 de enero de
  2027 — ahora titulado `Consulta — PRUEBA TECNICA (borrar) — …` y **confirmado con Meet**, porque se
  reutilizó para probar el WF3. El limpiador **no** lo va a recoger (está fuera de su ventana de 60
  días, y además ya no cumple el filtro). Hay que borrarlo a mano.
- ⚠️ El **CC a `claudia@leosfirm.com`** se quitó del nodo de Gmail para poder probar sin mandarle una
  confirmación falsa. **Hay que restaurarlo antes de publicar.**
- 🐛 **Bug abierto en el WF3:** el PATCH no actualiza `description`, así que una cita pagada sigue
  diciendo «RESERVA SIN PAGAR … el limpiador la borra». No rompe nada (el limpiador se guía por el
  `summary`) pero Claudia lo lee. Arreglar antes de publicar.
- ⚠️ La prueba de los **dos husos horarios salió degenerada**: con `America/Mexico_City` y una fecha
  de enero, ambas horas dan `09:00` porque las dos zonas están en UTC-6. Es correcto, pero no prueba
  la conversión. Repetir con husos realmente distintos.
- ✅ **WF3 probado** (ejecución 434): `status: confirmed`, `summary` cambiado a `Consulta — …`, Meet
  `https://meet.google.com/vup-vdha-oxd` creado con `createRequest.status: "success"` ya en el propio
  PATCH, invitado añadido y correo enviado (`19fd27ce9c9ea5af`, `SENT`). De paso queda verificado que
  al cambiar el título la cita **deja de cumplir el filtro del limpiador**, que hasta ahora solo
  estaba razonado en el papel.
- ⚠️ **Ningún workflow está publicado todavía.** Publicar pone un webhook en producción y requiere
  autorización explícita.
- El workflow `TEMP - Prueba credencial Calendar` (`VQuVBmjXBJIjViBi`) quedó sin usar y hay que
  archivarlo: la prueba terminó haciéndose contra los workflows reales, que es mejor evidencia.
- La zona horaria de la instancia de n8n es `America/Sao_Paulo`. No afecta a los cálculos, que usan
  instantes absolutos, pero confunde al leer logs.

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

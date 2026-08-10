# Roadmap por Fases — Leos Firm LLC

> **Última actualización:** 2026-08-10
> **Este archivo es la ÚNICA fuente de verdad del orden de trabajo.**
> Si otro documento contradice esta tabla, gana esta tabla y el otro documento se corrige.

> ## ⚠️ Replanteo del 2026-08-04
>
> La clienta pidió tres cambios que reordenan el bloque B entero:
>
> 1. **Todos los servicios se cobran** ($150, $250 y seis a $50 de consulta inicial) → ADR-009.
>    Desaparece la rama del correo: un solo flujo de agenda y pago para los ocho.
> 2. **El CRM es una hoja de Google**, no Supabase → ADR-010. n8n pasa a ser la capa de integración.
> 3. **El calendario se clona dentro del sitio**, sin agente de IA y sin redirigir a Google.
>
> **Supabase queda congelado** y con él las fases que dependían de él. Las fases 6 a 14 de la versión
> anterior se reemplazan por las de la tabla de abajo. El bloque A (front end) no cambia de orden.

---

## Cómo está organizado el trabajo

El proyecto se ejecuta en **dos bloques consecutivos**:

```
BLOQUE A — FRONT END          BLOQUE B — BACK END
(fases 1 a 5)                 (fases 6 a 14)
lo que el cliente ve          lo que hace que funcione
sin ninguna integración       Supabase · Square · Google · IA
        │                              │
        └──────── se cierra ───────────┘
           antes de empezar el otro
```

**Por qué en ese orden.** El front end no depende de ninguna integración: se puede terminar,
mostrar a la clienta y aprobar sin gastar un dólar en Supabase, Square ni Google. El back end sí
depende del front end (necesita saber qué datos se capturan y en qué orden). Empezar por el back
end obligaría a rehacerlo cada vez que cambie una pantalla — que es exactamente lo que pasó con el
formulario de intake, que estaba planeado *después* del pago y hubo que moverlo *antes* (ADR-008).

**Regla de cierre de fase:** una fase no se marca completa sin sus 8 checkpoints de documentación
(Método AInnovate FASE 3): doc de feature, `CHANGELOG.md`, `DB_SCHEMA.md` si tocó tablas,
`API_DOCS.md` si tocó endpoints, `npm run build`, `npm run lint`, revisión visual y resumen al
usuario.

---

## Estado global

| # | Fase | Bloque | Entregable | Estado |
|---|------|--------|-----------|--------|
| 1 | Setup + documentación + design system | A · Front | Estructura, 8 docs, tokens | ✅ **Completa** |
| 2 | Sitio público | A · Front | 6 páginas, 17 rutas | ✅ **Completa** |
| 3 | **Diagnóstico interactivo + captación de leads** | A · Front | Popup, árbol de preguntas, `POST /leads` | ✅ **Completa** |
| 4 | **Cobro universal + CRM en Google Sheets** | B · Back | Los 8 servicios con precio, `leads` → hoja vía n8n | ✅ **Completa** |
| 5 | **Agendamiento: calendario propio** | B · Back | `/agendar`, disponibilidad real, reserva tentativa | ✅ **Completa** (2026-08-06) |
| 6 | Square: checkout + webhook | B · Back | Cobro real, confirmación de la cita, CRM `pagado` | ✅ **Completa** (2026-08-06) — **primer pago real** |
| 7 | Correos por n8n | B · Back | Confirmación, recordatorios 24 h / 1 h | 🔨 **Casi** — confirmación entregada; falta ver correr un recordatorio |
| 8 | Cierre de front end | A · Front | A11Y, SEO, 404/500, contenido pendiente | 🔨 **Código listo** — lo abierto es contenido de la clienta |
| 9 | **Cancelar y reprogramar cita — versión mínima** | B · Back | Enlace con token en el correo: ver, cancelar, pedir cambio | 🔨 **En curso** — Next.js listo; los 3 workflows creados **sin publicar** |
| — | **Flujo v2** (asistente, estados de entrega, liberar hueco) | B · Back | Documento de la clienta del 2026-08-07 | 🔨 **En curso** — ver § *Deriva entre el repo y producción* |
| 10 | Hardening + deploy | B · Back | Security review, tests, Vercel | ⬜ Pendiente |
| — | ~~Referidos~~ | — | **FUERA DEL ALCANCE** (2026-08-06) | 🧊 A futuro |
| — | ~~Post-cita~~ | — | **Reabierta de hecho** por el estado `Finalizado` (§8 del flujo v2) | ⚠️ Sin disparador |

---

## 🔴 Deriva entre el repo y producción — auditado el 2026-08-10

Tres decisiones ya escritas en el repositorio **no están aplicadas donde se ejecutan**. Verificado
leyendo la instancia real de n8n, no deducido. Mientras esto siga así, `git log` describe un sistema
que no existe.

| # | Lo que dice el repo | Lo que hace producción | Consecuencia |
|---|---|---|---|
| 1 | `SLOT_HOLD_MINUTES = 15` ([`business.ts`](../src/constants/business.ts)) | El nodo Code del WF4 tiene `30`, y su trigger corre **cada 30 min** pese a llamarse «Cada 10 minutos» | Un hueco impago se libera entre los **30 y los 60 minutos**. La decisión de la clienta no está viva |
| 2 | `crm.service.ts` manda `service_status` | Los 3 nodos de Sheets del WF1 conservan el esquema de 27 columnas, **sin `Estado de atencion`** | Google Sheets mapea **por nombre**: el campo llega y **se descarta en silencio**. La máquina de estados existe en el código y en cero filas |
| 3 | `POST /api/v1/appointments/release` + WF11 «Liberar hueco» | El WF11 está **creado y sin publicar**, y los 3 commits **no están desplegados** (`origin/main` = `b25269c`) | El endpoint no existe en producción. El hueco sigue expirando solo, que era el respaldo por diseño |

### ⚠️ El borrador del WF4 apunta a otro calendario — NO publicarlo tal cual

El WF4 «Limpiar reservas vencidas» tiene `versionId ≠ activeVersionId`: hay un borrador guardado que
**no es lo que corre**. Y el borrador usa un calendar ID distinto del que corre:

| Versión del WF4 | Calendar ID |
|---|---|
| La que corre (`activeVersion`) | `c_4a1fcc0c1c44…cbabfaf` ✅ |
| El borrador guardado | `c_0686985cc720…e349744` ❌ |

**El bueno es `c_4a1fcc0c…`**: es el que usa el WF2 «Reservar slot» para crear los eventos, y el WF2
no tiene divergencia entre borrador y activo. Publicar el borrador del WF4 dejaría al limpiador
mirando un calendario donde no hay nada que limpiar — y las reservas impagas bloquearían la agenda
para siempre, que es exactamente lo que ese workflow existe para impedir.

### Lote pendiente de n8n — **a mano en la UI, nunca por MCP**

Actualizar por MCP **borra las credenciales de los nodos** (probado dos veces; está en las notas
adhesivas del WF2 y del WF4). Los workflows de esta lista están **activos en producción**, así que
cada cambio se hace en la interfaz:

- [ ] **WF4** · nodo Code → `const SLOT_HOLD_MINUTES = 15;` · y el trigger de 30 a 10 min, para que
      el nombre del nodo deje de mentir. Antes: resolver el borrador divergente de arriba
- [ ] **WF1** · añadir la columna `Estado de atencion` a la hoja **y** al esquema de los **tres**
      nodos de Sheets. Mapeo en [`features/crm-sheets.md`](./features/crm-sheets.md)
- [ ] **WF3** · añadir el enlace de gestión al correo. El payload ya lleva `access_token` y
      `appointment_url`: **sin esto nadie recibe el enlace** aunque la FASE 9 se publique entera
- [ ] **WF3** · `CC: marco@leosfirm.com` → `BCC: claudia@leosfirm.com` · arreglar los acentos
- [ ] **WF2** · la descripción del evento dice «si el pago no llega en **10 minutos**». Es texto que
      lee Claudia en su calendario y hoy es falso en dos sentidos
- [ ] Credencial Gmail de `claudia@leosfirm.com` → aplicarla a los **6** nodos de Gmail (ADR-017)
- [ ] Publicar los **4** workflows inactivos: `Consultar cita`, `Cancelar cita`,
      `Pedir otro horario`, `Liberar hueco` → pone 4 webhooks en producción, **requiere autorización
      explícita** (4 Leyes de Operación)
- [ ] Después de publicar: `APPOINTMENT_TOKEN_SECRET` y las 4 URLs de webhook en Vercel + redespliegue

### Qué se cayó de la lista y por qué

| Fase anterior | Qué pasó |
|---------------|----------|
| *Supabase + entrega real del lead* | **Eliminada.** El CRM es una hoja de Google (ADR-010). El diseño de las 13 tablas queda en `DB_SCHEMA.md` sin aplicar |
| *Agente IA en el intake* | **Eliminada.** La clienta pidió explícitamente no usar un agente de IA en el agendamiento. El intake completo se sustituye por lo que ya captura el diagnóstico |
| *CRM + panel admin* | **Eliminada.** La hoja de cálculo *es* el panel. Se reabre si el volumen la supera |
| *Front end de agendamiento con datos simulados* | **Absorbida por la FASE 5.** Ya no tiene sentido maquetar con datos falsos: n8n puede dar disponibilidad real desde el primer día |

---

## BLOQUE A — FRONT END

### FASE 1 — Setup + documentación ✅
**Entregable:** Next.js 16 + TS + Tailwind v4, 8 documentos del método, tokens del design system,
reglas de IA para 6 editores, `.env.example`, health check.
**Cierre:** `npm run build` verde y documentación completa. → `CHANGELOG` v0.1.0

### FASE 2 — Sitio público ✅
**Entregable:** portada, catálogo, detalle de servicio (SSG), sobre Claudia, FAQ, políticas.
**Doc:** [`features/public-site.md`](./features/public-site.md) → `CHANGELOG` v0.2.0

### FASE 3 — Diagnóstico interactivo + captación de leads ✅
**Entregable:** popup en el detalle de servicio, árbol de 3 preguntas, deducción del servicio,
captura de contacto, `POST /api/v1/leads`.
**Doc:** [`features/lead-diagnostic.md`](./features/lead-diagnostic.md) → `CHANGELOG` v0.3.0
**Decisión asociada:** ADR-008 — el dato se captura **antes** del pago.
**Deuda cerrada en la FASE 4:** el endpoint ya entrega de verdad.

---

## BLOQUE B — BACK END

> **Decisiones con costo que quedan del lado del usuario y la clienta:**
> conectar en n8n la credencial de Google Calendar desde el **Google Console de `marco@leosfirm.com`**
> (FASE 5, ADR-012). Supabase y el service account de Google Workspace **ya no hacen falta** (ADR-010).
> ~~Abrir la cuenta de Square~~ — **ya existía**: la firma cobra por Square desde 2020 (verificado por
> API el 2026-08-06). Lo único que hacía falta era llevar sus credenciales a Vercel.
>
> **Deuda arrastrada:** la hoja del CRM es propiedad de una cuenta personal del equipo de desarrollo
> (`wilyerernestoarias@gmail.com`). Se migra a la firma **después de la FASE 5** — ADR-012 y
> [`features/crm-sheets.md`](./features/crm-sheets.md) § Propiedad de la hoja.

### FASE 4 — Cobro universal + CRM en Google Sheets ✅
**Entregable:** los ocho servicios con precio ($150, $250 y seis a $50 de consulta inicial abonable),
eliminación de la rama del correo, `leadId` que atraviesa el embudo, `POST /api/v1/leads` escribiendo
en la hoja del CRM a través de n8n, workflow `Leos Firm - CRM de leads` publicado.
**Docs:** [`features/crm-sheets.md`](./features/crm-sheets.md) ·
[`features/lead-diagnostic.md`](./features/lead-diagnostic.md)
**Decisiones asociadas:** ADR-009 (todos los servicios se cobran) · ADR-010 (n8n como capa de
integración; Supabase congelado)
**Cierre verificado el 2026-08-05:** `POST https://leos-firm.vercel.app/api/v1/leads` →
`delivery: "delivered"`. Etapas `formulario` y `agenda` probadas contra la hoja real, con upsert por
`ID` confirmado.

### FASE 5 — Agendamiento: calendario propio 🔨 EN CURSO
**Entregable:**
- `/agendar` — resumen de lo que se contrata, leído del catálogo
- Calendario propio dentro del sitio: días con cupo y horas libres, en el huso del visitante
- `GET /api/v1/availability` — ocupados reales de Google Calendar ∩ `BUSINESS_HOURS`
- `POST /api/v1/appointments` — reserva **tentativa** del slot (ADR-011) + CRM `stage='agenda'`
- Workflows de n8n: disponibilidad, reservar slot y limpiar reservas vencidas
- Aceptación de la política de cancelación con `accepted_at` e IP

**Criterio de entrada:** credencial de Google Calendar conectada en n8n y `GOOGLE_CALENDAR_ID`
identificado, **ambos en el Google Console del cliente (`marco@leosfirm.com`, ADR-012)** —
**manual paso a paso en [`features/scheduling.md`](./features/scheduling.md)
§ Manual de puesta en marcha**. Ambos son bloqueantes; las decisiones de negocio (horario,
anticipación mínima, ventana máxima) tienen valores por defecto y no bloquean.
**Criterio de salida:** un visitante puede elegir día y hora reales, el slot queda bloqueado en el
calendario de Claudia y la fila del CRM avanza a `agenda`.
**Doc:** [`features/scheduling.md`](./features/scheduling.md) — **ya escrito**

**La fase se construye en dos mitades en paralelo (2026-08-05).** El contrato que las une está
cerrado y documentado campo por campo en
[`features/scheduling.md`](./features/scheduling.md) § *Contrato exacto entre Next.js y n8n*:

| Mitad | Quién | Estado |
|-------|-------|--------|
| Los 4 workflows de n8n + credencial de Calendar | Wilyer | ✅ **Listos y publicados** |
| `/agendar`, los 2 endpoints y la aritmética de husos | Next.js | ✅ **Listo** (2026-08-05, contra el mock) |

La mitad de Next.js **no espera** a que existan los webhooks: se construye contra el contrato con un
mock local, y pasar a producción es poner `N8N_AVAILABILITY_WEBHOOK_URL` y `N8N_BOOKING_WEBHOOK_URL`
— sin tocar código. **El mock no puede activarse en producción por diseño.**

✅ **Las dos columnas del CRM** (`Politica aceptada el`, `IP de aceptacion`) quedaron creadas en la
hoja y mapeadas en el WF1 el **2026-08-06** — el esquema de los tres nodos pasó de 25 a 27 columnas y
la etapa `agenda` escribe las dos: [`features/crm-sheets.md`](./features/crm-sheets.md) § *Las dos
columnas de la política*. Era el último bloqueante de la fase.

✅ **FASE 5 CERRADA el 2026-08-06.** La comprobación que faltaba —una reserva real que llenara Z y AA
por primera vez— ocurrió cuatro veces el mismo día, con el lead `db0979de-…` a las 03:35:42 UTC como
la primera: `Politica aceptada el` = `2026-08-06T03:35:42.558Z`, `IP de aceptacion` = `104.28.50.209`.
Las cuatro reservas escribieron las dos columnas, incluidas las tres cuyo pago falló — que es
exactamente lo que ADR-008 quería: **la evidencia de la política se guarda aunque el pago no ocurra.**

### FASE 6 — Square: checkout + webhook 🔨 EN CURSO
Web Payments SDK, `POST /checkout`, webhook con firma HMAC e idempotencia. Al confirmarse el pago:
el evento tentativo pasa a confirmado con enlace de Meet y el CRM avanza a `pagado`.
**Doc:** [`features/payments.md`](./features/payments.md) — **ya escrito** (2026-08-05)
**Criterio de entrada:** ✅ **cumplido desde antes de empezar, y nadie lo había comprobado.** La cuenta
de Square de la firma (merchant `QVGQDZCV0X3WD`, *Leos Firm LLC*) está `ACTIVE` con banco vinculado
y transferencias automáticas **desde 2020** — verificado por API el 2026-08-06. Este roadmap lo listó
como pendiente «que tarda días» por suposición; la clienta ya cobraba por Square.
**Decisiones propuestas en el doc, pendientes de copiar a `02-architecture.md`:** ADR-013 (la
idempotencia la da la transición del evento de Calendar; la hoja es el registro) · ADR-014 (el
contexto de la cita viaja en la metadata de la orden de Square).

**Se construye en dos mitades, igual que la FASE 5:**

| Mitad | Quién | Estado |
|-------|-------|--------|
| WF5 `Registrar pago`, WF3 con `If-Match` publicado, pestaña `Pagos`, el `30` en el WF4 | Wilyer | ✅ **Listo** (2026-08-05) |
| `/checkout`, el webhook, el poll de estado y la pantalla de pago | Next.js | ✅ **Listo** (2026-08-05, sandbox) |

**Estado al 2026-08-05.** La cadena completa está cerrada y probada de punta a punta:
checkout → Square → webhook → WF5 → WF3 → WF1. Pestaña `Pagos` con sus 11 encabezados, WF5
publicado y probado por sus tres caminos, WF3 publicado con `If-Match` (ejecuciones 492 y 493), WF1
corregido, y `N8N_PAYMENTS_WEBHOOK_URL` en Vercel.

✅ **Criterio de salida alcanzado en sandbox.** El último riesgo abierto se cerró el mismo día: el
`SLOT_HOLD_MINUTES` del nodo Code del WF4 pasó a **30** y quedó publicado, así que el limpiador ya no
borra un slot que el código cree retenido. Ya no se puede cobrar sin poder entregar
([`features/payments.md`](./features/payments.md) § El riesgo del limpiador).

### ✅ FASE 6 CERRADA — el primer pago real, 2026-08-06 14:48:59 UTC

Marco Bustamante (`marco@bmbookkeeping.com`), servicio `bookkeeping`, $50 de consulta inicial. Cobró,
el evento pasó a confirmado, Google generó el Meet (`meet.google.com/mdf-dwrq-aog`), el correo llegó y
la fila `110b82aa-…` avanzó a `pagado`. La cadena
checkout → Square → webhook → WF5 → WF3 → WF1 funcionó de punta a punta **con dinero real**.

**Los cuatro intentos son el registro más útil que dejó esta fase**, porque fechan el fallo y el
arreglo al minuto:

| Lead | Hora UTC | Estado | Qué pasaba |
|---|---|---|---|
| `db0979de-…` | 03:35:42 | `agenda` | `401` — Vercel tenía un token que no era de producción |
| `5a82b523-…` | 04:27:47 | `agenda` | `401` — el mismo |
| `9456b4d5-…` | 05:17:41 | `agenda` | `401` — el mismo |
| — | **14:35** | — | token de producción puesto y **verificado** (`404`, no `401`) |
| `110b82aa-…` | **14:48:59** | **`pagado`** | ✅ |

> 💡 **Un intento fallido crea una fila NUEVA, no actualiza la anterior.** Marco quedó con cuatro filas
> porque cada pasada por el embudo acuña un `leadId` nuevo, y el upsert de la hoja va por `ID`. No es un
> bug —ADR-008 quiere conservar al que abandona— pero con reintentos seguidos Claudia ve la misma
> persona repetida. Si el volumen lo vuelve molesto, la solución es deduplicar por correo en el WF1, no
> tocar el `leadId`.

**Limpieza pendiente:** borrar de la hoja las tres filas `agenda` de Marco (`db0979de-…`,
`5a82b523-…`, `9456b4d5-…`). Sus eventos tentativos en Calendar ya los borró el WF4.

**Lo que quedó sin verificar de esta fase:**

- [x] ✅ **`SQUARE_ACCESS_TOKEN` y `SQUARE_WEBHOOK_SIGNATURE_KEY` de producción en Vercel + redeploy —
  RESUELTO Y VERIFICADO** el 2026-08-06. El `401` era el token, como se sospechaba, pero comprobado por
  fin en vez de deducido: ahora el log responde `404 · NOT_FOUND` a una orden inventada y el webhook
  contesta `200` a un *Send Test Event*. **El checkout ya puede cobrar**
  ([`features/payments.md`](./features/payments.md) § *Verificar las credenciales sin cobrar un centavo*)
- 🎯 **Lo único que queda: la prueba de punta a punta sobre el sitio desplegado.** Ya es producción, la
  tarjeta se cobra de verdad y la de sandbox no sirve — usar los $50 de consulta inicial y reembolsar
  desde Square. **Esa misma prueba cierra las FASES 5, 6 y 7 a la vez**
- Confirmar que el **"De:"** del correo es la cuenta de la firma y no `api_gmail_aiinovate`
- Copiar **ADR-013** y **ADR-014** a [`02-architecture.md`](./02-architecture.md)

### FASE 7 — Correos por n8n 🔨 EN CURSO
Confirmación al cliente, copia a Claudia, recordatorios 24 h y 1 h antes. El scheduler es n8n, no
Vercel Cron.
**Doc:** [`features/notifications.md`](./features/notifications.md) — **ya escrito** (2026-08-06)
**Decisión propuesta en el doc:** ADR-015 (la marca de «recordatorio enviado» vive en el propio
evento de Calendar, y el correo se manda **antes** de marcar).

**Los tres correos están publicados** (2026-08-06). La confirmación venía de la FASE 6 —la manda el
WF3 y no se duplica, porque cuelga de la rama donde el `PATCH` con `If-Match` ganó la carrera— y ahora
se le suman **WF6** `Recordatorio 24 h` (`6836anE95HmUiyDg`, activo) y **WF7** `Recordatorio 1 h`
(`Edd15W7W2FS1Cagf`, activo).

**Criterio de salida, todavía no alcanzado:** ningún recordatorio ha corrido sobre una cita real
—solo miran eventos `confirmed`, y las tres reservas de la hoja quedaron sin pagar—, y siguen
pendientes las tres correcciones al correo de confirmación: acentos, `CC` → `BCC` y el destinatario de
la copia interna, que pasa a `claudia@leosfirm.com`.

**Esta fase no toca el repositorio:** cero código nuevo, ningún endpoint, ninguna variable. Es
enteramente n8n, porque el scheduler y las credenciales de Google viven ahí (ADR-010).

### FASE 8 — Cierre de front end 🔨 CÓDIGO LISTO (2026-08-06)

**Entregado:** `not-found.tsx`, `error.tsx`, `global-error.tsx`, `robots.ts`, `sitemap.ts`,
`src/constants/site.ts`, metadata con `openGraph`/`twitter`/`canonical`, y skip link.
Detalle y las tres decisiones no obvias: [`features/public-site.md`](./features/public-site.md)
§ *FASE 8*.

**Lo que sigue abierto, y ninguno es código:**
- 🔴 **La FAQ y la política §8 se contradicen sobre reembolsos** — y ya se está cobrando de verdad.
  Hay que unificar el texto. Decisión de la clienta
- Métricas de impacto y aviso de privacidad — la clienta
- Auditoría de accesibilidad con lector de pantalla y contraste medido
A11Y (contraste, foco, teclado, lectores de pantalla), responsive verificado, SEO y metadata,
`not-found.tsx` y `error.tsx`, textos legales.
**Criterio de salida:** la clienta aprueba el sitio completo.
**Bloqueantes conocidos (dependen de la clienta):** métricas de impacto, aviso de privacidad.
**Ya entregado por la clienta:** video y fotos (2026-08-03), respuestas de las 7 FAQ (2026-08-03).
**Por qué después del back end y no antes:** el flujo de agenda y pago mete pantallas nuevas. Pulir
antes de que existan sería pulir dos veces.

### FASE 9 — Cancelar y reprogramar cita, versión mínima 🔨 EN CURSO

**Decidido el 2026-08-06:** sí tiene que existir, pero **lo más sencillo posible**. Se recorta la fase
original (que traía reembolsos automáticos y reprogramación con disponibilidad en vivo) a lo que de
verdad hace falta:

- El correo de confirmación lleva un **enlace con token** a `/agendar/cita/[token]`
- Esa página muestra la cita y ofrece **dos botones**: *Cancelar* y *Pedir otro horario*
- Cancelar → libera el slot en Calendar, CRM a `cancelado`, avisa a Claudia y al cliente por correo
- Pedir otro horario → **no reagenda solo**: manda un correo a Claudia y ella lo acuerda con el cliente
- **Sin reembolsos automáticos.** El reembolso lo hace Claudia desde el panel de Square

**Por qué así:** el reembolso automático es la parte caramente compleja y la de menor volumen. Un
botón que libera el hueco y avisa cubre el 90 % del problema real.

**Doc:** [`features/appointment-management.md`](./features/appointment-management.md) — **ya escrito**
**Decisión asociada: ADR-016** — el token es firmado y **no se guarda en ningún lado**. Sin Supabase
no hay dónde escribir un UUID, y un UUID sin un sitio donde esté escrito no significa nada. Se firma
con HMAC-SHA256 y se verifica recalculándolo, en tiempo constante.

**Se construye en dos mitades, igual que las FASES 5 y 6:**

| Mitad | Quién | Estado |
|-------|-------|--------|
| La página, los 2 endpoints, el token firmado y la etapa `cancelado` | Next.js | ✅ **Listo** (2026-08-06, contra el mock) |
| WF8 `Consultar cita`, WF9 `Cancelar cita`, WF10 `Pedir otro horario` | n8n | ⬜ **Creados, SIN PUBLICAR** |

**Lo que falta, y ninguno es código:**

- 🔴 **`APPOINTMENT_TOKEN_SECRET`** generada y puesta en `.env.local` **y en Vercel**, con redespliegue
- 🔴 **Credenciales de Google a mano** en los 6 nodos que las necesitan. Al crearlos, los tres de
  Gmail quedaron con `api_gmail_aiinovate` —la cuenta del equipo de desarrollo— y los tres HTTP sin
  credencial. Es la lección del WF3 y del WF4, verificada otra vez
- 🔴 **Publicar los tres workflows** — pone tres webhooks en producción, así que **necesita
  autorización explícita** (4 Leyes de Operación)
- Las tres Production URL en `N8N_APPOINTMENT_WEBHOOK_URL`, `N8N_CANCEL_WEBHOOK_URL` y
  `N8N_RESCHEDULE_WEBHOOK_URL`, en local y en Vercel
- 🔧 **Añadir el enlace al correo del WF3**, a mano en la UI. El payload ya lo lleva
  (`access_token` + `appointment_url`) pero el nodo de Gmail todavía no lo usa: **sin esto nadie
  recibe el enlace** aunque todo lo demás funcione

### 🧊 Fuera del alcance — decidido el 2026-08-06

| Fase retirada | Motivo |
|---|---|
| *Referidos* (cupón de 30 min gratis) | A futuro, si la clienta amplía el alcance |
| *Post-cita* (resumen IA + propuestas) | A futuro, si la clienta amplía el alcance |

El diseño de ambas sigue descrito en `context.md`, así que retomarlas no parte de cero.

### FASE 10 — Hardening + deploy ⬜
`security-review`, `npm audit`, tests de los flujos críticos, checklist de
[`04-deployment.md`](./04-deployment.md), deploy a producción.

---

## Mapeo con los roadmaps anteriores

Esta tabla evita confusiones al leer documentos o commits antiguos. La numeración cambió dos veces:
el 2026-08-03 se separó front end de back end, y el 2026-08-04 se replanteó el bloque B entero.

| Roadmap de 14 fases (2026-08-03) | Ahora |
|----------------------------------|-------|
| FASE 4 — Front end de agendamiento y pago (datos simulados) | Absorbida por la **FASE 5** (con datos reales) |
| FASE 5 — Cierre de front end | **FASE 8** (se mueve después del back end) |
| FASE 6 — Supabase + entrega real del lead | **Eliminada** → **FASE 4** (CRM en Sheets, ADR-010) |
| FASE 7 — Square | **FASE 6** |
| FASE 8 — Google Calendar + Meet | **FASE 5** |
| FASE 9 — Gmail | **FASE 7** (por n8n, no por Gmail API) |
| FASE 10 — Agente IA en el intake | **Eliminada** (pedido de la clienta) |
| FASE 11 — CRM + panel admin | **Eliminada** — la hoja de cálculo es el panel |
| FASE 12 — Referidos | **FASE 10** |
| FASE 13 — Post-cita | **FASE 11** |
| FASE 14 — Hardening + deploy | **FASE 12** |
| *(no existía)* | **FASE 9** — Gestión de la cita con token |

---

## Lo que NO cambia con ningún replanteo

Estas reglas sobrevivieron a los dos reordenamientos y a los tres cambios de la clienta:

- La cita se confirma **solo** después del pago o del cupón de referido.
- El webhook de Square es la única fuente de verdad del pago (ADR-002).
- Google Calendar es la única fuente de verdad de la disponibilidad (ADR-003) — y la reserva
  tentativa de ADR-011 lo refuerza en lugar de sortearlo.
- La aceptación de la política de cancelación se registra al **agendar la cita**, con `accepted_at`
  e IP — no en el diagnóstico.
- El dato del cliente se captura **antes** del pago (ADR-008).
- Los precios se leen en el servidor, desde el catálogo, en centavos (ADR-006).

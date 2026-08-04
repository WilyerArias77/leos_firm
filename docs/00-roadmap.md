# Roadmap por Fases — Leos Firm LLC

> **Última actualización:** 2026-08-03
> **Este archivo es la ÚNICA fuente de verdad del orden de trabajo.**
> Si otro documento contradice esta tabla, gana esta tabla y el otro documento se corrige.

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
| 4 | Front end de agendamiento y pago | A · Front | `/agendar`: intake completo, calendario, pago (mock) | ⬜ Siguiente |
| 5 | Cierre de front end | A · Front | A11Y, SEO, 404/500, contenido pendiente | ⬜ Pendiente |
| 6 | Supabase + entrega real del lead | B · Back | Proyecto, migraciones, RLS, tipos, correo a Claudia | ⬜ Pendiente |
| 7 | Square: checkout + webhook | B · Back | Cobro real, `orders`, `payments` | ⬜ Pendiente |
| 8 | Google Calendar + Meet | B · Back | Disponibilidad real, cita, sala virtual | ⬜ Pendiente |
| 9 | Gmail: confirmaciones y recordatorios | B · Back | Correos + cron 24 h / 1 h | ⬜ Pendiente |
| 10 | Agente IA en el intake | B · Back | Preguntas adaptativas + validación semántica | ⬜ Pendiente |
| 11 | CRM + panel admin | B · Back | Citas, leads, estados, métricas | ⬜ Pendiente |
| 12 | Referidos (30 min gratis) | B · Back | Cupón + enlace de calendario compartible | ⬜ Pendiente |
| 13 | Post-cita: resumen IA + propuestas | B · Back | Resumen automático, cotizaciones | ⬜ Pendiente |
| 14 | Hardening + deploy | B · Back | Security review, tests, Vercel, cron | ⬜ Pendiente |

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
**Entregable:** popup sin X en el detalle de servicio, árbol de 3 preguntas, deducción del servicio,
captura de contacto, bifurcación cobro automático / correo a Claudia, `POST /api/v1/leads`.
**Doc:** [`features/lead-diagnostic.md`](./features/lead-diagnostic.md) → `CHANGELOG` v0.3.0
**Decisión asociada:** ADR-008 — el dato se captura **antes** del pago.
**Deuda declarada:** el endpoint valida pero todavía no persiste ni envía correo. Se cierra en FASE 6.

### FASE 4 — Front end de agendamiento y pago ⬜ SIGUIENTE
**Entregable (sin integraciones, con datos simulados):**
- `/agendar` — resumen de la compra leído del catálogo
- Intake completo de `context.md` §7 (condicional: con entidad / sin entidad, adjuntos,
  aceptación de la política de cancelación)
- Selector de horario con husos horarios (datos simulados; Google Calendar llega en FASE 8)
- Pantalla de pago (maqueta; Square llega en FASE 7)
- Pantalla de "cita confirmada" y pantalla de estado de la cita

**Criterio de entrada:** FASE 3 cerrada (el lead ya trae nombre, correo, teléfono, país y si tiene
entidad en EE. UU. — el intake **no** vuelve a preguntar eso).
**Criterio de salida:** se puede recorrer el flujo completo en el navegador de punta a punta con
datos falsos, y cada pantalla sabe exactamente qué datos va a necesitar del back end.
**Doc esperado:** `features/booking-ui.md`

### FASE 5 — Cierre de front end ⬜
**Entregable:** A11Y (contraste, foco, teclado, lectores de pantalla), responsive verificado,
SEO y metadata, `not-found.tsx` y `error.tsx`, textos legales.
**Criterio de salida:** la clienta aprueba el sitio completo. **A partir de aquí no se toca más
diseño hasta terminar el back end.**
**Bloqueantes conocidos (dependen de la clienta):** métricas de impacto, aviso de privacidad.
**Ya entregado por la clienta:** video y fotos (2026-08-03), respuestas de las 7 FAQ (2026-08-03).

---

## BLOQUE B — BACK END

> Antes de empezar el bloque B hay **tres decisiones con costo** que corresponden al usuario y a la
> clienta: crear el proyecto de Supabase (la cuenta ya tiene 2, el límite del tier gratuito),
> abrir la cuenta de Square con sus credenciales, y crear el service account de Google Workspace.
> Sin esas tres, la FASE 6 no puede arrancar.

### FASE 6 — Supabase + entrega real del lead ⬜
Proyecto de Supabase, migraciones de las 13 tablas, RLS con `get_advisors`, tipos generados,
`POST /api/v1/leads` persistiendo de verdad, correo a Claudia con los datos del posible cliente y
el servicio solicitado.
**Es la primera del bloque porque cierra la deuda de la FASE 3.** Mientras no exista, los leads
del sitio se pierden.
**Doc esperado:** `features/leads-backend.md`

### FASE 7 — Square: checkout + webhook ⬜
Web Payments SDK, `POST /checkout`, webhook con firma HMAC e idempotencia, `orders` y `payments`.
Conecta la rama `checkout` del diagnóstico. **Doc:** `features/payments.md`

### FASE 8 — Google Calendar + Meet ⬜
`freeBusy`, `slot_holds`, creación del evento con `conferenceData`, compensación ante fallo.
**Doc:** `features/scheduling.md`

### FASE 9 — Gmail: confirmaciones y recordatorios ⬜
Confirmación al cliente, copia a Claudia, recordatorios 24 h / 1 h por cron, `notification_log`.
**Doc:** `features/notifications.md`

### FASE 10 — Agente IA en el intake ⬜
Preguntas adaptativas y validación semántica, con **fallback estático obligatorio** (ADR-005).
**Doc:** `features/ai-intake.md`

### FASE 11 — CRM + panel admin ⬜
Supabase Auth, `proxy.ts`, listado de citas y leads, estados `pendiente_atencion` → `atendido`,
métricas. **Doc:** `features/dashboard.md`

### FASE 12 — Referidos ⬜
Cupón de 30 minutos gratis y enlace de calendario compartible por abogados de inmigración.
**Doc:** `features/referrals.md`

### FASE 13 — Post-cita ⬜
Resumen de la sesión generado por IA y envío automatizado de propuestas.
**Doc:** `features/post-meeting.md`

### FASE 14 — Hardening + deploy ⬜
`security-review`, `npm audit`, tests de los flujos críticos, cron en Vercel o n8n, checklist de
[`04-deployment.md`](./04-deployment.md), deploy a producción.

---

## Mapeo con el roadmap anterior (10 fases)

El roadmap original mezclaba front end y back end en la misma fase (por ejemplo "FASE 4: Agente IA
+ intake form" incluía la pantalla *y* la integración). Se separó. Esta tabla evita confusiones al
leer documentos o commits antiguos:

| Roadmap viejo | Se convirtió en |
|---------------|-----------------|
| FASE 1 — Setup | FASE 1 (igual) |
| FASE 2 — Sitio público | FASE 2 (igual) |
| FASE 3 — Checkout Square + webhook | **FASE 7** |
| FASE 4 — Agente IA + intake form | UI del intake → **FASE 4** · IA → **FASE 10** |
| FASE 5 — Google Calendar | UI del calendario → **FASE 4** · integración → **FASE 8** |
| FASE 6 — Correos | **FASE 9** (+ el correo del lead se adelanta a la **FASE 6**) |
| FASE 7 — CRM + panel admin | **FASE 11** |
| FASE 8 — Referidos | **FASE 12** |
| FASE 9 — Post-cita | **FASE 13** |
| FASE 10 — Polish + deploy | Pulido de front → **FASE 5** · deploy y hardening → **FASE 14** |
| *(no existía)* | **FASE 3** — Diagnóstico y captación de leads |

---

## Lo que NO cambia con la reorganización

El cambio de flujo (formulario antes del pago) **no toca** ninguna regla de negocio:

- La cita se sigue confirmando **solo** después del pago o del cupón de referido.
- El webhook de Square sigue siendo la única fuente de verdad del pago (ADR-002).
- Google Calendar sigue siendo la única fuente de verdad de la disponibilidad (ADR-003).
- La aceptación de la política de cancelación se sigue registrando en el **intake de la cita**, con
  `accepted_at` e IP — no en el diagnóstico.

Lo único que cambió es **cuándo se pide el dato de contacto**: antes del pago, no después.

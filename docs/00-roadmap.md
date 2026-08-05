# Roadmap por Fases — Leos Firm LLC

> **Última actualización:** 2026-08-04
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
| 5 | **Agendamiento: calendario propio** | B · Back | `/agendar`, disponibilidad real, reserva tentativa | ⬜ **Siguiente** |
| 6 | Square: checkout + webhook | B · Back | Cobro real, confirmación de la cita, CRM `pagado` | ⬜ Pendiente |
| 7 | Correos por n8n | B · Back | Confirmación, recordatorios 24 h / 1 h | ⬜ Pendiente |
| 8 | Cierre de front end | A · Front | A11Y, SEO, 404/500, contenido pendiente | ⬜ Pendiente |
| 9 | Gestión de la cita | B · Back | Ver, reprogramar y cancelar con token (política §8) | ⬜ Pendiente |
| 10 | Referidos (30 min gratis) | B · Back | Cupón + enlace de calendario compartible | ⬜ Pendiente |
| 11 | Post-cita: resumen IA + propuestas | B · Back | Resumen automático, cotizaciones | ⬜ Pendiente |
| 12 | Hardening + deploy | B · Back | Security review, tests, Vercel | ⬜ Pendiente |

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
> abrir la cuenta de Square con sus credenciales (FASE 6) y conectar en n8n la credencial de Google
> de Claudia con acceso a su calendario (FASE 5). Supabase y el service account de Google Workspace
> **ya no hacen falta** (ADR-010).

### FASE 4 — Cobro universal + CRM en Google Sheets ✅
**Entregable:** los ocho servicios con precio ($150, $250 y seis a $50 de consulta inicial abonable),
eliminación de la rama del correo, `leadId` que atraviesa el embudo, `POST /api/v1/leads` escribiendo
en la hoja de Claudia a través de n8n, workflow `Leos Firm - CRM de leads`.
**Docs:** [`features/crm-sheets.md`](./features/crm-sheets.md) ·
[`features/lead-diagnostic.md`](./features/lead-diagnostic.md)
**Decisiones asociadas:** ADR-009 (todos los servicios se cobran) · ADR-010 (n8n como capa de
integración; Supabase congelado)

### FASE 5 — Agendamiento: calendario propio ⬜ SIGUIENTE
**Entregable:**
- `/agendar` — resumen de lo que se contrata, leído del catálogo
- Calendario propio dentro del sitio: días con cupo y horas libres, en el huso del visitante
- `GET /api/v1/availability` — ocupados reales de Google Calendar ∩ `BUSINESS_HOURS`
- `POST /api/v1/appointments` — reserva **tentativa** del slot (ADR-011) + CRM `stage='agenda'`
- Workflows de n8n: disponibilidad, reservar slot y limpiar reservas vencidas
- Aceptación de la política de cancelación con `accepted_at` e IP

**Criterio de entrada:** credencial de Google Calendar de Claudia conectada en n8n y
`GOOGLE_CALENDAR_ID` identificado.
**Criterio de salida:** un visitante puede elegir día y hora reales, el slot queda bloqueado en el
calendario de Claudia y la fila del CRM avanza a `agenda`.
**Doc:** [`features/scheduling.md`](./features/scheduling.md) — **ya escrito**

### FASE 6 — Square: checkout + webhook ⬜
Web Payments SDK, `POST /checkout`, webhook con firma HMAC e idempotencia. Al confirmarse el pago:
el evento tentativo pasa a confirmado con enlace de Meet y el CRM avanza a `pagado`.
**Doc esperado:** `features/payments.md`

### FASE 7 — Correos por n8n ⬜
Confirmación al cliente, copia a Claudia, recordatorios 24 h y 1 h antes. El scheduler es n8n, no
Vercel Cron. **Doc esperado:** `features/notifications.md`

### FASE 8 — Cierre de front end ⬜
A11Y (contraste, foco, teclado, lectores de pantalla), responsive verificado, SEO y metadata,
`not-found.tsx` y `error.tsx`, textos legales.
**Criterio de salida:** la clienta aprueba el sitio completo.
**Bloqueantes conocidos (dependen de la clienta):** métricas de impacto, aviso de privacidad.
**Ya entregado por la clienta:** video y fotos (2026-08-03), respuestas de las 7 FAQ (2026-08-03).
**Por qué después del back end y no antes:** el flujo de agenda y pago mete pantallas nuevas. Pulir
antes de que existan sería pulir dos veces.

### FASE 9 — Gestión de la cita ⬜
Ver, reprogramar y cancelar la propia cita con `access_token` (ADR-001), aplicando la política §8.
**Doc esperado:** `features/appointment-management.md`

### FASE 10 — Referidos ⬜
Cupón de 30 minutos gratis y enlace de calendario compartible por abogados de inmigración.
**Doc esperado:** `features/referrals.md`

### FASE 11 — Post-cita ⬜
Resumen de la sesión generado por IA y envío automatizado de propuestas.
**Doc esperado:** `features/post-meeting.md`

### FASE 12 — Hardening + deploy ⬜
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

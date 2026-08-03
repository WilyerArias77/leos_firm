# Leos Firm LLC — Plataforma Web de Captación y Agendamiento

> **Última actualización:** 2026-08-03
> **Versión:** 0.3.0
> **Método:** AInnovate v2.1 (Documentation-Driven Development)
> **Orden de trabajo:** [`00-roadmap.md`](./00-roadmap.md) — 14 fases en 2 bloques (front end / back end)

---

## Visión

Plataforma web para **Leos Firm LLC** (San Antonio, TX) que convierte el sitio de la firma en un
ecosistema automatizado de captación, cobro y agendamiento. El visitante recibe un **diagnóstico
gratuito** que identifica qué servicio necesita y deja sus datos ahí mismo; si el servicio tiene
cobro automático paga con Square y el sistema agenda la cita en Google Calendar, crea la sala
virtual, registra al cliente en el CRM y notifica por correo a cliente y administradora — sin
intervención manual. Si el servicio es de precio variable, Claudia recibe un correo con el caso.

Público objetivo: empresarios, inversionistas y familias internacionales (México, España, LatAm,
Miami, California, Texas) que necesitan constituir, regularizar o administrar empresas en EE. UU.

---

## Objetivos

0. **No perder ningún interesado** — el diagnóstico gratuito captura nombre, correo, teléfono y país
   **antes** del pago, para que un visitante que no compra siga siendo un contacto recuperable (ADR-008).
1. **Vender sin fricción** — catálogo de servicios con compra directa vía Square (pago antes de confirmar cita).
2. **Cero doble-agenda** — sincronización real con Google Calendar; cada cita bloquea el slot.
3. **Intake de calidad** — formulario inteligente y condicional que llega completo y validado antes de la consultoría.
4. **Automatizar el post-pago** — cita + sala virtual + CRM + correos en un solo flujo, sin pasos manuales.
5. **Trazabilidad operativa** — cada cita con estado (`pendiente_atencion` → `atendido`) y panel de administración.
6. **Canal para referidos** — enlace de calendario compartible por abogados de inmigración, con los primeros 30 minutos sin costo.

---

## Stack Técnico

| Capa | Tecnología | Versión | Por qué |
|------|-----------|---------|---------|
| Framework | Next.js (App Router) | 16.2.12 | SSR + API Routes en un solo deploy; Server Actions para lógica sensible |
| UI | React | 19.2.4 | — |
| Lenguaje | TypeScript | ^5 | Mandamiento IX (tipado estricto) |
| Estilos | TailwindCSS | v4 (`@theme`) | Design system por tokens, sin CSS-in-JS |
| Base de datos | Supabase (PostgreSQL) | — | Postgres administrado + RLS + Storage para adjuntos del intake |
| Auth | Supabase Auth | — | Solo para el panel admin (el cliente NO necesita cuenta) |
| Pagos | Square (Web Payments SDK + Node SDK) | `square` ^latest | Requisito explícito del flujo operativo |
| Calendario | Google Calendar API | vía `googleapis` | Disponibilidad, creación de citas, sincronización |
| Sala virtual | Google Meet (conferenceData) / Zoom | — | Meet como default; Zoom como proveedor alternativo |
| Correo | Gmail API | vía `googleapis` | Confirmaciones, recordatorios y copia al administrador |
| Agente IA | Claude (Anthropic API) | `@anthropic-ai/sdk` | Formulario inteligente, validación semántica y resumen post-cita |
| Validación | Zod + React Hook Form | — | Validación compartida cliente/servidor |
| Fechas / TZ | date-fns + @date-fns/tz | — | Clientes en 5+ husos horarios; la firma opera en `America/Chicago` |
| Deploy | Vercel | — | Nativo para Next.js; cron jobs para recordatorios |

---

## Alcance del Flujo Operativo

```
Sitio web → Catálogo → Servicio → DIAGNÓSTICO GRATUITO (popup, 3 preguntas)
   └─ datos del cliente capturados  →  tabla leads + correo a Claudia
        │
        ├─ servicio CON cobro automático (precio fijo)
        │     └─ Checkout Square → pago aprobado (webhook)
        │          └─ Intake completo (§7) + Agente IA → Validación
        │               └─ Google Calendar → Cita + Google Meet/Zoom
        │                    └─ CRM → Correo al cliente + copia al admin
        │                         └─ Estado: pendiente_atencion → atendido
        │
        └─ servicio SIN cobro automático (precio variable)
              └─ Correo a Claudia con los datos del posible cliente y el servicio solicitado
                   └─ Seguimiento manual (cotización)
```

**Solo 2 de los 8 servicios tienen cobro automático hoy** — los que tienen precio cerrado:
consultoría fiscal ($150) y elecciones fiscales ($250). Los otros 6 se cobran con una
infraestructura distinta y con precios variables, así que caen en la rama del correo. La
bifurcación se decide leyendo `services.price_cents`, no una lista fija (ADR-008).

### Servicios del catálogo (fuente: `context.md`)

| Servicio | Precio | Modalidad |
|----------|--------|-----------|
| Consultoría fiscal para empresarios extranjeros | $150.00 USD | Cita 1:1 |
| Elecciones fiscales (trámite puntual) | $250.00 USD | Trámite |
| Apertura y estructuración de LLC / Corporation (Soft Landing) | Cotización | Requiere consultoría previa |
| Bookkeeping + reportes financieros | Suscripción + set-up | Recurrente |
| Payroll (nómina) | Cotización | Recurrente |
| Sales Tax y cumplimiento estatal | Cotización | Recurrente |
| Regularización de empresas existentes | Cotización | Proyecto |
| Expansión de empresas extranjeras a EE. UU. | Cotización | Proyecto |

> Los servicios con precio fijo se compran directo. Los de cotización agendan primero una
> consultoría de evaluación.

---

## Identidad Visual (derivada de `logo.png`)

| Token | Hex | Uso |
|-------|-----|-----|
| `navy-900` (marca) | `#0B1B3A` | Fondo principal, header, footer |
| `navy-700` | `#152C57` | Superficies elevadas sobre navy |
| `platinum` | `#E8ECF3` | Texto sobre navy, bordes sutiles |
| `gold` (acento) | `#C9A227` | CTA secundario, detalles premium |
| `mx-green` | `#0E7A3C` | Acento de bandera MX (decorativo) |
| `us-red` | `#C8102E` | Acento de bandera US (decorativo, **nunca** como estado de error) |
| `accent-blue` | `#2563EB` | CTA primario, enlaces |

Estilo: **serio, profesional y discreto**. Tipografía serif para titulares (institucional) + sans para
cuerpo. Nada de gradientes llamativos ni animaciones excesivas.

---

## Estado del Proyecto

> Detalle completo, criterios de entrada/salida y mapeo con la numeración anterior:
> [`00-roadmap.md`](./00-roadmap.md).

| Fase | Bloque | Descripción | Estado |
|------|--------|-------------|--------|
| 1 | Front | Setup + documentación + design system (Método AInnovate) | [x] **Completo** |
| 2 | Front | Sitio público: home, servicios, sobre Claudia, FAQ, políticas | [x] **Completo** |
| 3 | Front | **Diagnóstico interactivo + captación de leads (popup)** | [x] **Completo** |
| 4 | Front | Front end de agendamiento y pago (`/agendar`, intake §7, calendario, pago — mock) | [ ] Siguiente |
| 5 | Front | Cierre de front end: A11Y, SEO, 404/500, contenido pendiente de Claudia | [ ] Pendiente |
| 6 | Back | Supabase (proyecto, migraciones, RLS, tipos) + entrega real del lead a Claudia | [ ] Pendiente |
| 7 | Back | Checkout Square + webhook de confirmación de pago | [ ] Pendiente |
| 8 | Back | Google Calendar: disponibilidad, cita, Google Meet | [ ] Pendiente |
| 9 | Back | Correos (Gmail API): confirmación, copia admin, recordatorios | [ ] Pendiente |
| 10 | Back | Agente IA en el intake (preguntas adaptativas + validación semántica) | [ ] Pendiente |
| 11 | Back | CRM + panel admin + estados de cita (`pendiente_atencion` → `atendido`) | [ ] Pendiente |
| 12 | Back | Enlace de calendario para referidos (30 min gratis / cupón) | [ ] Pendiente |
| 13 | Back | Post-cita: resumen IA + envío de propuestas | [ ] Pendiente |
| 14 | Back | Hardening, tests de flujos críticos + deploy | [ ] Pendiente |

⚠️ **Bloqueante para publicar:** la FASE 3 ya captura leads, pero la entrega (guardar + avisar a
Claudia) se implementa en la FASE 6. **No publicar el sitio antes de cerrar la FASE 6** o los
contactos capturados se pierden.

---

## Principio Fundamental

> **Ninguna cita existe sin pago confirmado y sin slot bloqueado en Google Calendar.**
> El pago (o el cupón de referido) es la única puerta de entrada al agendamiento, y el calendario
> de Google es la **única fuente de verdad** de disponibilidad. La base de datos refleja el
> calendario, nunca al revés.

---

## Reglas de Negocio No Negociables

Estas reglas provienen de `context.md` §8 y deben respetarse en TODA implementación:

1. La cita se confirma **solo después** del pago (o del cupón de referido).
2. **Reprogramación gratuita** con ≥24 h de anticipación, sujeta a disponibilidad.
3. **Cancelación con ≥24 h**: reembolso menos comisiones, o crédito para futura consultoría.
4. **Cancelación con <24 h**: no reembolsable.
5. **No-show / >15 min de retraso sin aviso**: consultoría se considera realizada, sin reembolso ni reprogramación.
6. **Tolerancia de 15 min**; la sesión termina a la hora originalmente programada.
7. Cancelación por parte de Leos Firm: el cliente elige reprogramar sin costo o reembolso completo.
8. El cliente debe **aceptar explícitamente** la política de cancelación en el intake (checkbox obligatorio, con timestamp registrado).
9. Referidos por abogados de inmigración: **primeros 30 minutos gratis** (vía cupón).

---

## Documentos Relacionados

| Doc | Contenido |
|-----|-----------|
| [`00-roadmap.md`](./00-roadmap.md) | **Orden de trabajo por fases** — fuente de verdad |
| [`02-architecture.md`](./02-architecture.md) | Estructura de carpetas, flujo de datos, ADRs |
| [`03-security.md`](./03-security.md) | Credenciales, RLS, validación, PII |
| [`04-deployment.md`](./04-deployment.md) | Proceso de deploy y checklist |
| [`DB_SCHEMA.md`](./DB_SCHEMA.md) | Esquema completo de base de datos |
| [`API_DOCS.md`](./API_DOCS.md) | Endpoints |
| [`SKILLS.md`](./SKILLS.md) | Skills y MCP servers disponibles |
| [`features/`](./features/) | Un doc por funcionalidad (FASE 2) |
| [`../context.md`](../context.md) | Contexto de negocio original del cliente |

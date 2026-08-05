# Leos Firm LLC — Plataforma Web de Captación y Agendamiento

> **Última actualización:** 2026-08-05
> **Versión:** 0.4.3
> **Método:** AInnovate v2.1 (Documentation-Driven Development)
> **Orden de trabajo:** [`00-roadmap.md`](./00-roadmap.md) — 12 fases

---

## Quién es quién

La documentación menciona nombres constantemente. Esto es a qué se refieren:

| Nombre | Quién es | Qué implica para el proyecto |
|--------|----------|------------------------------|
| **Claudia Leos** | CEO y fundadora de Leos Firm LLC (`context.md` §1–2). Contadora Pública México-Americana | Es **quien opera** el sistema: atiende las consultas, su agenda es la que se bloquea, y el CRM lo abre ella |
| **«la clienta»** | Sinónimo de Claudia en estos documentos | Cuando un doc dice "pedido de la clienta", es un requisito de negocio de ella, no una preferencia técnica |
| **Marco** (`marco@leosfirm.com`) | Cuenta del lado del cliente que administra el Google Console de la firma | Es **el dueño de las cuentas de Google** del proyecto. La credencial de Calendar y el calendario de consultas viven ahí (ADR-012) |
| **El equipo de desarrollo** (`wilyerernestoarias@gmail.com`) | Quien construye el sitio y administra n8n y Vercel | Es **quien construye**, no quien opera. Hoy su cuenta personal es dueña de la hoja del CRM — deuda declarada, no diseño |
| **«el visitante» / «el cliente»** | Quien entra al sitio y contrata | Empresario hispano que necesita operar en EE. UU. |

> **Consecuencia práctica:** cada vez que una integración necesita una cuenta de Google
> (Sheets, Calendar, Gmail), la cuenta correcta es **la de la firma** — hoy, el Google Console de
> `marco@leosfirm.com`. Usar otra funciona para desarrollar, pero deja los datos de sus clientes bajo
> una credencial ajena.

### Dónde vive cada cosa hoy

| Pieza | Cuenta / plataforma | ¿Es el estado final? |
|-------|--------------------|----------------------|
| Hoja del CRM (Google Sheets) | Drive de `wilyerernestoarias@gmail.com` | ⚠️ No — migrar a la firma después de la FASE 5 |
| Calendario de consultas (Google Calendar) | Google Console de `marco@leosfirm.com` | ✅ Sí |
| Workflows y credenciales | Instancia de n8n del equipo de desarrollo | ✅ Sí (ADR-010) |
| Sitio y variables de entorno | Vercel | ✅ Sí |

El porqué de la asimetría —y por qué no se arregla hoy— está en **ADR-012**
([`02-architecture.md`](./02-architecture.md)).

---

## Visión

Plataforma web para **Leos Firm LLC** (San Antonio, TX) que convierte el sitio de la firma en un
ecosistema automatizado de captación, cobro y agendamiento. El visitante recibe un **diagnóstico
gratuito** que identifica qué servicio necesita y deja sus datos ahí mismo; queda registrado en el
CRM, elige día y hora, paga con Square y el sistema agenda la cita en Google Calendar, crea la sala
virtual y notifica por correo — sin intervención manual.

**Los ocho servicios se cobran** (ADR-009): dos con precio cerrado y seis con una consulta inicial
de $50 que se abona al costo total. No hay rama manual ni servicio sin precio.

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

| Fase | Descripción | Estado |
|------|-------------|--------|
| 1 | Setup + documentación + design system (Método AInnovate) | [x] **Completo** |
| 2 | Sitio público: home, servicios, sobre Claudia, FAQ, políticas | [x] **Completo** |
| 3 | Diagnóstico interactivo + captación de leads (popup) | [x] **Completo** |
| 4 | **Cobro universal + CRM en Google Sheets** | [x] **Completo y en producción** |
| 5 | **Agendamiento: calendario propio sobre Google Calendar** | [ ] **Siguiente** |
| 6 | Checkout Square + webhook de confirmación de pago | [ ] Pendiente |
| 7 | Correos por n8n: confirmación, copia admin, recordatorios | [ ] Pendiente |
| 8 | Cierre de front end: A11Y, SEO, 404/500, contenido pendiente | [ ] Pendiente |
| 9 | Gestión de la cita con token (ver / reprogramar / cancelar) | [ ] Pendiente |
| 10 | Enlace de calendario para referidos (30 min gratis / cupón) | [ ] Pendiente |
| 11 | Post-cita: resumen IA + envío de propuestas | [ ] Pendiente |
| 12 | Hardening, tests de flujos críticos + deploy | [ ] Pendiente |

✅ **El bloqueante para publicar está resuelto** (2026-08-05). Los leads del diagnóstico llegan al
CRM de verdad: verificado contra producción con `delivery: "delivered"`. El sitio ya no pierde
contactos.

⚠️ **Lo que todavía NO se puede hacer en el sitio:** agendar y pagar. El resultado del diagnóstico
lo dice con todas sus letras y ofrece el teléfono de la firma. Eso se cierra en las fases 5 y 6.

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

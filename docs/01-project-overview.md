# Leos Firm LLC — Plataforma Web de Captación y Agendamiento

> **Última actualización:** 2026-08-02
> **Versión:** 0.1.0
> **Método:** AInnovate v2.1 (Documentation-Driven Development)

---

## Visión

Plataforma web para **Leos Firm LLC** (San Antonio, TX) que convierte el sitio de la firma en un
ecosistema automatizado de captación, cobro y agendamiento. El cliente elige un servicio, paga con
Square, un agente de IA le genera y valida un formulario de ingreso inteligente, y el sistema agenda
la cita en Google Calendar, crea la sala virtual, registra al cliente en el CRM y notifica por correo
a cliente y administradora — sin intervención manual.

Público objetivo: empresarios, inversionistas y familias internacionales (México, España, LatAm,
Miami, California, Texas) que necesitan constituir, regularizar o administrar empresas en EE. UU.

---

## Objetivos

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
Sitio web → Catálogo → Selección de servicio → Checkout Square
   └─ pago aprobado → Agente IA → Intake inteligente → Validación
        └─ Google Calendar (disponibilidad) → Cita + Google Meet/Zoom
             └─ CRM (Supabase) → Correo al cliente + copia al admin
                  └─ Estado: pendiente_atencion → atendido
```

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

| Fase | Descripción | Estado |
|------|-------------|--------|
| 1 | Setup + documentación + design system (Método AInnovate) | [x] **Completo** |
| 2 | Sitio público: home, servicios, sobre Claudia, FAQ, políticas | [x] **Completo** |
| 3 | Checkout Square + webhook de confirmación de pago | [ ] Pendiente |
| 4 | Agente IA + intake form inteligente + Storage de adjuntos | [ ] Pendiente |
| 5 | Google Calendar: disponibilidad, cita, Google Meet | [ ] Pendiente |
| 6 | Correos (Gmail API): confirmación, copia admin, recordatorios | [ ] Pendiente |
| 7 | CRM + panel admin + estados de cita (`pendiente_atencion` → `atendido`) | [ ] Pendiente |
| 8 | Enlace de calendario para referidos (30 min gratis / cupón) | [ ] Pendiente |
| 9 | Post-cita: resumen IA + envío de propuestas | [ ] Pendiente |
| 10 | Polish, A11Y, tests de flujos críticos + deploy | [ ] Pendiente |

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
| [`02-architecture.md`](./02-architecture.md) | Estructura de carpetas, flujo de datos, ADRs |
| [`03-security.md`](./03-security.md) | Credenciales, RLS, validación, PII |
| [`04-deployment.md`](./04-deployment.md) | Proceso de deploy y checklist |
| [`DB_SCHEMA.md`](./DB_SCHEMA.md) | Esquema completo de base de datos |
| [`API_DOCS.md`](./API_DOCS.md) | Endpoints |
| [`SKILLS.md`](./SKILLS.md) | Skills y MCP servers disponibles |
| [`features/`](./features/) | Un doc por funcionalidad (FASE 2) |
| [`../context.md`](../context.md) | Contexto de negocio original del cliente |

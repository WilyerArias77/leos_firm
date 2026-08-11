# Leos Firm LLC — Plataforma Web de Captación y Agendamiento

> **Última actualización:** 2026-08-10
> **Versión:** 0.11.0
> **Método:** AInnovate v2.1 (Documentation-Driven Development)
> **Orden de trabajo:** [`00-roadmap.md`](./00-roadmap.md) — 10 fases

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
| Calendario de consultas (Google Calendar) | `c_4a1fcc0c…`, Google Console de `marco@leosfirm.com` | ⚠️ El calendario sí; la **credencial** pasa a Claudia (ADR-017) |
| Correo saliente (Gmail) | Credencial de `marco@leosfirm.com` en n8n | ⚠️ No — debe ser `claudia@leosfirm.com` en los 6 nodos (ADR-017) |
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
3. **Intake de calidad** — lo cubre el propio diagnóstico: sus 3 preguntas llegan al CRM antes del pago. El formulario de intake completo se eliminó el 2026-08-04.
4. **Automatizar el post-pago** — cita + sala virtual + CRM + correos en un solo flujo, sin pasos manuales.
5. **Trazabilidad operativa** — cada fila del CRM con su etapa del embudo y su estado de atención (`Pendiente de Atención` → `Atendido` → `Finalizado`). **La hoja es el panel**; no hay panel admin (ADR-010).
6. ~~**Canal para referidos**~~ — 🧊 fuera del alcance desde el 2026-08-06. El diseño sigue en `context.md`.

---

## Stack Técnico

| Capa | Tecnología | Versión | Por qué |
|------|-----------|---------|---------|
| Framework | Next.js (App Router) | 16.2.12 | SSR + API Routes en un solo deploy; Server Actions para lógica sensible |
| UI | React | 19.2.4 | — |
| Lenguaje | TypeScript | ^5 | Mandamiento IX (tipado estricto) |
| Estilos | TailwindCSS | v4 (`@theme`) | Design system por tokens, sin CSS-in-JS |
| **Integraciones** | **n8n** | — | **La capa que tiene las credenciales de Google (ADR-010).** Next.js le habla por webhook; ninguna clave de Google entra a la app |
| CRM | Google Sheets | vía n8n | La hoja **es** el panel de administración de Claudia (ADR-010) |
| ~~Base de datos~~ | ~~Supabase (PostgreSQL)~~ | — | 🧊 **CONGELADO** (ADR-010). Las 13 tablas están diseñadas en `DB_SCHEMA.md` y **no aplicadas**. No hay proyecto de Supabase |
| ~~Auth~~ | ~~Supabase Auth~~ | — | 🧊 Congelado con lo anterior. No hay panel admin: la hoja lo sustituye |
| Pagos | Square (Web Payments SDK + Node SDK) | `square` ^latest | Requisito explícito del flujo operativo. **Integrado directo**, no por n8n |
| Calendario | Google Calendar API | vía **n8n** | Disponibilidad, reserva tentativa, confirmación y limpieza |
| Sala virtual | Google Meet (`conferenceData`) | — | **Solo Meet** desde el 2026-08-07 (ADR-004). Zoom retirado del alcance |
| Correo | Gmail | vía **n8n** | Confirmación, copia interna y recordatorios de 24 h y 1 h |
| Agente IA | Claude | dentro de **n8n** | Asistente virtual: **conversa, no decide** (ADR-018). Diseñado, sin implementar |
| Validación | Zod + React Hook Form | — | Validación compartida cliente/servidor |
| Fechas / TZ | date-fns + @date-fns/tz | — | Clientes en 5+ husos horarios; la firma opera en `America/Chicago` |
| Deploy | Vercel | — | Nativo para Next.js; cron jobs para recordatorios |

---

## Alcance del Flujo Operativo

```
Sitio web → Catálogo → Servicio → DIAGNÓSTICO GRATUITO (popup, 3 preguntas)
   └─ datos del cliente capturados  →  CRM en Sheets (stage=formulario)   ← ADR-008
        │
        └─ UN SOLO CAMINO PARA LOS OCHO SERVICIOS                          ← ADR-009
              └─ /agendar → calendario propio → reserva TENTATIVA          ← ADR-011
                   │            (slot bloqueado en Calendar, stage=agenda)
                   └─ Checkout Square → pago aprobado (webhook)
                        └─ el evento pasa a confirmado + Google Meet       ← ADR-002
                             └─ CRM stage=pagado + correo al cliente y copia interna
                                  └─ recordatorios 24 h y 1 h (n8n)
                                       └─ Estado de atención: Pendiente → Atendido → Finalizado
```

**Los ocho servicios se cobran** (ADR-009). Dos tienen precio cerrado —consultoría fiscal ($150) y
elecciones fiscales ($250)— y los otros seis cobran **$50 para apartar la cita**, que se descuenta
completo del costo real del servicio. **No es una «consulta inicial»**: es dinero a cuenta, y Claudia
da el costo real durante la llamada porque cotiza por caso.

> ⚠️ **La «rama del correo a Claudia» ya no existe.** Desapareció con ADR-009 el 2026-08-04. Si
> aparece en algún documento o comentario, ese documento está desactualizado.

### Servicios del catálogo (fuente: `context.md`)

| Servicio | Se cobra | Modalidad |
|----------|----------|-----------|
| Consultoría fiscal para empresarios extranjeros | **$150.00 USD** (precio cerrado) | Cita 1:1 |
| Elecciones fiscales (trámite puntual) | **$250.00 USD** (precio cerrado) | Trámite |
| Apertura y estructuración de LLC / Corporation (Soft Landing) | $50 para apartar la cita | Requiere consultoría previa |
| Bookkeeping + reportes financieros | $50 para apartar la cita | Recurrente |
| Payroll (nómina) | $50 para apartar la cita | Recurrente |
| Sales Tax y cumplimiento estatal | $50 para apartar la cita | Recurrente |
| Regularización de empresas existentes | $50 para apartar la cita | Proyecto |
| Expansión de empresas extranjeras a EE. UU. | $50 para apartar la cita | Proyecto |

> **Ninguno es «gratis» y ninguno se queda sin precio.** Los seis de `pricingModel: "deposit"` cobran
> $50 **para apartar la cita**, y ese monto se descuenta completo del costo real. El identificador se
> llamaba `"initial-consultation"` y ese nombre era justamente el error — corregido el 2026-08-06 a
> instancias de la clienta. Los precios se leen **en el servidor, desde el catálogo, en centavos**
> (ADR-006). La sesión dura **30 minutos** desde el 2026-08-07.

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
| 5 | **Agendamiento: calendario propio sobre Google Calendar** | [x] **Completo** (2026-08-06) |
| 6 | Checkout Square + webhook de confirmación de pago | [x] **Completo — primer pago real** (2026-08-06) |
| 7 | Correos por n8n: confirmación, copia admin, recordatorios | [~] Los 3 workflows activos; **ningún recordatorio ha corrido sobre una cita real** |
| 8 | Cierre de front end: A11Y, SEO, 404/500, contenido pendiente | [~] Código entregado; lo abierto depende de la clienta |
| 9 | Gestión de la cita con token (ver / reprogramar / cancelar) | [~] Next.js listo; **3 workflows sin publicar** |
| — | Flujo v2: asistente virtual, estados de entrega, liberar hueco | [~] En curso desde el 2026-08-07 |
| 10 | Hardening, tests de flujos críticos + deploy | [ ] Pendiente |
| 🧊 | ~~Referidos~~ · ~~Post-cita~~ | Fuera del alcance (2026-08-06) |

✅ **El sitio cobra de verdad.** El 2026-08-06 a las 14:48 UTC entró el primer pago real: la cadena
checkout → Square → webhook → n8n → Calendar → Meet → correo → CRM funcionó de punta a punta. Agendar
y pagar **ya se puede hacer**.

🔴 **Lo que hay que mirar antes que nada:** tres decisiones ya commiteadas **no están aplicadas en
n8n ni desplegadas**. Está auditado y con checklist en
[`00-roadmap.md`](./00-roadmap.md) § *Deriva entre el repo y producción*.

---

## Principio Fundamental

> **Ninguna cita existe sin pago confirmado y sin slot bloqueado en Google Calendar.**
> El pago es la única puerta de entrada al agendamiento, y el calendario de Google es la **única
> fuente de verdad** de disponibilidad. El CRM refleja el calendario, nunca al revés — y sin base de
> datos, **el evento de Calendar es el único registro de la cita** (por eso el token de ADR-016 se
> firma en vez de guardarse).

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
| [`DB_SCHEMA.md`](./DB_SCHEMA.md) | 🧊 **Congelado** (ADR-010) — diseño de referencia, no implementado |
| [`API_DOCS.md`](./API_DOCS.md) | Endpoints |
| [`SKILLS.md`](./SKILLS.md) | Skills y MCP servers disponibles — el MCP de **n8n** es el central |
| [`features/`](./features/) | Un doc por funcionalidad (9 documentos) |
| [`../context.md`](../context.md) | Contexto de negocio original del cliente |

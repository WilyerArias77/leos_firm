# Leos Firm LLC — Reglas para IA (Método AInnovate v2.1)

> **ATENCIÓN IA:** Este proyecto usa **Documentation-Driven Development**.
> **ANTES** de escribir CUALQUIER línea de código, DEBES leer los docs relevantes.
> Método completo: `METODO_AINNOVATE.md` · Contexto de negocio: `context.md`

---

## Qué es este proyecto

Sitio web de **Leos Firm LLC** (San Antonio, TX) — consultoría fiscal y apertura de empresas en
EE. UU. para empresarios hispanos. No es un sitio informativo: es un **ecosistema automatizado**.

```
Servicio → DIAGNÓSTICO GRATUITO (popup, captura el lead ANTES del pago)
   ├─ servicio con precio  → Pago Square → Intake + Agente IA → Google Calendar
   │                          → Google Meet → CRM → Correos → Estado de la cita
   └─ servicio sin precio  → Correo a Claudia con los datos y el servicio solicitado
```

Solo **2 de los 8 servicios** tienen cobro automático (los que tienen precio cerrado). El resto se
cobra con otra infraestructura y con precios variables → caen en la rama del correo. La rama se
decide leyendo `priceCents` del catálogo, nunca una lista de slugs (ADR-008).

**Stack:** Next.js 16 (App Router) · TypeScript · TailwindCSS v4 · Supabase
**Integraciones:** Square · Google Calendar · Google Meet/Zoom · Gmail · Anthropic

### Principio fundamental

> El **dato del cliente se captura antes del pago** (ADR-008): quien abandona el checkout debe
> seguir siendo un contacto recuperable.
> Ninguna cita existe sin **pago confirmado** y sin **slot bloqueado en Google Calendar**.
> El **webhook de Square** es la única fuente de verdad del pago.
> **Google Calendar** es la única fuente de verdad de la disponibilidad.

---

## Protocolo Obligatorio (antes de cada cambio)

1. LEER `docs/00-roadmap.md` — en qué fase estamos y qué corresponde hacer
2. LEER `docs/01-project-overview.md`
3. LEER `docs/02-architecture.md`
3. LEER `docs/SKILLS.md` — hay MCP servers para Supabase, Google Calendar y Gmail; úsalos
4. IDENTIFICAR qué feature se modifica
5. LEER `docs/features/[feature].md` — si NO existe → **CREARLO antes de codear**
6. Si se toca DB → LEER `docs/DB_SCHEMA.md`
7. Si se toca API → LEER `docs/API_DOCS.md`
8. Si se toca auth, pagos, credenciales, RLS o PII → LEER `docs/03-security.md`
9. Si se toca deploy o cron → LEER `docs/04-deployment.md`

---

## ⚠️ Next.js 16 — APIs que cambiaron

Este proyecto usa **Next.js 16**. Los patrones de Next 13/14/15 **no compilan**.
Documentación local y confiable: `node_modules/next/dist/docs/`
(guía de migración: `01-app/02-guides/upgrading/version-16.md`).

| ❌ Patrón viejo | ✅ Patrón correcto |
|----------------|-------------------|
| `middleware.ts` + `export function middleware()` | `src/proxy.ts` + `export function proxy()` (runtime nodejs, sin edge) |
| `const c = cookies()` | `const c = await cookies()` — el acceso síncrono fue **eliminado** |
| `headers()`, `draftMode()` síncronos | `await headers()`, `await draftMode()` |
| `{ params }: { params: { slug: string } }` | `async function Page(props: PageProps<'/servicios/[slug]'>)` + `await props.params` |
| `next lint` | Eliminado — se usa la CLI de ESLint |
| `images.domains` | `images.remotePatterns` |
| `next dev --turbopack` | Turbopack es el **default**; una config de `webpack` **rompe** el build |

> **Trampa conocida:** la documentación oficial de `@supabase/ssr` todavía usa `middleware.ts` y
> `cookies()` síncrono. Hay que **adaptarla**, no copiarla tal cual.

---

## Los 12 Mandamientos del Vibe Coding (INVIOLABLES)

| # | Mandamiento | Regla aplicada a este proyecto |
|---|-------------|-------------------------------|
| I | NO ALUCINARÁS | Solo implementar lo pedido. Ante duda → PREGUNTAR. Ninguna dependencia nueva sin autorización |
| II | SEPARARÁS LÓGICA DE ESTILOS | Clases Tailwind en el JSX, pero la lógica de negocio va en `src/services/`. **Nunca** llamar a Supabase/Square/Google desde un componente |
| III | DOCUMENTARÁS CADA CAMBIO | Ningún cambio sin su doc de feature |
| IV | ACTUALIZARÁS EL CHANGELOG | Cada request → nueva entrada en `CHANGELOG.md` |
| V | DOCUMENTARÁS LA DB | Cada migración → `DB_SCHEMA.md` + regenerar `src/types/database.types.ts` |
| VI | SEGUIRÁS LA ESTRUCTURA | La de `docs/02-architecture.md`. No crear archivos fuera de ella |
| VII | USARÁS EL SISTEMA DE ESTILOS | Tokens en `src/app/globals.css` (`@theme`). **Prohibido** `bg-[#123456]` |
| VIII | PROTEGERÁS CREDENCIALES | Nada hardcodeado. Las claves de servidor **jamás** con prefijo `NEXT_PUBLIC_`. Nunca guardar datos de tarjeta |
| IX | TIPARÁS TODO | TypeScript estricto, cero `any` |
| X | VALIDARÁS ANTES DE ENTREGAR | `npm run build` debe compilar. Checklist completo |
| XI | MANTENDRÁS CONSISTENCIA | UI en español, código en inglés. Rutas kebab-case en español; DB en snake_case |
| XII | COMUNICARÁS CON CLARIDAD | Resumen de archivos, DB y docs al terminar |

---

## 4 Leyes de Operación

1. **LEER ANTES DE ACTUAR** — consultar los docs antes de cualquier cambio.
2. **NO ROMPER LO QUE FUNCIONA** — si el cambio conflicta con la arquitectura: detenerse, advertir,
   explicar el impacto y pedir autorización.
3. **DOCUMENTACIÓN CONTINUA** — actualizar docs + CHANGELOG después de cada cambio.
4. **SEGURIDAD** — nunca deploy, `git push` ni cambios destructivos sin confirmación explícita.
   Nunca usar el MCP de Supabase (`execute_sql`, `apply_migration`) contra producción sin permiso:
   escribe **directo** en el proyecto real.

---

## Reglas de Negocio No Negociables (`context.md` §8)

- La cita se confirma **solo** después del pago (o del cupón de referido).
- Reprogramación gratuita con **≥24 h** de anticipación.
- Cancelación **≥24 h**: reembolso menos comisiones, o crédito. **<24 h**: no reembolsable.
- **No-show** o más de 15 min de retraso: se considera realizada, sin reembolso ni reprogramación.
- Tolerancia de 15 min; la sesión termina a la hora originalmente programada.
- El cliente **debe** aceptar la política de cancelación en el intake → se registra `accepted_at` + IP.
- Referidos de abogados de inmigración: **primeros 30 minutos gratis** (vía cupón).
- Precios **siempre en centavos** y leídos en el servidor desde `services`, nunca del cliente.
- Fechas **siempre en UTC** en la base de datos; la firma opera en `America/Chicago`.

---

## Design System

Tokens en `src/app/globals.css` (bloque `@theme` de Tailwind v4). Derivados del logo:

| Token | Hex | Uso |
|-------|-----|-----|
| `navy-950` … `navy-50` | base `#0B1B3A` | Superficies institucionales |
| `platinum` | `#E8ECF3` | Texto sobre navy |
| `gold` | `#C9A227` | Acento premium |
| `accent` | `#2563EB` | CTA primario, enlaces |
| `mx-green` / `us-red` | `#0E7A3C` / `#C8102E` | Acentos de bandera — **decorativos**, nunca estados |
| `success` / `warning` / `danger` | semánticos | Estados de UI |

Estilo: serio, profesional y discreto. Serif para titulares, sans para cuerpo.

---

## Documentación del Proyecto

| Doc | Cuándo leerlo |
|-----|--------------|
| `docs/00-roadmap.md` | SIEMPRE (14 fases, front end → back end). **Fuente de verdad del orden** |
| `docs/01-project-overview.md` | SIEMPRE (visión, stack, estado) |
| `docs/02-architecture.md` | SIEMPRE (estructura, convenciones, ADRs, Next 16) |
| `docs/03-security.md` | Auth, credenciales, RLS, pagos, PII |
| `docs/04-deployment.md` | Deploy, CI/CD, cron |
| `docs/DB_SCHEMA.md` | Base de datos |
| `docs/API_DOCS.md` | Endpoints |
| `docs/SKILLS.md` | ANTES de implementar cualquier feature |
| `docs/features/*.md` | La feature que se modifica |
| `context.md` | Contexto de negocio original de la clienta |

---

## Tabla de Lookup

| Archivo que se modifica | Doc que se debe leer primero |
|------------------------|------------------------------|
| `src/app/(public)/**` | `docs/features/public-site.md` |
| `src/components/ui/**` · `src/components/layout/**` | `docs/features/public-site.md` + `02-architecture.md` (design system) |
| `src/components/features/services/**` | `docs/features/public-site.md` |
| `src/components/features/diagnostic/**` · `src/hooks/useDiagnosticPrompt.ts` | `docs/features/lead-diagnostic.md` |
| `src/constants/content/diagnostic.ts` | `docs/features/lead-diagnostic.md` (**árbol de preguntas**: contenido, no lógica) |
| `src/services/diagnostic.service.ts` · `src/services/lead.service.ts` | `docs/features/lead-diagnostic.md` |
| `src/app/api/v1/leads/**` | `docs/API_DOCS.md` + `features/lead-diagnostic.md` + `03-security.md` (PII) |
| `src/lib/validation/**` | `docs/03-security.md` (el mismo esquema corre en cliente y servidor) |
| `src/constants/content/**` | `docs/features/public-site.md` + `context.md` (**fuente única del contenido**) |
| `src/services/service.service.ts` | `docs/features/public-site.md` (migra a Supabase en FASE 6) |
| `src/types/content.types.ts` | `docs/DB_SCHEMA.md` (debe reflejar la tabla `services`) |
| `src/app/(admin)/**` | `docs/03-security.md` + `features/dashboard.md` |
| `src/app/api/v1/**` | `docs/API_DOCS.md` + `features/[feature].md` |
| `src/app/api/v1/webhooks/square/**` | `docs/03-security.md` + `API_DOCS.md` |
| `src/app/api/v1/cron/**` | `docs/04-deployment.md` + `API_DOCS.md` |
| `src/app/globals.css` | `docs/02-architecture.md` (design system) |
| `src/lib/supabase/**` | `docs/03-security.md` + `DB_SCHEMA.md` |
| `src/lib/square/**` | `docs/03-security.md` (PCI, firma HMAC) |
| `src/lib/google/**` | `docs/03-security.md` (scopes mínimos) |
| `src/lib/ai/**` | `docs/03-security.md` (prompt injection) + skill `claude-api` |
| `src/lib/env.ts` | `docs/02-architecture.md` (tabla de variables) |
| `src/services/*.service.ts` | `docs/features/[feature].md` |
| `src/types/database.types.ts` | **GENERADO** — no editar a mano |
| `src/proxy.ts` | `docs/03-security.md` |
| `supabase/migrations/*.sql` | `docs/DB_SCHEMA.md` |
| `package.json` | `docs/02-architecture.md` (justificar toda dep nueva) |

---

## Comandos

```bash
npm run dev      # Desarrollo → http://localhost:3000
npm run build    # Validación obligatoria antes de entregar
npm run lint     # ESLint
```

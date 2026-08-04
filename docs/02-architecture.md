# Arquitectura — Leos Firm LLC

> **Última actualización:** 2026-08-03
> **Lectura obligatoria** antes de crear cualquier archivo (Mandamiento VI).
> Orden de trabajo y numeración de fases: [`00-roadmap.md`](./00-roadmap.md).

---

## Stack Completo

### Dependencias de producción

| Paquete | Para qué (requisito que lo justifica) |
|---------|--------------------------------------|
| `next` 16.2.12 | Framework. App Router + Route Handlers + Server Actions |
| `react` / `react-dom` 19.2.4 | UI |
| `@supabase/supabase-js` | Cliente de base de datos y Storage |
| `@supabase/ssr` | Sesión de Supabase en Server Components / Route Handlers (panel admin) |
| `zod` | Validación de inputs y de variables de entorno. Esquema compartido cliente ↔ servidor |
| `react-hook-form` + `@hookform/resolvers` | Intake form condicional (§7 de `context.md`) |
| `square` | Checkout, cobro y verificación de webhooks de Square |
| `googleapis` | Google Calendar (disponibilidad + citas + Meet) y Gmail (correos) |
| `@anthropic-ai/sdk` | Agente IA: formulario inteligente, validación semántica, resumen post-cita |
| `date-fns` + `@date-fns/tz` | Conversión de husos horarios cliente ↔ `America/Chicago` |
| `lucide-react` | Iconografía (SVG, sin dependencias de runtime) |
| `sonner` | Toasts para estados de éxito/error (FASE 4.8 del método) |
| `server-only` | Convierte en **error de build** cualquier import accidental de código de servidor desde el cliente. Es la red de seguridad de `src/lib/supabase/admin.ts` |

### Dependencias de desarrollo

`typescript`, `@types/*`, `tailwindcss` v4, `@tailwindcss/postcss`, `eslint`, `eslint-config-next`.

> **Regla:** agregar una dependencia nueva requiere autorización explícita del usuario y una fila en
> esta tabla justificándola (Mandamiento I).

---

## Estructura de Carpetas

```
leos_firm/
├── docs/                              # Documentación (Método AInnovate) — SAGRADA
│   ├── 01-project-overview.md
│   ├── 02-architecture.md             # ← este archivo
│   ├── 03-security.md
│   ├── 04-deployment.md
│   ├── DB_SCHEMA.md
│   ├── API_DOCS.md
│   ├── SKILLS.md
│   └── features/                      # Un .md por funcionalidad (FASE 2)
│
├── src/
│   ├── app/
│   │   ├── (public)/                  # Sitio público — sin autenticación
│   │   │   ├── page.tsx               # Home
│   │   │   ├── servicios/             # Catálogo + detalle de servicio
│   │   │   ├── agendar/               # Checkout → intake → calendario
│   │   │   ├── sobre-claudia/         # Storytelling de la fundadora
│   │   │   ├── faq/
│   │   │   └── politicas/             # Política de cancelación
│   │   ├── (admin)/                   # Panel administrativo — requiere Supabase Auth
│   │   │   └── dashboard/             # CRM, citas, estados
│   │   ├── api/v1/                    # Route Handlers (ver API_DOCS.md)
│   │   │   ├── health/
│   │   │   ├── services/
│   │   │   ├── checkout/              # Crear pago Square
│   │   │   ├── webhooks/square/       # Confirmación de pago (fuente de verdad)
│   │   │   ├── intake/                # Guardar formulario + adjuntos
│   │   │   ├── availability/          # Slots libres desde Google Calendar
│   │   │   ├── appointments/          # Crear / reprogramar / cancelar
│   │   │   ├── agent/                 # Endpoints del agente IA
│   │   │   └── cron/                  # Recordatorios y cierre de citas
│   │   ├── layout.tsx
│   │   ├── globals.css                # Design tokens Tailwind v4 (@theme)
│   │   └── not-found.tsx
│   │
│   ├── components/
│   │   ├── ui/                        # Base: Button, Input, Card, Badge, Modal, Skeleton…
│   │   ├── layout/                    # Header, Footer, Container, Section
│   │   └── features/                  # Componentes por feature
│   │       ├── diagnostic/            # Popup de diagnóstico y captación de leads
│   │       ├── services/
│   │       ├── checkout/
│   │       ├── intake/
│   │       ├── scheduling/
│   │       └── dashboard/
│   │
│   ├── lib/
│   │   ├── env.ts                     # Validación Zod de variables de entorno
│   │   ├── validation/                # Esquemas Zod compartidos cliente ↔ servidor
│   │   ├── supabase/                  # client.ts (browser) · server.ts (RSC) · admin.ts (service role)
│   │   ├── square/                    # SDK + verificación de firma de webhook
│   │   ├── google/                    # auth.ts · calendar.ts · gmail.ts
│   │   ├── ai/                        # Cliente Anthropic + prompts del agente
│   │   └── utils/                     # formatCurrency, rateLimit, timezone, cn()
│   │
│   ├── services/                      # Lógica de negocio (NO tocan React)
│   │   ├── diagnostic.service.ts
│   │   ├── lead.service.ts
│   │   ├── service.service.ts
│   │   ├── appointment.service.ts
│   │   ├── payment.service.ts
│   │   ├── intake.service.ts
│   │   ├── crm.service.ts
│   │   └── notification.service.ts
│   │
│   ├── hooks/                         # Custom hooks de React
│   ├── types/                         # Tipos globales + database.types.ts (generado)
│   ├── constants/
│   │   ├── business.ts                # COMPANY, BUSINESS_HOURS, CANCELLATION_POLICY
│   │   ├── routes.ts                  # ROUTES, API_ROUTES
│   │   └── content/                   # Contenido literal de context.md
│   │       ├── services.ts            # Catálogo (temporal, migra a Supabase en FASE 3)
│   │       ├── company.ts             # Misión, visión, valores, fundadora
│   │       ├── faq.ts
│   │       └── policies.ts
│   └── proxy.ts                       # Refresco de sesión admin (Next 16: NO se llama middleware.ts)
│
├── public/                            # Assets estáticos (logo, imágenes)
├── supabase/
│   ├── migrations/                    # SQL versionado
│   └── config.toml
│
├── .windsurfrules · CLAUDE.md · .cursorrules · .clinerules · .aider.conf.yml
├── .github/copilot-instructions.md
├── CHANGELOG.md · METODO_AINNOVATE.md · context.md
├── .env.example · .env.local (NO COMMIT)
└── package.json · next.config.ts · tsconfig.json · eslint.config.mjs
```

### Reglas de ubicación

| Si vas a crear… | Va en… |
|-----------------|--------|
| Una página pública | `src/app/(public)/[ruta]/page.tsx` |
| Una pantalla del admin | `src/app/(admin)/dashboard/[ruta]/page.tsx` |
| Un endpoint | `src/app/api/v1/[recurso]/route.ts` |
| Un componente reutilizable sin lógica de negocio | `src/components/ui/` |
| Un componente atado a una feature | `src/components/features/[feature]/` |
| Lógica de negocio pura (sin React) | `src/services/*.service.ts` |
| Un cliente de terceros (SDK, config) | `src/lib/[proveedor]/` |
| Un esquema Zod de un endpoint | `src/lib/validation/[recurso].schema.ts` |
| Una constante compartida | `src/constants/` |

**Nunca** poner llamadas a Supabase/Square/Google directamente dentro de un componente: pasan por
`src/services/`.

---

## Next.js 16 — Diferencias que Rompen Código

> ⚠️ **Leer antes de escribir cualquier archivo de `src/app/`.** Next.js 16 cambió APIs que
> aparecen en casi todos los tutoriales y en la documentación oficial de `@supabase/ssr`. Aplicar
> patrones de Next 13/14/15 aquí **no compila**.
> Documentación local y actualizada: `node_modules/next/dist/docs/` (guía completa en
> `01-app/02-guides/upgrading/version-16.md`).

| Cambio | ❌ Patrón viejo | ✅ Patrón correcto en este proyecto |
|--------|----------------|-----------------------------------|
| **`middleware` → `proxy`** | `middleware.ts` con `export function middleware()` | `proxy.ts` en la raíz con `export function proxy()`. Runtime **nodejs**, no configurable (no hay edge) |
| **Request APIs asíncronas** | `const c = cookies()` | `const c = await cookies()`. Igual para `headers()` y `draftMode()`. El acceso síncrono fue **eliminado**, no deprecado |
| **`params` / `searchParams`** | `{ params }: { params: { slug: string } }` | `async function Page(props: PageProps<'/servicios/[slug]'>)` + `const { slug } = await props.params` |
| **Tipos de rutas** | Escribir los tipos a mano | `npx next typegen` genera `PageProps`, `LayoutProps`, `RouteContext` globales y tipados por ruta |
| **Bundler** | `next dev --turbopack` | Turbopack es el **default** en `dev` y `build`. Una config de `webpack` hace **fallar** el build |
| **Lint** | `next lint` | Fue eliminado. Se usa la CLI de ESLint (`npm run lint` → `eslint`) con flat config |
| **Imágenes remotas** | `images.domains` | `images.remotePatterns` (`domains` está deprecado) |
| **Config de Turbopack** | `experimental.turbopack` | `turbopack` en el nivel superior de `next.config.ts` |

**Impacto directo en este proyecto:**
- La guía de `@supabase/ssr` para SSR asume `middleware.ts` y `cookies()` síncrono → **adaptar ambos**.
- Todo Route Handler que lea el header de firma de Square debe hacer `await headers()`.
- Requisitos mínimos: Node.js 20.9+ (tenemos 22.20.0 ✅), TypeScript 5.1+ ✅.

---

## Flujo de Datos (end-to-end)

### Paso 0 — Captación (ADR-008): el dato se pide ANTES del pago

```
Visitante en /servicios/[slug]
   └─ popup de diagnóstico (sin X) ── "solo estoy viendo" ──▶ FIN (no vuelve en la sesión)
        └─ 3 preguntas filtro ──▶ datos de contacto ──▶ POST /api/v1/leads
             │                                              └─ leads (Supabase) + correo a Claudia
             ▼
        servicio deducido
             ├─ precio fijo (checkout) ──▶ sigue el flujo de pago de abajo
             └─ precio variable (contact) ──▶ Claudia responde por correo. FIN del flujo automático
```

Solo los servicios **con precio en el catálogo** entran al flujo de cobro automático. Los demás
terminan en el correo a Claudia: la firma no tiene aún la infraestructura para cobrarlos
automáticamente (precios variables y otro medio de cobro).

### Pasos 1–N — Compra, cita y seguimiento

```
┌─ NAVEGADOR ─────────────────────┐        ┌─ SERVIDOR (Next.js) ────────────┐
│ Catálogo de servicios           │──────▶ │ GET  /api/v1/services           │
│ Selecciona servicio             │        │                                 │
│ Square Web Payments SDK         │──────▶ │ POST /api/v1/checkout           │──▶ Square API
│   (tokeniza la tarjeta;          │        │                                 │
│    la tarjeta NUNCA toca         │        │                                 │
│    nuestro servidor)             │        │                                 │
└─────────────────────────────────┘        └─────────────────────────────────┘
                                                        │
                        Square ──webhook payment.updated──▶ POST /api/v1/webhooks/square
                                                        │   (verifica firma HMAC)
                                                        ▼
                                          orders.status = 'paid'  ──▶  Supabase
                                                        │
                                                        ▼
                                          Agente IA genera el esquema del intake
                                                        │
┌─ NAVEGADOR ─────────────────────┐                     ▼
│ Intake form condicional         │──────▶ POST /api/v1/intake  ──▶ Supabase + Storage (adjuntos)
│ (React Hook Form + Zod)         │        │  validación Zod + validación semántica IA
└─────────────────────────────────┘        └───────────────┬─────────────────┘
                                                           ▼
                                           GET /api/v1/availability ──▶ Google Calendar freeBusy
                                                           │
                            ¿hay slot? ── no ──▶ devolver alternativas
                                    │
                                   sí
                                    ▼
                          POST /api/v1/appointments
                                    │
              ┌─────────────────────┼──────────────────────┬───────────────────┐
              ▼                     ▼                      ▼                   ▼
   Google Calendar event    Google Meet link      Supabase: appointment   CRM: client
   (fuente de verdad)       (conferenceData)      status='pendiente_atencion'
                                    │
                                    ▼
                       Gmail API: correo al cliente + copia al admin
                                    │
                                    ▼
              Cron: recordatorios (24 h / 1 h) → tras la cita: status='atendido'
                                    │
                                    ▼
                       Resumen IA de la sesión + propuesta si aplica
```

### Principios del flujo

1. **El webhook de Square es la fuente de verdad del pago**, no la respuesta del cliente.
   El navegador puede cerrarse; el webhook siempre llega.
2. **Google Calendar es la fuente de verdad de la disponibilidad.** La tabla `appointments` es un
   espejo local para consultas rápidas y para el CRM.
3. **Idempotencia obligatoria** en webhooks y en creación de citas (`idempotency_key`), para que un
   reintento de Square o un doble clic no dupliquen cobros ni eventos.
4. **Todo lo que pueda fallar se reintenta**: los envíos de correo y las escrituras a Calendar se
   registran en `notification_log` con estado, para reintento manual o por cron.

---

## Manejo de Zonas Horarias

Regla dura: **la base de datos guarda siempre UTC (`timestamptz`)**. La firma opera en
`America/Chicago`. Los clientes están en México, España, LatAm y varios estados de EE. UU.

- El navegador detecta su huso con `Intl.DateTimeFormat().resolvedOptions().timeZone`.
- Los slots se calculan en `America/Chicago` (horario de oficina) y se **presentan** convertidos al
  huso del cliente, mostrando siempre ambos husos en la confirmación.
- Toda conversión pasa por `src/lib/utils/timezone.ts`. Nunca usar `new Date(string)` a mano.

---

## Design System (Tailwind v4)

Los tokens viven en `src/app/globals.css` dentro del bloque `@theme`. **Prohibido escribir colores
arbitrarios** (`bg-[#123456]`) en los componentes — si falta un color, se agrega primero al token.

| Token Tailwind | Valor | Uso |
|----------------|-------|-----|
| `bg-navy-950` … `navy-50` | escala derivada de `#0B1B3A` | Superficies institucionales |
| `text-platinum` | `#E8ECF3` | Texto sobre navy |
| `bg-gold` | `#C9A227` | Acento premium, separadores |
| `bg-accent` | `#2563EB` | CTA primario, enlaces |
| `text-mx-green` / `text-us-red` | `#0E7A3C` / `#C8102E` | Acentos de bandera, **decorativos** |
| `bg-success` / `bg-warning` / `bg-danger` | verde/ámbar/rojo semánticos | Estados de UI |

> `us-red` (bandera) y `danger` (error) son tokens distintos a propósito: nunca se debe confundir un
> acento decorativo con un estado de error.

**Tipografía:** serif institucional para `h1`–`h3` (variable `--font-serif`), sans para el resto
(`--font-sans`).

---

## Variables de Entorno

Validadas al arrancar por `src/lib/env.ts` (Zod). Si falta una requerida, la app **no arranca**.

| Variable | Descripción | Tipo | Requerida |
|----------|-------------|------|-----------|
| `NEXT_PUBLIC_SITE_URL` | URL pública del sitio | pública | SÍ |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase | pública | SÍ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave anónima (respeta RLS) | pública | SÍ |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave de servicio — **solo servidor** | secreta | SÍ |
| `NEXT_PUBLIC_SQUARE_APPLICATION_ID` | App ID de Square (Web Payments SDK) | pública | SÍ |
| `NEXT_PUBLIC_SQUARE_LOCATION_ID` | Location ID de Square | pública | SÍ |
| `SQUARE_ACCESS_TOKEN` | Token de API de Square | secreta | SÍ |
| `SQUARE_ENVIRONMENT` | `sandbox` \| `production` | config | SÍ |
| `SQUARE_WEBHOOK_SIGNATURE_KEY` | Verificación HMAC del webhook | secreta | SÍ |
| `GOOGLE_CLIENT_EMAIL` | Service account de Google | secreta | SÍ |
| `GOOGLE_PRIVATE_KEY` | Clave privada del service account | secreta | SÍ |
| `GOOGLE_CALENDAR_ID` | Calendario de Claudia | config | SÍ |
| `GOOGLE_IMPERSONATED_USER` | Usuario para delegación (Gmail/Meet) | config | SÍ |
| `ANTHROPIC_API_KEY` | Agente IA | secreta | SÍ |
| `ADMIN_NOTIFICATION_EMAIL` | Correo que recibe la copia de cada cita | config | SÍ |
| `BUSINESS_TIMEZONE` | Default `America/Chicago` | config | NO |
| `CRON_SECRET` | Autenticación de los cron jobs | secreta | SÍ |
| `ZOOM_ACCOUNT_ID` / `ZOOM_CLIENT_ID` / `ZOOM_CLIENT_SECRET` | Proveedor alternativo a Meet | secreta | NO |

Detalle de manejo seguro: [`03-security.md`](./03-security.md).

---

## Convenciones del Proyecto

| Tipo | Convención | Ejemplo |
|------|------------|---------|
| Componentes | PascalCase | `ServiceCard.tsx` |
| Tipos de componente | `.types.ts` junto al componente | `ServiceCard.types.ts` |
| Hooks | camelCase con `use` | `useAvailability.ts` |
| Servicios | camelCase + `.service` | `appointment.service.ts` |
| Utilidades | camelCase | `formatCurrency.ts` |
| Constantes | SCREAMING_SNAKE dentro de archivo camelCase | `BUSINESS_HOURS` en `businessHours.ts` |
| Rutas de página | kebab-case **en español** | `/sobre-claudia`, `/agendar` |
| Endpoints | kebab-case bajo `/api/v1/` | `/api/v1/webhooks/square` |
| Tablas y columnas de DB | snake_case | `appointments.scheduled_at` |
| Tokens CSS | kebab-case | `--color-navy-900` |
| Textos de UI | **español** (mercado hispano) | — |
| Código, tipos y comentarios | **inglés** | — |

**Regla de oro:** leer los archivos existentes y seguir SU convención antes de inventar una nueva.

### Estructura de un componente

```
components/features/scheduling/SlotPicker/
├── SlotPicker.tsx          # Lógica + JSX (clases Tailwind inline permitidas)
├── SlotPicker.types.ts     # Props e interfaces
└── index.ts                # export { SlotPicker }
```

Mandamiento II con Tailwind: las clases van en el JSX, pero **la lógica de negocio no vive en el
componente** — se importa desde `src/services/` o desde un hook.

---

## Decisiones Arquitectónicas

### ADR-001: El cliente final no crea cuenta
**Fecha:** 2026-08-02
**Contexto:** El flujo del cliente es transaccional (compra → intake → cita). Pedir registro añade
fricción y hace caer la conversión.
**Decisión:** Sin autenticación para el cliente. Cada cita se identifica con un token opaco
(`access_token`, UUID) enviado por correo, que permite ver, reprogramar o cancelar la cita.
Supabase Auth se usa **solo** para el panel admin.
**Consecuencias:** RLS debe bloquear todo acceso anónimo a las tablas; el acceso del cliente pasa
siempre por endpoints del servidor que validan el token. El token debe ser largo, aleatorio y
revocable.

### ADR-002: El webhook de Square es la fuente de verdad del pago
**Fecha:** 2026-08-02
**Contexto:** Confirmar el pago desde el navegador es inseguro (se puede falsificar) y frágil (el
usuario puede cerrar la pestaña).
**Decisión:** La orden pasa a `paid` **solo** en `POST /api/v1/webhooks/square`, tras verificar la
firma HMAC. La UI muestra un estado "procesando" hasta que la orden cambie en la base de datos.
**Consecuencias:** Hay que manejar el caso "el usuario llega a la pantalla de intake antes de que
llegue el webhook" con polling corto y un mensaje de espera.

### ADR-003: Google Calendar es la fuente de verdad de la disponibilidad
**Fecha:** 2026-08-02
**Contexto:** Claudia también agenda citas manualmente y desde otros canales (referidos de
abogados). Si la disponibilidad viviera solo en nuestra DB, habría dobles reservas.
**Decisión:** La disponibilidad se calcula siempre con `freeBusy` de Google Calendar cruzado con el
horario de oficina configurado. `appointments` es un espejo local.
**Consecuencias:** Dependencia dura de la API de Google. Se necesita manejo de errores y un
bloqueo temporal del slot (`slot_holds`, TTL ~10 min) para evitar carreras entre dos clientes.

### ADR-004: Google Meet por defecto, Zoom como adaptador
**Fecha:** 2026-08-02
**Contexto:** El flujo pide "Google Meet / Zoom". Meet se crea gratis en la misma llamada que crea
el evento de Calendar (`conferenceData`); Zoom requiere OAuth server-to-server aparte.
**Decisión:** Interfaz `MeetingProvider` en `src/lib/google/` con implementación `google-meet`
(default) y `zoom` (opcional, activada por variables de entorno).
**Consecuencias:** Cambiar de proveedor es un cambio de configuración, no de código de negocio.

### ADR-005: El agente IA asiste, no decide
**Fecha:** 2026-08-02
**Contexto:** El agente genera el formulario y valida respuestas; un error suyo podría bloquear una
venta o dejar pasar datos incompletos.
**Decisión:** El agente IA (a) adapta las preguntas del intake según el servicio y las respuestas
previas, (b) valida semánticamente el texto libre, (c) redacta el resumen post-cita. **Nunca**
decide el precio, la disponibilidad ni el estado del pago — eso es determinista.
Si la API de IA falla, se cae a un formulario estático definido en `src/constants/`.
**Consecuencias:** El intake debe funcionar sin IA. La validación dura siempre es Zod.

### ADR-006: Precios en centavos y en el servidor
**Fecha:** 2026-08-02
**Contexto:** Cobros en USD con floats producen errores de redondeo, y confiar el precio al cliente
permite manipularlo.
**Decisión:** Precios en `integer` de centavos, leídos siempre desde la tabla `services` en el
servidor. El cliente solo envía el `service_id`.
**Consecuencias:** Cambiar un precio es un UPDATE en `services`, sin deploy.

**Nota de implementación (FASE 2 → migra en FASE 6):** hasta que exista el proyecto de Supabase, el catálogo vive en
`src/constants/content/services.ts` con la misma forma que la tabla. `service.service.ts` es la
única pieza que conoce el origen de los datos, así que la migración no toca ningún componente.
Los montos se formatean con `Intl.NumberFormat` en locale **`en-US`** (`"$150"`); `es-MX` devuelve
`"USD 150"` y duplica el código de moneda al añadir el sufijo.

### ADR-007: El sitio público no bloquea sobre servicios externos
**Fecha:** 2026-08-02
**Contexto:** El sitio es la capa de captación. Si dependiera de Supabase, Square o Google para
renderizar, una caída de cualquiera de ellos dejaría a la firma sin presencia web.
**Decisión:** Las páginas públicas son estáticas y se prerrenderizan en build. No consultan
servicios externos en tiempo de request.
**Consecuencias:** Cuando el catálogo migre a Supabase (FASE 6) debe leerse en build o con
revalidación por tiempo (ISR), nunca con un fetch bloqueante por visita.

### ADR-008: El dato del cliente se captura ANTES del pago, no después
**Fecha:** 2026-08-03
**Contexto:** El diseño original ponía el formulario de ingreso **después** del cobro. Con eso, todo
visitante que llegaba a la pantalla de pago y no completaba la compra se perdía por completo: sin
nombre, sin correo, sin teléfono y sin ninguna forma de recuperarlo. Para una firma cuyo ciclo de
venta incluye consultas de alto valor y decisiones que tardan semanas, ese es el peor lugar posible
para poner el formulario.
**Decisión:** Un **diagnóstico gratuito** en popup, que aparece mientras el visitante lee un
servicio, hace 3 preguntas de filtro, deduce qué servicio necesita y **pide sus datos antes de
mostrarle el resultado**. El lead se registra en ese momento (`POST /api/v1/leads`), con
independencia de que pague o no.

**Enmienda del 2026-08-03 (misma clienta, pedido posterior):** el popup **sí tiene X**. La versión
original no la tenía —se salía solo por *"No quiero mi diagnóstico gratuito, solo estoy viendo"*—
para reducir abandonos por reflejo. La clienta pidió después una salida explícita en todos los pasos
para no retener a nadie dentro del formulario. Todas las salidas (rechazo, X, `Esc`) marcan la
sesión igual: el popup no reaparece solo, pero sigue disponible desde los botones de las páginas.
El botón de inicio pasó a decir *"Quiero acceder al servicio"* y el de envío del formulario,
*"Enviar formulario"*.
Después del diagnóstico el flujo se bifurca **según el catálogo**:
- servicio **con** `price_cents` → checkout de Square y agendamiento (flujo automático completo);
- servicio **sin** `price_cents` → correo a Claudia con los datos del posible cliente y el servicio
  solicitado.
**Consecuencias:**
- Nueva tabla `leads`, anterior a `clients` en el embudo.
- El intake completo (`context.md` §7) sigue existiendo, pero **después** del pago y sin repetir lo
  que el diagnóstico ya preguntó (nombre, correo, teléfono, país, si tiene entidad en EE. UU.).
- La aceptación de la política de cancelación **no** se mueve: se sigue registrando en el intake de
  la cita, con `accepted_at` e IP. El diagnóstico solo pide autorización para contactar.
- La bifurcación no se hardcodea: el día que un servicio de cotización reciba precio, pasa solo a la
  rama de cobro automático.

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
   └─ popup de diagnóstico ── "solo estoy viendo" / X / Esc ──▶ FIN (no vuelve en la sesión)
        └─ 3 preguntas filtro ──▶ datos de contacto ──▶ POST /api/v1/leads
             │                                              └─ n8n ──▶ Google Sheets (stage=formulario)
             ▼
        servicio deducido ──▶ agendar y pagar (un solo camino, ADR-009)
```

**Un solo camino.** Desde ADR-009 los ocho servicios tienen precio, así que todo visitante que
termina el diagnóstico sigue el mismo flujo de agenda y pago. La antigua rama de "correo a Claudia"
para servicios sin precio ya no existe.

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
| `N8N_CRM_WEBHOOK_URL` | Webhook del CRM en n8n (ADR-010) | secreta | SÍ |
| `N8N_WEBHOOK_TOKEN` | Secreto compartido con n8n, header `x-leosfirm-token` | secreta | SÍ |
| `N8N_AVAILABILITY_WEBHOOK_URL` | Webhook de disponibilidad (FASE 5). Sin ella: mock fuera de producción, `502` en producción | secreta | NO |
| `N8N_BOOKING_WEBHOOK_URL` | Webhook de reserva tentativa (FASE 5). Mismo comportamiento al faltar | secreta | NO |
| `N8N_CONFIRM_WEBHOOK_URL` | Webhook de confirmación tras el pago (FASE 6) | secreta | NO |
| `N8N_PAYMENTS_WEBHOOK_URL` | Webhook del registro de pagos, pestaña `Pagos` (FASE 6, ADR-013) | secreta | NO |
| `N8N_APPOINTMENT_WEBHOOK_URL` | Webhook que lee la cita del calendario (FASE 9). Sin base de datos, es la única forma de mostrarla | secreta | NO |
| `N8N_CANCEL_WEBHOOK_URL` | Webhook de cancelación: libera el slot, CRM `cancelado`, dos correos (FASE 9) | secreta | NO |
| `N8N_RESCHEDULE_WEBHOOK_URL` | Webhook que le pide otro horario a Claudia por correo. **No reagenda** (FASE 9) | secreta | NO |
| `APPOINTMENT_TOKEN_SECRET` | Firma el enlace de la cita que va en el correo (**ADR-016**). Mín. 32 chars. ⚠️ **Rotarla invalida todos los enlaces ya enviados** | secreta | SÍ |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase | pública | ⏸️ congelada |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave anónima (respeta RLS) | pública | ⏸️ congelada |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave de servicio — **solo servidor** | secreta | ⏸️ congelada |
| `NEXT_PUBLIC_SQUARE_APPLICATION_ID` | App ID de Square (Web Payments SDK) | pública | SÍ |
| `NEXT_PUBLIC_SQUARE_LOCATION_ID` | Location ID de Square | pública | SÍ |
| `SQUARE_ACCESS_TOKEN` | Token de API de Square | secreta | SÍ |
| `SQUARE_ENVIRONMENT` | `sandbox` \| `production` | config | SÍ |
| `SQUARE_WEBHOOK_SIGNATURE_KEY` | Verificación HMAC del webhook | secreta | SÍ |
| `GOOGLE_CLIENT_EMAIL` | Service account de Google | secreta | SÍ |
| `GOOGLE_PRIVATE_KEY` | Clave privada del service account | secreta | SÍ |
| `GOOGLE_CALENDAR_ID` | Calendario de consultas, en el Google Console de `marco@leosfirm.com` (ADR-012) | config | SÍ |
| `GOOGLE_IMPERSONATED_USER` | Usuario para delegación (Gmail/Meet) | config | SÍ |
| `ANTHROPIC_API_KEY` | Agente IA | secreta | SÍ |
| `ADMIN_NOTIFICATION_EMAIL` | Correo que recibe la copia de cada cita | config | SÍ |
| `BUSINESS_TIMEZONE` | Default `America/Chicago` | config | NO |
| `CRON_SECRET` | Autenticación de los cron jobs | secreta | SÍ |
| `ZOOM_ACCOUNT_ID` / `ZOOM_CLIENT_ID` / `ZOOM_CLIENT_SECRET` | Proveedor alternativo a Meet | secreta | NO |

> **⏸️ congelada** significa que la variable sigue documentada pero **no se usa** desde ADR-010.
> Las `GOOGLE_*` quedan igual: las credenciales de Google viven en n8n, no en la app. Ninguna de las
> dos familias se borra — el día que Supabase se reactive o que algo necesite hablar con Google
> directamente, están ahí y validadas.

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

> **Superado parcialmente por ADR-009 (2026-08-04).** La captación antes del pago sigue vigente y es
> el corazón del flujo. Lo que desapareció es la **bifurcación**: ya no hay servicios sin precio, así
> que la rama del correo a Claudia no existe. La frase final de este ADR se cumplió, solo que para
> los seis servicios a la vez.

### ADR-009: Todos los servicios se cobran en línea

**Fecha:** 2026-08-04
**Contexto:** Solo dos de los ocho servicios tenían precio cerrado ($150 y $250). Los otros seis
terminaban en un correo a Claudia con los datos del interesado, porque su precio depende del caso.
Eso tenía dos costos que se hicieron evidentes al operarlo: Claudia quedaba obligada a vivir dentro
del correo para saber si tenía clientes nuevos, y el sitio mantenía **dos flujos distintos** —uno
automatizado y uno manual— para el mismo tipo de visitante.

**Decisión:** Los seis servicios sin precio pasan a cobrar **$50 para apartar la cita**, y ese monto
**se descuenta completo del costo real** del servicio. Claudia da ese costo durante la llamada —cotiza
por caso— y cobra el resto por su infraestructura habitual. Los dos servicios con precio cerrado no
cambian.

Modelado con `Service.pricingModel`:

| Modelo | Servicios | Qué significa |
|--------|-----------|---------------|
| `full-service` | Consultoría fiscal ($150) · Elecciones fiscales ($250) | El pago cierra el servicio |
| `deposit` | Los otros seis ($50) | **Aparta la cita** y se descuenta completo del costo real |

> ⚠️ **Corrección del 2026-08-06 (la clienta).** Este modelo se llamaba `initial-consultation` y se
> anunciaba como «Consulta inicial», y **el nombre era el error**: se leía como si los $50 compraran una
> consulta más barata, un producto con su propio alcance. No compran nada por sí solos — son **dinero a
> cuenta** que reserva el horario. Renombrado a `deposit` en el tipo, en el catálogo y en la copy
> (`PRICING_COPY.deposit.label` = «Abono al total»). **No reintroducir el nombre viejo.**

**Consecuencias:**
- `Service.priceCents` deja de ser `number | null` y pasa a `number`. **No existe un camino sin
  precio en el catálogo**, y el compilador lo garantiza.
- `DiagnosticOutcome` (`checkout` | `contact`) se elimina, junto con `getOutcome()` y la pantalla de
  "Claudia revisa tu caso". Todo visitante que termina el diagnóstico va a agendar y pagar.
- `Service.requiresAppointment` se elimina: ahora es siempre `true`. `Elecciones fiscales`, que era
  un trámite sin cita, pasa a empezar con una sesión como el resto — de 60 minutos entonces, de
  **30 desde el 2026-08-07** ([`features/scheduling.md`](./features/scheduling.md) § Bloque C).
- `durationMinutes` deja de ser opcional.
- El precio de la consulta inicial vive en `INITIAL_CONSULTATION` (`src/constants/business.ts`):
  cambiarlo es un número en un archivo, no seis ediciones en el catálogo.
- **Contrapartida asumida:** un visitante que antes podía pedir una cotización gratis ahora encuentra
  un cobro. Se acepta a cambio de que ninguna solicitud se pierda en una bandeja de entrada. El texto
  siempre dice que el monto se abona al servicio, para que no se lea como una barrera.

### ADR-010: n8n es la capa de integración; Supabase queda congelado

**Fecha:** 2026-08-04
**Contexto:** El CRM que la firma necesita hoy es *"que Claudia vea de un vistazo quién llenó el
formulario y hasta dónde llegó"*. La respuesta documentada era un proyecto de Supabase con 13 tablas,
RLS y un panel administrativo por construir — meses de trabajo y una cuenta nueva para resolver algo
que una hoja de cálculo resuelve hoy. Al mismo tiempo, el proyecto ya tiene una instancia de n8n en
producción con credenciales de Google conectadas.

**Decisión:** El CRM es una **hoja de Google** y **n8n es la única pieza que habla con Google**.
Next.js publica eventos a webhooks de n8n; n8n decide qué hacer con ellos (Sheets, Calendar, Gmail).
El proyecto de Supabase **no se crea**: su diseño queda documentado en `DB_SCHEMA.md` sin aplicar.

```
Next.js ──POST webhook──▶ n8n ──┬──▶ Google Sheets   (CRM)
   (sin credenciales             ├──▶ Google Calendar (agenda)
    de Google)                   └──▶ Gmail           (correos)
```

**Consecuencias:**
- **Una sola superficie de credenciales.** Ningún service account de Google entra a Vercel.
  `GOOGLE_*` y `SUPABASE_*` quedan sin usar mientras dure este arreglo.
- Claudia puede filtrar, ordenar y anotar en la hoja sin que nadie programe un panel.
- **Se pierde la integridad referencial.** Una hoja no tiene claves foráneas ni transacciones. El
  antídoto es que cada etapa escriba solo sus columnas y que la clave (`lead_id`) la genere el
  cliente una vez. A partir de unos cientos de filas al mes esto deja de alcanzar y hay que
  reactivar Supabase — n8n podrá escribir a las dos a la vez sin tocar la app.
- **Se depende de que n8n esté arriba.** Se acepta porque ninguna caída suya rompe el sitio: los
  fallos son suaves y devuelven `delivery: "failed"` (ver `features/crm-sheets.md`).
- `getN8nEnv()` es el único getter de entorno que **no lanza** cuando falta una variable. Está
  justificado en el propio archivo: un 500 en el diagnóstico pierde el lead *y* la persona.
- Los cron de recordatorios dejan de necesitar Vercel Pro: los ejecuta n8n (`04-deployment.md`).

### ADR-011: La retención del slot es un evento tentativo en Google Calendar

**Fecha:** 2026-08-04 · **Detalle:** [`features/scheduling.md`](./features/scheduling.md)

**Contexto.** La regla de negocio dice que ninguna cita existe sin pago confirmado, pero entre elegir
la hora y terminar de pagar pasan minutos en los que otro visitante puede llevarse el mismo slot. El
diseño original resolvía esto con una tabla `slot_holds` en Supabase — que ahora está congelado
(ADR-010). Sin base de datos, la retención necesita otro lugar donde vivir.

**Decisión.** El slot se retiene **creando el evento en Google Calendar con `status: 'tentative'`** y
un resumen que lo delata: `RESERVA SIN PAGAR — <nombre>`. Cuando Square confirma el pago, el mismo
evento pasa a `confirmed`, cambia de título y recibe el enlace de Meet. Si el pago no llega, un
workflow programado lo borra.

**Consecuencias.**
- Google Calendar sigue siendo la **única** fuente de verdad de la disponibilidad (ADR-003 intacto):
  la retención ocupa espacio real, así que el siguiente visitante ya no ve ese hueco.
- Claudia ve las reservas sin pagar en su calendario y distingue una cita real de una a medias de un
  vistazo.
- No hace falta base de datos para el bloqueo. Un problema menos y una integración menos.
- **El nodo nativo de Calendar de n8n (v1.3) no expone `status`**, solo `showMeAs`. Como todo este ADR
  se sostiene sobre `status: 'tentative'`, los workflows que crean y confirman el evento llaman a la
  API de Calendar por HTTP Request en vez de usar el nodo.
- **Costo:** un abandono deja basura en el calendario hasta que el limpiador pasa. El limpiador corre
  cada 30 minutos y la retención es `SLOT_HOLD_MINUTES`, hoy **30**. Son dos números distintos aunque
  hoy coincidan —frecuencia del cron y retención— y `SLOT_HOLD_MINUTES` **vive en dos sitios**:
  `src/constants/business.ts` y el nodo Code del WF4, que es la única copia fuera del repo. Si se
  desincronizan, el limpiador puede borrar un slot que se está pagando: **cobro hecho, cita
  imposible**. Pasó, y está contado en [`features/payments.md`](./features/payments.md).
- **Carrera pendiente de resolver:** dos personas pueden crear el evento tentativo casi a la vez.
  Google Calendar no impide solapes. La mitigación es revalidar la disponibilidad justo antes de
  crear el evento y aceptar la ventana de riesgo de unos segundos, que a este volumen es teórica.

### ADR-012: Las dos integraciones de Google viven en cuentas de dueños distintos

**Fecha:** 2026-08-05

**Contexto.** ADR-010 dejó a n8n como único poseedor de las credenciales de Google, pero **no dijo de
quién son las cuentas**. Al montarlo, las dos integraciones se resolvieron de manera distinta y por
motivos distintos:

- **Google Sheets (CRM).** El permiso `drive.file` obliga a que la hoja la **cree** la propia
  credencial de n8n (`features/crm-sheets.md`). Esa credencial está conectada a
  **`wilyerernestoarias@gmail.com`**, una cuenta personal del equipo de desarrollo. Por lo tanto la
  hoja del CRM vive **en el Drive de esa cuenta**, no en el de la firma. No fue una preferencia: fue
  la única forma de que la escritura funcionara.
- **Google Calendar (agenda).** Se conecta desde el **Google Console del cliente**, con la cuenta
  **`marco@leosfirm.com`** (dominio de la firma). Aquí no hay obstáculo técnico: la credencial de
  Calendar pide permiso completo sobre calendarios, no el permiso por-archivo de `drive.file`.

**Decisión.** Se **acepta la asimetría**, con la propiedad declarada explícitamente en la
documentación y la migración de la hoja registrada como **deuda técnica con dueño**, no como
detalle olvidado:

| Integración | Cuenta dueña | Motivo | Estado |
|-------------|--------------|--------|--------|
| Google Sheets — hoja del CRM | `wilyerernestoarias@gmail.com` (desarrollo) | Impuesto por `drive.file` | ⚠️ **Provisional** — migrar a la firma |
| Google Calendar — agenda | `marco@leosfirm.com` (Google Console del cliente) | Correcto desde el día uno | ~~✅ Definitivo~~ → **superado por ADR-017** |

> ⚠️ **La fila del calendario ya no vale.** Decía «✅ Definitivo» y dejó de serlo el **2026-08-07**,
> cuando la clienta pidió que el calendario y el remitente de los correos pasen a
> `claudia@leosfirm.com`. Lo que sigue vigente de este ADR es todo lo demás: la asimetría de la hoja
> del CRM, el riesgo de la cuenta personal y la ruta de salida. Ver **ADR-017**.

**Consecuencias.**
- **PII de terceros bajo una cuenta personal.** Cada fila de la hoja contiene nombre, correo,
  teléfono y país de un cliente de la firma (`03-security.md` §PII). Hoy esos datos son propiedad
  material de una cuenta que no pertenece a Leos Firm LLC. Es el mayor riesgo abierto del proyecto y
  **no se resuelve compartiendo la hoja**: compartir da acceso, no propiedad.
- **Riesgo de continuidad.** Si esa cuenta personal se pierde, se cierra o el equipo de desarrollo
  sale del proyecto, la firma se queda sin su CRM. Un `drive.file` no se transfiere solo.
- **La ruta de salida está identificada.** Transferir la propiedad de la hoja desde Drive a una
  cuenta de `leosfirm.com`, **o** rehacer la credencial de Sheets como **Service Account** dentro del
  mismo Google Console de `marco@leosfirm.com` que ya se usará para Calendar. La segunda opción
  unifica las dos integraciones bajo el cliente y elimina la trampa del `drive.file` para siempre.
- **No se toca hasta cerrar la FASE 5.** Mover la hoja ahora obliga a reconfigurar los tres nodos del
  workflow del CRM, que acaba de quedar verde. La migración se hace con el agendamiento ya
  funcionando, en un solo movimiento y con una verificación de escritura real.
- El calendario **no arrastra** ninguna de estas dudas: nace en la cuenta correcta.

### ADR-013: La idempotencia la da el evento de Calendar; la hoja es el registro

**Fecha:** 2026-08-05 · **Detalle:** [`features/payments.md`](./features/payments.md)

**Contexto.** Square reintenta un webhook hasta 72 horas, así que `payment.updated` llega más de una
vez por diseño. El diseño original guardaba los `event_id` procesados en una tabla `webhook_events` de
Supabase, con una restricción `UNIQUE` haciendo el trabajo pesado. Sin base de datos hay que separar
dos cosas que esa tabla resolvía juntas: **la exclusión mutua** y **el registro auditable**. Un
registro en una hoja de cálculo es un log, no un candado: ni Google Sheets ni el Data Table de n8n
ofrecen «escribe solo si no existe» de forma atómica.

**Decisión.** Se separan, y cada una va donde puede cumplirse de verdad.

**1. La guardia atómica es la transición `tentative → confirmed` del propio evento de Calendar, con
`If-Match` sobre el ETag.** El WF3 ya lee el evento antes de tocarlo; envía ese ETag en la cabecera
`If-Match` del PATCH. Si otra ejecución lo confirmó en el intervalo, Google responde **412 Precondition
Failed** y esa ejecución no hace nada. Es un *compare-and-swap* real, provisto por Google, sin
infraestructura nueva. Encaja con lo ya decidido: **el estado que hay que proteger de ejecutarse dos
veces ya está guardado en Calendar** (ADR-003, ADR-011) — no hacía falta inventarle un espejo.

**2. El registro es una pestaña `Pagos` en la MISMA hoja del CRM**, una fila por `event_id` de Square.
En la hoja y no en el Data Table de n8n porque el permiso `drive.file` es por archivo y ese archivo lo
creó la propia credencial (ADR-012), así que una pestaña nueva hereda el permiso; porque Claudia lo ve
donde ya trabaja (ADR-010) y un pago atascado tiene que verse sin entrar a n8n; y porque es el registro
que los reembolsos de la FASE 9 van a necesitar. Ninguna de las dos opciones es atómica: por eso el
candado real está en el punto 1.

**Consecuencias.**
- La pestaña `Pagos` es a la vez log, anti-replay de primera línea y **cola de reparación**: una fila
  en `recibido` que no avanza a `confirmado` es un cobro sin cita, y se ve de un vistazo.
- Es una hoja, no una base de datos: dos webhooks simultáneos podrían escribir dos filas para el mismo
  `event_id`. **No importa** — la segunda ejecución choca contra el 412 de Calendar y no produce ningún
  efecto. El registro puede tener un duplicado; la cita no.
- Los dos nodos HTTP del WF3 usan `fullResponse` + `neverError`, y es lo que hace viable todo lo
  anterior: así **un 412 es un dato que se enruta**, no una excepción que tumba el flujo sin responderle
  a nadie — y un webhook sin respuesta es un `null` en Next.js, es decir una fila en `error` por algo
  que en realidad salió bien.
- Hay que mantener a mano una pestaña más y sus encabezados, con la misma regla de siempre: **un
  encabezado mal escrito pierde el dato en silencio.**

### ADR-014: El contexto de la cita viaja dentro de la orden de Square

**Fecha:** 2026-08-05 · **Detalle:** [`features/payments.md`](./features/payments.md)

**Contexto.** El cuerpo de `payment.updated` trae `payment_id`, `order_id`, `amount_money` y `status`.
**No trae `lead_id` ni `event_id`**, y sin base de datos no hay dónde mirarlos: el webhook sabe que
alguien pagó y no sabe qué cita confirmar. La tabla `orders` de Supabase era el puente entre ambos
mundos.

**Decisión.** El contexto viaja **con el pago**, puesto por el servidor en `POST /api/v1/checkout`:

| Dónde | Qué | Por qué ahí |
|---|---|---|
| `Order.metadata` | `lead_id`, `event_id`, `service_slug` | Es el campo que Square ofrece para exactamente esto |
| `Payment.reference_id` | `lead_id` | Ancla redundante y **visible en el panel de Square**: Claudia puede cruzar un cobro con una fila del CRM sin ayuda de nadie. El UUID mide 36 caracteres y el límite del campo es 40 |

El webhook, tras verificar la firma, hace **`RetrieveOrder(order_id)`** y saca la metadata de ahí.

**La llamada extra a Square es deliberada, no un descuido.** Más allá de la firma, el cuerpo del
webhook no se usa como fuente de datos: el importe y el estado se releen de Square y se comparan contra
`priceCents` del catálogo (ADR-006). Un webhook con firma válida sigue siendo un mensaje sobre cuyo
contenido no tenemos control.

**Nada de PII entra en la metadata de Square.** Nombre, correo y teléfono **no** viajan ahí — Square
documenta la metadata como campo no apto para datos sensibles, y no hace falta: esos datos ya están en
la `description` del evento tentativo, que el WF3 lee de todos modos (ADR-011).

**Consecuencias.**
- `POST /api/v1/checkout` crea **orden + pago**, no solo un pago. Es un paso más que un `CreatePayment`
  pelado, y es el precio de no tener base de datos.
- **El contrato del WF3 recibe solo identificadores** —`event_id`, `lead_id`, `payment_id`,
  `amount_usd`, `paid_at`— y toma nombre, correo, teléfono, servicio y huso **del propio evento
  tentativo**, parseándolos del `summary` y de la `description` que escribe el WF2.
- Ese parseo de texto plano es la parte frágil. **Mejora recomendada al WF2:** escribir además
  `extendedProperties.private` con `lead_id`, `service_slug`, `full_name` y `email` — un mapa
  clave-valor pensado para esto y que no se ve en la UI del calendario. Cuesta actualizar y republicar
  un workflow que ya funciona, y eso resetea su credencial, así que queda como recomendación y no como
  bloqueante.

### ADR-015: la marca de «recordatorio enviado» vive en el propio evento de Calendar

**Fecha:** 2026-08-06 · **Detalle:** [`features/notifications.md`](./features/notifications.md)

Registrada aquí como propuesta del doc de notificaciones. El registro completo vive en ese archivo.

### ADR-016: el token de la cita es firmado y no se guarda en ningún lado

**Fecha:** 2026-08-06 · **Detalle:**
[`features/appointment-management.md`](./features/appointment-management.md)

**Contexto.** ADR-001 dice que el cliente no crea cuenta y que su cita se identifica con un
`access_token` opaco enviado por correo. Ese diseño asumía una columna `appointments.access_token` en
Supabase contra la que comparar. **Supabase está congelado** (ADR-010) y el CRM es una hoja: no hay
dónde guardar un token, y leer la hoja de vuelta en cada visita sería una llamada a n8n por página
servida, con un `403` de Google como modo de fallo. Un UUID aleatorio necesita un sitio donde estar
escrito para significar algo.

**Decisión.** El token **se firma en vez de guardarse**:

```
token = base64url(eventId) + "." + base64url( HMAC-SHA256(eventId, APPOINTMENT_TOKEN_SECRET) )
```

Verificar es recalcular el HMAC y compararlo **en tiempo constante** (`crypto.timingSafeEqual`),
igual que la firma del webhook de Square (`src/lib/square/signature.ts`). Sin estado, sin base de
datos y sin una llamada de red para saber si un enlace es legítimo.

**Consecuencias.**
- **Nada de PII dentro del token**: solo el `eventId` de Google, que es opaco y no nombra a nadie. El
  resto se lee del evento **después** de verificar la firma.
- **No caduca por sí mismo** — no lleva fecha dentro. Lo que caduca es la cita: si el evento ya no
  existe, la página responde `notFound()`.
- **Firma inválida y cita inexistente responden lo mismo** (`404`). Distinguirlas sería un oráculo
  para saber qué tokens son criptográficamente válidos.
- **Es un portador: quien tiene el enlace puede cancelar.** Misma propiedad que el `access_token` de
  ADR-001 y deliberada — pedir una contraseña a quien solo quiere mover una cita mata la función. Lo
  que la hace aceptable: el enlace solo sale en el correo de esa persona, cancelar **no mueve
  dinero** (los reembolsos son manuales) y los dos endpoints tienen rate limit.
- ⚠️ **Rotar `APPOINTMENT_TOKEN_SECRET` invalida TODOS los enlaces ya enviados**, sin período de
  gracia — no puede haberlo sin estado. Rotarlo exige saber qué citas futuras existen y reenviarles
  el enlace.
- `getAppointmentTokenSecret()` **sí lanza** cuando falta la variable, al revés que `getN8nEnv()`. La
  excepción de aquel («un 500 en el diagnóstico pierde el lead y la persona») no aplica: sin secreto
  no hay nada que servir en esa página, y servir algo sería peor.

### ADR-017: la cara visible del sistema es `claudia@leosfirm.com`, no `marco@leosfirm.com`

**Fecha:** 2026-08-07 · **Supera parcialmente a ADR-012**

**Contexto.** ADR-012 puso la agenda en el Google Console de `marco@leosfirm.com` y lo declaró
definitivo. Era correcto para lo que resolvía entonces —sacar las credenciales de Google de una
cuenta personal del equipo de desarrollo y llevarlas al dominio de la firma— pero resolvió
*propiedad técnica* y nunca se preguntó por *quién opera el negocio*. Marco administra el Workspace;
**Claudia es quien atiende las citas y con quien el cliente cree que habla.** El resultado es que el
cliente recibe la confirmación de su consulta desde la cuenta del administrador de sistemas, ve una
dirección interna en el `CC`, y Claudia no tiene la agenda en su propio calendario.

**Decisión.** Las dos superficies que el cliente toca pasan a `claudia@leosfirm.com`:

| Superficie | Cómo | Coste |
|---|---|---|
| **Remitente de los 6 correos** | Credencial Gmail OAuth2 nueva en n8n, autenticada como Claudia. El nodo Gmail de n8n **no tiene campo «From»**: el remitente es siempre la cuenta de la credencial, así que una credencial nueva es la única vía | Un consentimiento OAuth manual |
| **Calendario de consultas** | El **mismo** calendario (`c_4a1fcc0c…cbabfaf@group.calendar.google.com`), compartido con Claudia como *Hacer cambios y gestionar el uso compartido*, y la credencial de Calendar de n8n repuesta con su cuenta | **Cero** — el ID no cambia |
| **`CC: marco@leosfirm.com`** del WF3 | Se elimina. La copia interna se queda en el `BCC` a Claudia | Una edición a mano |

**Por qué NO se crea un calendario nuevo bajo Claudia**, que sería lo «limpio»: el `eventId` de Google
es la identidad de cada cita en todo el sistema —lo lleva dentro el token firmado de ADR-016, lo usa
el WF3 para confirmar y el WF4 para limpiar— y **esos ids son locales al calendario**. Un calendario
nuevo rompe toda cita ya agendada y todo enlace de gestión ya enviado, además de obligar a editar el
ID en ~8 nodos de 6 workflows y republicar 4 webhooks de producción. Se prefiere que el objeto
calendario siga habiendo nacido en la cuenta de Marco antes que romper citas pagadas.

**Consecuencias.**
- **Marco sale del flujo operativo, no del proyecto.** Sigue siendo **superadministrador del Google
  Workspace** de la firma, y el paso pendiente de activación del DKIM
  ([`04-deployment.md`](./04-deployment.md)) depende de él. «Retirar a marco del proceso» es retirar
  su dirección de los correos y su cuenta de las credenciales; el rol de administrador no se delega
  por esta vía.
- **Queda una dependencia declarada:** el calendario vive dentro de la cuenta de Marco aunque Claudia
  lo gestione. Google no permite transferir el dueño de un calendario secundario. Si algún día Marco
  deja el proyecto hay que hacer la migración cara (calendario nuevo + los ~8 nodos), y el momento
  barato para hacerla es **cuando no haya ninguna cita futura agendada**.
- **El `rua=` del DMARC sigue apuntando a Marco.** Es una dirección de reportes técnicos, no de
  negocio, y ahí está bien: los informes de fallo de autenticación los lee el administrador del
  dominio.
- Cambiar la credencial de un workflow **no** es cambiar el workflow: se hace en la UI de n8n sin
  tocar su definición, así que no dispara el borrado de credenciales que provoca actualizar por MCP.

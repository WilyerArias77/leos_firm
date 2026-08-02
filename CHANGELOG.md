# Changelog — Leos Firm LLC

> Formato: [Semantic Versioning](https://semver.org/)
> Cada entrada incluye: fecha, tipo de cambio, archivos afectados y request original.
> **Mandamiento IV:** cada request que modifique código genera una entrada aquí.

---

## [2026-08-02] — Setup Inicial (Método AInnovate FASE 1) — v0.1.0

### Tipo de cambio
- **ADDED**: estructura completa del proyecto, documentación base y reglas para IA

### Archivos creados

**Documentación (Método AInnovate):**
- `docs/01-project-overview.md` — Visión, objetivos, stack, catálogo de servicios, identidad visual derivada del logo, roadmap de 10 fases, reglas de negocio no negociables
- `docs/02-architecture.md` — Estructura de carpetas, flujo de datos end-to-end, manejo de zonas horarias, design system, variables de entorno, convenciones y 6 ADRs
- `docs/03-security.md` — Modelo de amenazas, autenticación sin cuenta de cliente, RLS, PCI/Square, scopes de Google, prompt injection, PII y estado de vulnerabilidades
- `docs/04-deployment.md` — Entornos, servicios externos a configurar, webhooks, cron jobs, checklist pre-deploy y rollback
- `docs/DB_SCHEMA.md` — Modelo de datos diseñado: 12 tablas, 6 enums, diagrama ER, políticas RLS, constraint anti doble-reserva y datos semilla
- `docs/API_DOCS.md` — 21 endpoints diseñados con auth, formatos de respuesta y códigos de error
- `docs/SKILLS.md` — Registro de 7 MCP servers y 10 skills disponibles, mapeados a cada feature
- `docs/features/` — Carpeta vacía (se llena en FASE 2)

**Reglas para IA (6 IDEs):**
- `.windsurfrules` — Windsurf / Cascade
- `CLAUDE.md` — Claude Code
- `.cursorrules` — Cursor
- `.github/copilot-instructions.md` — GitHub Copilot
- `.clinerules` — Cline / Continue
- `.aider.conf.yml` — Aider
- `AGENTS.md` — Apunta a `CLAUDE.md`, preservando la advertencia de Next.js 16 del scaffold

**Código base:**
- Proyecto Next.js 16.2.12 + React 19.2.4 + TypeScript + TailwindCSS v4
- `src/app/globals.css` — Design tokens derivados del logo (`@theme` de Tailwind v4)
- `src/app/layout.tsx` — Layout raíz en español, con tipografías y metadata de la firma
- `src/app/(public)/page.tsx` — Placeholder de estado del proyecto (se reemplaza en FASE 2)
- `src/lib/env.ts` — Validación de variables de entorno con Zod
- `src/lib/supabase/{client,server,admin}.ts` — Clientes de Supabase (Next 16: `await cookies()`)
- `src/lib/utils/cn.ts` — Utilidad de composición de clases
- `src/constants/` — `business.ts` (horario, políticas, husos) y `routes.ts`
- `src/types/` — Tipos globales
- `src/app/api/v1/health/route.ts` — Health check
- `.env.example` — Todas las variables necesarias, sin valores reales
- `docs/features/README.md` — Plantilla del ciclo de features de FASE 2
- Estructura de carpetas completa según `docs/02-architecture.md`

### Archivos modificados
- `README.md` — Reemplazado el README genérico de `create-next-app` por el del proyecto
- `.gitignore` — Añadida excepción `!.env.example`: la regla `.env*` también lo ignoraba, y ese
  archivo **debe** commitearse (Mandamiento VIII)
- `package.json` — Nombre corregido de `scaffold-tmp` a `leos-firm`

### Dependencias instaladas
`@supabase/supabase-js`, `@supabase/ssr`, `zod`, `react-hook-form`, `@hookform/resolvers`,
`square`, `googleapis`, `@anthropic-ai/sdk`, `date-fns`, `@date-fns/tz`, `lucide-react`, `sonner`,
`server-only`. Cada una está justificada en la tabla de `docs/02-architecture.md`.

### Validación (Mandamiento X)
- [x] `npx tsc --noEmit` — sin errores de tipos
- [x] `npm run build` — compila correctamente (Turbopack, 5 rutas)
- [x] `npm run lint` — sin errores
- [x] `GET /api/v1/health` responde `200` con `{"status":"ok"}`
- [x] `GET /` responde `200` y los design tokens renderizan (verificado con captura)
- [x] Sin credenciales hardcodeadas · sin `any` · sin dependencias no justificadas

### Cambios en base de datos
- Ninguno. El schema está **diseñado y documentado** en `DB_SCHEMA.md`, pero no se aplicó ninguna
  migración: las tablas se crean en FASE 2, una por feature.

### Documentación actualizada
- [x] `CHANGELOG.md` — esta entrada
- [x] `docs/01-project-overview.md`
- [x] `docs/02-architecture.md`
- [x] `docs/03-security.md`
- [x] `docs/04-deployment.md`
- [x] `docs/DB_SCHEMA.md`
- [x] `docs/API_DOCS.md`
- [x] `docs/SKILLS.md`
- [x] Reglas de los 6 IDEs con tabla de lookup inicial

### Decisiones arquitectónicas registradas
- **ADR-001** — El cliente final no crea cuenta; usa un `access_token` opaco enviado por correo
- **ADR-002** — El webhook de Square es la fuente de verdad del pago
- **ADR-003** — Google Calendar es la fuente de verdad de la disponibilidad
- **ADR-004** — Google Meet por defecto, Zoom como adaptador intercambiable
- **ADR-005** — El agente IA asiste, no decide (con fallback estático obligatorio)
- **ADR-006** — Precios en centavos y calculados siempre en el servidor

### Notas importantes
- **Next.js 16 rompe patrones conocidos.** `middleware.ts` pasó a ser `proxy.ts`; `cookies()`,
  `headers()`, `params` y `searchParams` son **solo asíncronos**. La documentación oficial de
  `@supabase/ssr` todavía usa los patrones viejos y hay que adaptarla. Documentado en
  `docs/02-architecture.md` y en las reglas de los 6 IDEs.
- `npm audit` reporta 3 vulnerabilidades altas transitivas de `next@16.2.12` (`postcss`, `sharp`).
  El "fix" de npm degradaría a `next@9.3.3`. Riesgo aceptado y documentado en `docs/03-security.md`.
- El MCP server de **Vercel requiere autorización** del usuario antes de poder usarse.

### Request original
> Lee el archivo METODO_AINNOVATE.md completo y sigue las instrucciones de la FASE 1.
> Mi proyecto es: [flujo completo: sitio web → catálogo de servicios → selección → pasarela de pago
> Square → agente IA → formulario inteligente → validación → Google Calendar → cita → Google
> Meet/Zoom → CRM → correo al cliente y al administrador → estado pendiente de atención → atendido.
> Integraciones: Página Web, Square, Agente IA, Google Calendar, Google Meet/Zoom, Gmail, CRM,
> Base de Datos]
> Stack que quiero usar: [Next.js + Supabase + TailwindCSS]

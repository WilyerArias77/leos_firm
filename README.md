# Leos Firm LLC — Plataforma Web

Sitio web y ecosistema automatizado de captación, cobro y agendamiento para
**Leos Firm LLC** (San Antonio, TX) — consultoría fiscal y apertura de empresas en Estados Unidos
para empresarios hispanos.

```
Catálogo → Pago Square → Agente IA → Intake form → Google Calendar
   → Google Meet → CRM → Correos (Gmail) → Estado de la cita
```

**Stack:** Next.js 16 (App Router) · TypeScript · TailwindCSS v4 · Supabase
**Integraciones:** Square · Google Calendar · Google Meet/Zoom · Gmail · Anthropic

---

## 🤖 Antes de escribir código, lee esto

Este proyecto sigue el **Método AInnovate v2.1** (Documentation-Driven Development).
La documentación no es opcional: es el contrato del proyecto.

| Doc | Qué contiene |
|-----|--------------|
| [`CLAUDE.md`](./CLAUDE.md) | Reglas para IA — **empieza aquí** |
| [`METODO_AINNOVATE.md`](./METODO_AINNOVATE.md) | El método completo |
| [`context.md`](./context.md) | Contexto de negocio de la clienta |
| [`docs/01-project-overview.md`](./docs/01-project-overview.md) | Visión, objetivos, stack, roadmap |
| [`docs/02-architecture.md`](./docs/02-architecture.md) | Carpetas, flujo de datos, ADRs, Next.js 16 |
| [`docs/03-security.md`](./docs/03-security.md) | Credenciales, RLS, PCI, PII |
| [`docs/04-deployment.md`](./docs/04-deployment.md) | Deploy y checklist |
| [`docs/DB_SCHEMA.md`](./docs/DB_SCHEMA.md) | Modelo de datos |
| [`docs/API_DOCS.md`](./docs/API_DOCS.md) | Endpoints |
| [`docs/SKILLS.md`](./docs/SKILLS.md) | MCP servers y skills disponibles |
| [`CHANGELOG.md`](./CHANGELOG.md) | Historial de cambios |

---

## Puesta en marcha

```bash
npm install
cp .env.example .env.local   # rellenar con valores reales
npm run dev                  # http://localhost:3000
```

Sin `.env.local` completo la app no arranca: `src/lib/env.ts` valida las variables al inicio, a
propósito, para no fallar a mitad de un cobro o un agendamiento.

Los servicios externos que hay que configurar antes del primer deploy están listados en
[`docs/04-deployment.md`](./docs/04-deployment.md).

## Comandos

| Comando | Qué hace |
|---------|----------|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción — **validación obligatoria antes de entregar** |
| `npm run start` | Sirve el build |
| `npm run lint` | ESLint |

---

## ⚠️ Next.js 16

Los patrones de Next 13/14/15 **no compilan** aquí. `middleware.ts` es ahora `proxy.ts`;
`cookies()`, `headers()`, `params` y `searchParams` son **solo asíncronos**.
Documentación local y confiable: `node_modules/next/dist/docs/`.
Detalle completo en [`docs/02-architecture.md`](./docs/02-architecture.md).

## Estado

**FASE 1 completa** — documentación, reglas para IA, design system y estructura base.
FASE 2 en adelante: ver el roadmap en [`docs/01-project-overview.md`](./docs/01-project-overview.md).

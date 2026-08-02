<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# Reglas del proyecto

Este proyecto sigue el **Método AInnovate v2.1** (Documentation-Driven Development).

**Las reglas completas están en [`CLAUDE.md`](./CLAUDE.md)** — léelo antes de escribir código.

Resumen del protocolo obligatorio:

1. Leer `docs/01-project-overview.md` y `docs/02-architecture.md`
2. Leer `docs/SKILLS.md`
3. Leer `docs/features/[feature].md` — si no existe, crearlo **antes** de codear
4. Si tocas DB → `docs/DB_SCHEMA.md` · API → `docs/API_DOCS.md` · auth/pagos/RLS/PII → `docs/03-security.md`
5. Al terminar: actualizar los docs afectados y agregar entrada en `CHANGELOG.md`

Método completo: `METODO_AINNOVATE.md` · Contexto de negocio: `context.md`

# Skills y MCP Servers Disponibles — Leos Firm LLC

> **Última actualización:** 2026-08-03
> **Registro del entorno de desarrollo:** skills, extensiones, MCP servers y herramientas
> especializadas disponibles para este proyecto.

---

## ¿Qué son las Skills?

Capacidades especializadas que la IA puede usar para implementar funcionalidades de forma más
eficiente y correcta. **Antes de implementar cualquier feature (FASE 2.0), la IA DEBE leer este
archivo** para verificar si existe una skill o un MCP server que aplique.

Este proyecto tiene una ventaja poco común: **casi todas sus integraciones tienen un MCP server
conectado**. Supabase, Google Calendar y Gmail se pueden inspeccionar y probar directamente desde el
IDE, sin escribir código de prueba desechable.

---

## MCP Servers Conectados

| # | Servidor | Herramientas clave | Usar cuando |
|---|----------|-------------------|-------------|
| 1 | **Supabase** | `list_projects`, `create_project`, `list_tables`, `apply_migration`, `execute_sql`, `generate_typescript_types`, `get_advisors`, `get_logs`, `deploy_edge_function`, `search_docs` | Crear el proyecto, aplicar migraciones, inspeccionar el schema, generar tipos, **auditar seguridad con `get_advisors`**, depurar con `get_logs` |
| 2 | **Google Calendar** | `list_calendars`, `list_events`, `search_events`, `create_event`, `update_event`, `delete_event`, `suggest_time` | Descubrir el `GOOGLE_CALENDAR_ID` real, inspeccionar la estructura de eventos y probar disponibilidad antes de codear la integración |
| 3 | **Gmail** | `search_threads`, `get_message`, `create_draft`, `update_draft`, `list_labels`, `create_label` | Prototipar plantillas de correo y verificar cómo se ven realmente antes de automatizarlas |
| 4 | **Google Drive** | `search_files`, `read_file_content`, `create_file` | Leer material aportado por la clienta (bio de Claudia, fotos, documentos de servicios) |
| 5 | **n8n** | `search_nodes`, `get_node_types`, `validate_workflow`, `create_workflow_from_code`, `execute_workflow` | **Scheduler externo de los cron jobs** si no se contrata Vercel Pro (ver `04-deployment.md`) |
| 6 | **Canva** | `generate-design`, `export-design`, `read-design` | Piezas gráficas del sitio, si la clienta las necesita |
| 7 | **Vercel** | — | ⚠️ **Requiere autorización.** Ver nota abajo |

### ⚠️ Vercel — pendiente de autorizar

El MCP server de Vercel está configurado pero **no autorizado**, así que sus herramientas no se
pueden usar todavía. Para habilitarlo, el usuario debe autorizar el conector desde la
**configuración de conectores de claude.ai**. Hasta entonces, el deploy se gestiona manualmente
desde el dashboard de Vercel o con la CLI (`vercel`).

---

## Skills Activas Relevantes para Este Proyecto

| # | Nombre | Tipo | Descripción | Usar cuando |
|---|--------|------|-------------|-------------|
| 1 | `claude-api` | Skill | Referencia oficial de la API de Claude: modelos vigentes, precios, streaming, tool use, caching | **Obligatoria antes de tocar `src/lib/ai/`.** No escribir código de Anthropic de memoria |
| 2 | `security-review` | Skill | Revisión de seguridad de los cambios pendientes | Antes de cada merge que toque pagos, RLS, credenciales o el intake |
| 3 | `simplify` | Skill | Revisa reuso, simplificación y eficiencia del código cambiado | Al cerrar una feature, antes de documentar |
| 4 | `review` | Skill | Revisión de un pull request de GitHub | Al revisar PRs |
| 5 | `run` | Skill | Levanta la app y verifica un cambio en la app real | Para comprobar visualmente una pantalla nueva |
| 6 | `dataviz` | Skill | Guía de diseño de gráficos y dashboards accesibles | Al construir las métricas del panel admin (FASE 7) |
| 7 | `n8n-workflow-patterns` | Skill | Patrones de arquitectura de workflows en n8n | Si se implementa el scheduler externo de cron |
| 8 | `n8n-mcp-tools-expert` | Skill | Uso correcto de las herramientas MCP de n8n | Ídem |
| 9 | `update-config` | Skill | Configura el harness vía `settings.json` (hooks, permisos) | Para automatizar validaciones locales |
| 10 | `schedule` / `loop` | Skill | Agentes en cron / tareas recurrentes | Tareas de mantenimiento programadas |

---

## Cómo se Aplican a Este Proyecto

| Feature | Skill / MCP a usar primero |
|---------|---------------------------|
| Guardar los leads del diagnóstico (FASE 6) | MCP **Supabase**: `apply_migration` para la tabla `leads` → `get_advisors` → `generate_typescript_types` |
| Correo del lead a Claudia (FASE 6) | MCP **Gmail**: `create_draft` para diseñar la plantilla antes de automatizarla |
| Crear el proyecto y las tablas en Supabase | MCP **Supabase**: `create_project` → `apply_migration` → `generate_typescript_types` |
| Verificar seguridad de RLS | MCP **Supabase**: `get_advisors` (tipo `security`) tras cada migración |
| Integración con Google Calendar | MCP **Google Calendar**: inspeccionar eventos reales antes de escribir `src/lib/google/calendar.ts` |
| Plantillas de correo | MCP **Gmail**: `create_draft` para iterar el diseño del correo antes de automatizarlo |
| Agente IA del intake | Skill **`claude-api`** (modelo, parámetros y tool use vigentes) |
| Cron de recordatorios sin Vercel Pro | MCP **n8n** + skill `n8n-workflow-patterns` |
| Antes de cerrar features de pago/PII | Skill **`security-review`** |

---

## Protocolo de Skills

1. **Antes de implementar una feature** → leer este archivo y usar la skill/MCP que aplique.
2. **Al instalar una skill nueva** → agregar fila con: nombre, qué hace, cuándo usarla, ejemplo.
3. **Si no existe una skill pero sería útil** → sugerir al usuario:
   ```
   SUGERENCIA: Para implementar [funcionalidad], podría ser útil instalar
   una skill de [tipo]. ¿Querés que busque si hay una disponible?
   ```
4. **Precaución con MCP en producción:** `execute_sql` y `apply_migration` escriben **directo** en el
   proyecto remoto de Supabase. Usarlos solo contra el proyecto de desarrollo salvo autorización
   explícita (Ley 4 — Seguridad).

---

## Historial de Skills

| Fecha | Acción | Skill / MCP | Motivo |
|-------|--------|-------------|--------|
| 2026-08-02 | Registrado | Supabase MCP | Base de datos del proyecto |
| 2026-08-02 | Registrado | Google Calendar MCP | Agendamiento — integración central del flujo |
| 2026-08-02 | Registrado | Gmail MCP | Notificaciones al cliente y al administrador |
| 2026-08-02 | Registrado | Google Drive MCP | Material aportado por la clienta |
| 2026-08-02 | Registrado | n8n MCP | Scheduler externo alternativo a Vercel Cron |
| 2026-08-02 | Registrado | Canva MCP | Piezas gráficas |
| 2026-08-02 | Pendiente | Vercel MCP | **Requiere autorización del usuario** |
| 2026-08-02 | Registrado | Skill `claude-api` | Referencia obligatoria para el agente IA |
| 2026-08-02 | Registrado | Skill `security-review` | Auditoría de pagos, RLS y PII |
| 2026-08-02 | Usado | Supabase MCP `list_projects` | FASE 2: verificar si existía proyecto para Leos Firm (no existe → catálogo en constantes) |
| 2026-08-03 | No usado | Supabase / Gmail MCP | FASE 3: el diagnóstico no persiste ni envía correo todavía; ambos MCP se usan en la FASE 6 |

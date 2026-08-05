# Documentación de Features

Un archivo `.md` por funcionalidad. **Se crea ANTES de escribir el código** (Método AInnovate,
FASE 2.1) y se actualiza al terminar.

## Features documentadas

| Doc | Feature | Estado |
|-----|---------|--------|
| [`public-site.md`](./public-site.md) | Sitio público: portada, catálogo, detalle, Claudia, FAQ, políticas | ✅ Completo |
| [`lead-diagnostic.md`](./lead-diagnostic.md) | Diagnóstico interactivo en popup y captación de leads | ✅ Completo |
| [`crm-sheets.md`](./crm-sheets.md) | CRM en Google Sheets vía n8n | ✅ **En producción** |
| [`scheduling.md`](./scheduling.md) | Agendamiento con calendario propio sobre Google Calendar | 📐 Diseñado — FASE 5 |
| [`payments.md`](./payments.md) | Checkout con Square, webhook y confirmación de la cita | 📐 Diseñado — FASE 6 |

## Ciclo de cada feature

```
0. Verificar skills  →  1. Documentar  →  2. Codear  →  3. Actualizar docs
   (docs/SKILLS.md)      (este archivo)                   (8 checkpoints)
```

## Plantilla

```markdown
# Feature: [Nombre]

> **Estado:** En desarrollo | Parcial | Completo
> **Archivos clave:** [lista]
> **Dependencias:** [librerías o servicios externos]

## Descripción
[Qué hace y para quién — 2-3 oraciones]

## Objetivo
[Qué problema resuelve]

## Modelo de Datos
[Dónde viven los datos — hoy: hoja de Google vía n8n]

## Flujo de Uso
1. El usuario hace X
2. El sistema hace Y

## Componentes / Archivos
| Archivo | Responsabilidad |
|---------|----------------|

## API / Endpoints
| Método | Ruta | Descripción |
|--------|------|-------------|

## Skills Utilizadas
| Skill | Cómo se usó |
|-------|------------|

## Restricciones
- [Regla que NUNCA se debe romper]

## Pendiente
- [ ] [Cosa que falta]
```

## Features planificadas (ver `docs/00-roadmap.md`)

> ⚠️ Esta tabla se rehízo el 2026-08-05 tras el replanteo del bloque B (ADR-009, ADR-010).
> Varios docs que aparecían aquí ya no existirán: `booking-ui.md`, `leads-backend.md`,
> `ai-intake.md` y `dashboard.md` se cancelaron con las fases que los pedían.

| Fase | Feature | Doc |
|------|---------|-----|
| 5 | Agendamiento: calendario propio | ✅ `scheduling.md` (escrito) |
| 6 | Checkout con Square + webhook | ✅ `payments.md` (escrito) |
| 7 | Correos de confirmación y recordatorio por n8n | `notifications.md` |
| 9 | Gestión de la cita con token (ver / reprogramar / cancelar) | `appointment-management.md` |
| 10 | Enlace de calendario para referidos | `referrals.md` |
| 11 | Resumen IA post-cita + propuestas | `post-meeting.md` |

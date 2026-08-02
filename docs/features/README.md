# Documentación de Features

Un archivo `.md` por funcionalidad. **Se crea ANTES de escribir el código** (Método AInnovate,
FASE 2.1) y se actualiza al terminar.

## Features documentadas

| Doc | Feature | Estado |
|-----|---------|--------|
| [`public-site.md`](./public-site.md) | Sitio público: portada, catálogo, detalle, Claudia, FAQ, políticas | ✅ Completo |

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
[Tablas y campos — detalle en docs/DB_SCHEMA.md]

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

## Features planificadas (ver `docs/01-project-overview.md`)

| Fase | Feature | Doc esperado |
|------|---------|--------------|
| 2 | Sitio público (home, servicios, sobre Claudia, FAQ) | ✅ `public-site.md` |
| 3 | Checkout con Square + webhook | `payments.md` |
| 4 | Agente IA + intake form | `intake.md` |
| 5 | Google Calendar + Meet | `scheduling.md` |
| 6 | Notificaciones por Gmail | `notifications.md` |
| 7 | CRM + panel admin + estados | `dashboard.md` |
| 8 | Enlace de calendario para referidos | `referrals.md` |
| 9 | Resumen IA post-cita + propuestas | `post-meeting.md` |

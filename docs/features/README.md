# Documentación de Features

Un archivo `.md` por funcionalidad. **Se crea ANTES de escribir el código** (Método AInnovate,
FASE 2.1) y se actualiza al terminar.

## Features documentadas

| Doc | Feature | Estado |
|-----|---------|--------|
| [`public-site.md`](./public-site.md) | Sitio público: portada, catálogo, detalle, Claudia, FAQ, políticas | ✅ Completo |
| [`lead-diagnostic.md`](./lead-diagnostic.md) | Diagnóstico interactivo en popup y captación de leads | ✅ Completo (entrega en FASE 6) |

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

## Features planificadas (ver `docs/00-roadmap.md`)

| Fase | Feature | Doc esperado |
|------|---------|--------------|
| 2 | Sitio público (home, servicios, sobre Claudia, FAQ) | ✅ `public-site.md` |
| 3 | Diagnóstico interactivo + captación de leads | ✅ `lead-diagnostic.md` |
| 4 | Front end de agendamiento y pago (intake §7, calendario, pago) | `booking-ui.md` |
| 6 | Supabase + entrega real del lead (correo a Claudia) | `leads-backend.md` |
| 7 | Checkout con Square + webhook | `payments.md` |
| 8 | Google Calendar + Meet | `scheduling.md` |
| 9 | Notificaciones por Gmail | `notifications.md` |
| 10 | Agente IA en el intake | `ai-intake.md` |
| 11 | CRM + panel admin + estados | `dashboard.md` |
| 12 | Enlace de calendario para referidos | `referrals.md` |
| 13 | Resumen IA post-cita + propuestas | `post-meeting.md` |

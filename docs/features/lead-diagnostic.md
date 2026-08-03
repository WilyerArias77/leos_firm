# Feature: Diagnóstico Interactivo y Captación de Leads

> **Estado:** ✅ Completo (front end) — la entrega del lead se conecta en FASE 6
> **Fase:** 3 · Última actualización: 2026-08-03
> **Archivos clave:** `src/components/features/diagnostic/**`, `src/services/diagnostic.service.ts`,
> `src/services/lead.service.ts`, `src/app/api/v1/leads/route.ts`, `src/constants/content/diagnostic.ts`
> **Dependencias:** ninguna nueva (`zod` y `lucide-react` ya instalados)

---

## Descripción

Un **popup de diagnóstico** que aparece cuando el visitante lleva unos segundos viendo un servicio.
Hace 3 preguntas tipo filtro, deduce qué servicio corresponde a su caso, pide sus datos de contacto
y recién entonces lo empuja al pago (si el servicio tiene cobro automático) o lo pasa a Claudia
(si el servicio es de precio variable).

El popup **no tiene X**. Se cierra únicamente con uno de sus dos botones:

1. **"Quiero mi diagnóstico gratuito"** → inicia el cuestionario.
2. **"No quiero mi diagnóstico gratuito, solo estoy viendo"** → lo descarta por esa sesión.

## Objetivo

**Capturar el dato antes del pago, no después.**

El flujo original ponía el formulario de ingreso *después* del cobro. Eso significaba que todo
visitante que llegaba hasta la pantalla de pago y no completaba la compra se perdía sin dejar
rastro: sin nombre, sin correo, sin teléfono, sin forma de recuperarlo. Con el diagnóstico primero,
la firma se queda con el contacto **aunque el visitante no pague**, y el visitante recibe algo de
valor a cambio del dato (saber qué servicio necesita).

Efecto secundario buscado: el cliente deja de tener que adivinar cuál de los 8 servicios le
corresponde. El diagnóstico lo decide por él.

> Este cambio de flujo está registrado como **ADR-008** en [`../02-architecture.md`](../02-architecture.md).

## Modelo de Datos

Nueva tabla **`leads`** (diseñada en [`../DB_SCHEMA.md`](../DB_SCHEMA.md), aplicada en FASE 6).
Un lead es un contacto capturado **sin pago**: es la entrada del CRM, anterior a `clients`.

Mapeo entre las respuestas del diagnóstico y las columnas:

| Respuesta del diagnóstico | Columna |
|---------------------------|---------|
| Pregunta 1 (`situacion`) | `situation` + `has_us_entity` (derivado) |
| Pregunta 2 (`objetivo-*`) | `need` |
| Pregunta 3 (`urgencia`) | `urgency` |
| Servicio deducido | `recommended_service_slug` |
| Rama del resultado | `outcome` (`checkout` \| `contact`) |
| Datos de contacto | `full_name`, `email`, `phone`, `country` |
| Casilla de autorización | `consent_at` + `consent_ip` |

`has_us_entity` se deriva de la primera respuesta, así el lead ya trae respondida la pregunta
bisagra del intake de `context.md` §7 y no se le vuelve a preguntar más adelante.

## Flujo de Uso

```
Visitante entra a /servicios/[slug]
   │
   ├─ lee la página (10 s o 30 % de scroll)
   ▼
POPUP (sin X)
   ├─ "No quiero mi diagnóstico…" → se cierra, no vuelve a abrirse en la sesión. FIN
   └─ "Quiero mi diagnóstico gratuito"
        ▼
   P1 ¿En qué punto estás?  →  P2 ¿Qué necesitas resolver?  →  P3 ¿Para cuándo?
        (cada respuesta devuelve una observación inmediata: sensación de asesoría en vivo)
        ▼
   Datos de contacto (nombre · correo · teléfono · país · autorización)
        ▼
   POST /api/v1/leads   ← el dato ya está capturado en este punto
        ▼
   RESULTADO — "Según lo que nos contaste, necesitas: [servicio]"
        │
        ├─ servicio CON cobro automático  →  pagar y agendar (FASE 7)
        └─ servicio SIN cobro automático  →  correo a Claudia con los datos + el servicio (FASE 6)
```

**Regla clave:** el lead se envía **antes** de mostrar el resultado. Si el visitante cierra la
pestaña al ver la recomendación, la firma ya tiene sus datos.

### Las dos ramas del resultado

La rama **no se decide a mano ni se hardcodea**: sale de `priceCents` del catálogo.

| Servicio | `priceCents` | Rama |
|----------|-------------|------|
| Consultoría fiscal para empresarios extranjeros | `15000` | `checkout` — cobro automático |
| Elecciones fiscales | `25000` | `checkout` — cobro automático |
| Los otros 6 | `null` | `contact` — correo a Claudia |

Motivo: Claudia **no tiene todavía** la información necesaria para automatizar el cobro de los otros
6 servicios (precios variables y cobro por otra infraestructura). El día que la tenga, basta poner
el precio en el catálogo y ese servicio pasa solo a la rama de cobro automático. Cero cambios de
código.

## Componentes / Archivos

| Archivo | Responsabilidad |
|---------|----------------|
| `src/types/diagnostic.types.ts` | `DiagnosticQuestion`, `DiagnosticOption`, `DiagnosticStep`, `DiagnosticRecommendation`, `DiagnosticContact` |
| `src/constants/content/diagnostic.ts` | Textos del popup y **árbol de preguntas** (contenido, no lógica) |
| `src/services/diagnostic.service.ts` | Recorre el árbol, deduce el servicio y la rama. **Sin React, sin fetch** |
| `src/services/lead.service.ts` | Envía el lead al endpoint desde el navegador |
| `src/lib/validation/lead.schema.ts` | Esquema Zod **compartido** cliente ↔ servidor + tipo `LeadPayload` inferido |
| `src/lib/utils/formatCurrency.ts` | `formatPrice` — movido aquí para que lo use el popup sin arrastrar la capa de datos |
| `src/lib/utils/rateLimit.ts` | Límite por IP en memoria para el endpoint público |
| `src/app/api/v1/leads/route.ts` | `POST /api/v1/leads` — valida, limita y registra el lead |
| `src/components/ui/Modal` | Modal accesible sobre `<dialog>`; soporta modo **no descartable** |
| `src/components/ui/Input` | Campo de formulario con label, error y `aria-describedby` |
| `.../diagnostic/DiagnosticDialog/DiagnosticDialog.tsx` | Máquina de estados: intro → preguntas → contacto → resultado |
| `.../DiagnosticDialog/DiagnosticIntro.tsx` | Resumen del servicio + los 2 botones |
| `.../DiagnosticDialog/DiagnosticQuestionStep.tsx` | Una pregunta + hilo de observaciones previas |
| `.../DiagnosticDialog/DiagnosticContactStep.tsx` | Datos de contacto + autorización |
| `.../DiagnosticDialog/DiagnosticResult.tsx` | Diagnóstico y CTA según la rama |
| `.../diagnostic/DiagnosticTrigger/` | Monta el diálogo y decide cuándo abrirlo. **Reutilizable** |
| `src/hooks/useDiagnosticPrompt.ts` | Cuándo abrir, cuándo no volver a molestar |

### Por qué el `DiagnosticTrigger` está separado del `DiagnosticDialog`

Para poder desplegarlo desde la portada sin tocar el diálogo (requisito del usuario: *"el formulario
interactivo que en un futuro podrá desplegarse desde la página principal"*). El trigger acepta:

```tsx
<DiagnosticTrigger
  services={services}          // catálogo completo (viene del Server Component)
  contextService={service}     // servicio que se está viendo, o null
  autoOpen                     // false en el catálogo, true en el detalle
/>
```

Montarlo en la portada es una línea. No requiere cambios en esta feature.

## API / Endpoints

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| POST | `/api/v1/leads` | Registra un lead del diagnóstico | Pública + rate limit |

Detalle completo en [`../API_DOCS.md`](../API_DOCS.md).

## Skills Utilizadas

| Skill / MCP | Cómo se usó |
|-------------|------------|
| Documentación local de Next.js | `node_modules/next/dist/docs/` — `await headers()` en Route Handlers (Next 16) |
| MCP Supabase | **No se usó**: no existe proyecto para Leos Firm. La tabla `leads` queda diseñada, no aplicada |
| MCP Gmail | **No se usó todavía**: el correo a Claudia se implementa en FASE 6 con la Gmail API real |

## Accesibilidad

Un modal sin botón de cierre es, en general, una mala práctica. Aquí es aceptable **solo porque**:

- Existe una salida explícita y visible: el botón de rechazo, que es un `<button>` real, enfocable
  y anunciado por lector de pantalla.
- El diálogo usa `<dialog showModal()>`: el navegador aporta trampa de foco correcta, `inert` en el
  resto de la página y rol `dialog` nativo.
- `Esc` está deshabilitado a propósito (`onCancel` → `preventDefault`). **No** constituye una trampa
  de teclado porque la salida por botón está a un `Tab` de distancia.
- El popup aparece **una sola vez por sesión**. Si se rechaza, no vuelve.

## Restricciones

- **No inventar contenido fiscal.** Las observaciones que devuelve cada respuesta son operativas
  ("lo marcamos como prioritario"), nunca afirmaciones fiscales o legales. Los textos de servicio
  salen del catálogo, que sale de `context.md`.
- **La rama se deriva del catálogo** (`priceCents`), nunca de una lista de slugs hardcodeada.
- **El lead se envía antes del resultado.** No al revés.
- **Validación en las dos puntas** con el mismo esquema Zod. La del cliente es UX; la del servidor
  es la que manda (`03-security.md`).
- **Nada de PII en los logs de producción** (`03-security.md` §PII).
- **El popup no simula un pago que no existe.** Mientras el checkout no esté implementado, el
  resultado de la rama `checkout` lo dice con todas sus letras y ofrece el teléfono de la firma.
- **Ningún color arbitrario** — solo tokens de `globals.css`.

## Pendiente

- [ ] **FASE 6 — Entregar el lead de verdad:** tabla `leads` en Supabase + correo a Claudia por
      Gmail API. Hoy el endpoint valida y responde `201`, pero **no persiste ni envía**: registra
      en el log del servidor (sin PII en producción) y devuelve `delivery: "pending"`.
      ⚠️ **El sitio no debe publicarse hasta cerrar este punto**, o los leads se pierden.
- [ ] **FASE 7 — Conectar la rama `checkout`** con `/agendar` (Square). Hoy el resultado explica
      que el pago en línea todavía no está activo.
- [ ] Desplegar el trigger en la portada (una línea, cuando la clienta lo apruebe).
- [ ] Precargar el intake completo (`context.md` §7) con los datos del lead, para no volver a
      preguntar lo mismo.
- [ ] Métrica de conversión del popup (visto / iniciado / completado / rechazado) — panel admin.

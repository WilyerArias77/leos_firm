# Feature: Diagnóstico Interactivo y Captación de Leads

> **Estado:** ✅ Completo — el lead se entrega de verdad al CRM
> **Fase:** 3 (popup) + 4 (entrega) · Última actualización: 2026-08-04
> **Archivos clave:** `src/components/features/diagnostic/**`, `src/services/diagnostic.service.ts`,
> `src/services/lead.service.ts`, `src/app/api/v1/leads/route.ts`, `src/constants/content/diagnostic.ts`
> **Dependencias:** ninguna nueva (`zod` y `lucide-react` ya instalados)
> **Ver también:** [`crm-sheets.md`](./crm-sheets.md) — a dónde va el lead

---

## Descripción

Un **popup de diagnóstico** que aparece cuando el visitante lleva unos segundos viendo un servicio.
Hace 3 preguntas tipo filtro, deduce qué servicio corresponde a su caso, pide sus datos de contacto
y recién entonces lo empuja a agendar y pagar.

> **Cambio del 2026-08-04 (ADR-009): se acabaron las dos ramas.** Hasta ese día el resultado se
> bifurcaba: los dos servicios con precio iban al checkout y los otros seis terminaban en un correo a
> Claudia. Ahora los ocho tienen precio, así que **todos** siguen el mismo camino. `DiagnosticOutcome`
> y `getOutcome()` fueron eliminados: no queda nada que decidir.

El popup se cierra de tres maneras, todas equivalentes para esta visita:

1. **"Quiero acceder al servicio"** → inicia el cuestionario.
2. **"No quiero mi diagnóstico gratuito, solo estoy viendo"** → lo descarta por esa sesión.
3. **La X de la esquina** (o `Esc`, o el botón *"Cerrar el formulario y seguir navegando"* del paso
   de contacto) → lo cierra desde **cualquier** paso y deja seguir navegando.

> **Cambio del 2026-08-03 — el popup ahora sí tiene X.** El diseño original no la tenía, por pedido
> expreso de la clienta: se buscaba reducir los abandonos por reflejo. La misma clienta pidió
> después la salida explícita en todos los pasos, y esa decisión gana. La conversión ya no se
> defiende encerrando al visitante en el modal, sino con el valor del diagnóstico.
> Las tres salidas escriben la misma marca de sesión (`sessionStorage`): el popup no vuelve a
> abrirse solo durante esa visita, pero sigue disponible desde los botones de las páginas.

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

El lead se escribe como una **fila de la hoja de Google** — no en una tabla. Las columnas y el
contrato completo están en [`crm-sheets.md`](./crm-sheets.md). Lo que aporta este popup:

| Respuesta del diagnóstico | Campo del CRM |
|---------------------------|---------------|
| Pregunta 1 (`situacion`) | `p1_situacion` + `has_us_entity` (derivado) |
| Pregunta 2 (`objetivo-*`) | `p2_objetivo` |
| Pregunta 3 (`urgencia`) | `p3_urgencia` |
| Servicio deducido | `recommended_service` + `recommended_service_slug` |
| Datos de contacto | `full_name`, `email`, `phone`, `country` |
| Casilla de autorización | `consent_at` + `consent_ip` |
| — | `lead_id`, acuñado por el navegador; es la clave de la fila |

`has_us_entity` se deriva de la primera respuesta, así el lead ya trae respondida la pregunta
bisagra de `context.md` §7 y no se le vuelve a preguntar al agendar.

## Flujo de Uso

```
Visitante entra a /servicios/[slug]
   │
   ├─ lee la página (10 s o 30 % de scroll)
   ▼
POPUP (con X en todos los pasos)
   ├─ "No quiero mi diagnóstico…" / X / Esc → se cierra, no vuelve a abrirse en la sesión. FIN
   └─ "Quiero acceder al servicio"
        ▼
   P1 ¿En qué punto estás?  →  P2 ¿Qué necesitas resolver?  →  P3 ¿Para cuándo?
        (cada respuesta devuelve una observación inmediata: sensación de asesoría en vivo)
        ▼
   Datos de contacto (nombre · correo · teléfono · país · autorización)
        ▼
   POST /api/v1/leads  →  n8n  →  Google Sheets (stage=formulario)
        ▼                            ← el dato ya está guardado en este punto
   RESULTADO — "Según lo que nos contaste, necesitas: [servicio]"
        ▼
   Agendar y pagar  (mismo camino para los 8 servicios)
```

**Regla clave:** el lead se envía **antes** de mostrar el resultado. Si el visitante cierra la
pestaña al ver la recomendación, la firma ya tiene sus datos.

### El precio que se muestra

Sale del catálogo, y su lectura depende de `pricingModel` (ADR-009):

| Servicio | Precio | `pricingModel` | Qué dice la pantalla |
|----------|--------|----------------|---------------------|
| Consultoría fiscal para empresarios extranjeros | $150 | `full-service` | "Precio cerrado del servicio" |
| Elecciones fiscales | $250 | `full-service` | "Precio cerrado del servicio" |
| Los otros 6 | $50 | `deposit` | "Abono al total · Este pago aparta tu cita y se descuenta completo del costo del servicio. No es el precio del servicio: Claudia te dice cuánto es durante la llamada, porque el costo depende de tu caso." |

El texto sale de `PRICING_COPY` (`src/constants/content/services.ts`), nunca del JSX: la clienta
puede reformular qué significa el cobro sin que nadie toque un componente.

### Cambio de textos del 2026-08-06

- **El antetítulo ya no dice "gratuito":** `DIAGNOSTIC_COPY.eyebrow` pasó de *"Diagnóstico gratuito"*
  a *"Accede a tu diagnóstico"*. Lo leen el popup (`DiagnosticIntro`) y la tarjeta del `aside` de
  `/servicios/[slug]`, que hasta ahora lo tenía escrito a mano.
- **`DIAGNOSTIC_COPY.teaser` es nuevo:** *"Responde estas preguntas y te indicaremos a qué corresponde
  tu caso y cuál es el siguiente paso"*. Sustituye a los dos textos que contaban las preguntas en voz
  alta —el de la tarjeta del servicio y el del atajo de `/servicios`— y los unifica en una constante.
- **La tarjeta del servicio perdió el botón del teléfono** y en su lugar muestra `DEPOSIT_NOTICE`
  ([`public-site.md`](./public-site.md) § *Cambios de contenido*).

> El teléfono **sigue** en la pantalla de resultado del popup (`DiagnosticResult`): ahí no es un CTA
> alternativo sino la vía de recuperación cuando el CRM no aceptó el lead (`delivery === "failed"`), y
> quitarlo dejaría ese caso sin salida. Si la clienta lo quiere fuera también de ahí, hay que decidir
> primero con qué se reemplaza esa recuperación.

## Componentes / Archivos

| Archivo | Responsabilidad |
|---------|----------------|
| `src/types/diagnostic.types.ts` | `DiagnosticQuestion`, `DiagnosticOption`, `DiagnosticStep`, `DiagnosticContact` |
| `src/constants/content/diagnostic.ts` | Textos del popup y **árbol de preguntas** (contenido, no lógica) |
| `src/services/diagnostic.service.ts` | Recorre el árbol y deduce el servicio. **Sin React, sin fetch** |
| `src/services/lead.service.ts` | Acuña el `leadId`, lo guarda en `sessionStorage` y envía el lead |
| `src/services/crm.service.ts` | Arma la fila del CRM en el servidor ([`crm-sheets.md`](./crm-sheets.md)) |
| `src/lib/validation/lead.schema.ts` | Esquema Zod **compartido** cliente ↔ servidor + tipo `LeadPayload` inferido |
| `src/lib/utils/formatCurrency.ts` | `formatPrice` — movido aquí para que lo use el popup sin arrastrar la capa de datos |
| `src/lib/utils/rateLimit.ts` | Límite por IP en memoria para el endpoint público |
| `src/app/api/v1/leads/route.ts` | `POST /api/v1/leads` — valida, limita y registra el lead |
| `src/components/ui/Modal` | Modal accesible sobre `<dialog>`; botón de cierre opcional (`onDismiss`) y modo **no descartable** para otros usos |
| `src/components/ui/Input` | Campo de formulario con label, error y `aria-describedby` |
| `.../diagnostic/DiagnosticDialog/DiagnosticDialog.tsx` | Máquina de estados: intro → preguntas → contacto → resultado |
| `.../DiagnosticDialog/DiagnosticIntro.tsx` | Resumen del servicio + los 2 botones |
| `.../DiagnosticDialog/DiagnosticQuestionStep.tsx` | Una pregunta + hilo de observaciones previas |
| `.../DiagnosticDialog/DiagnosticContactStep.tsx` | Datos de contacto + autorización |
| `.../DiagnosticDialog/DiagnosticResult.tsx` | Diagnóstico y CTA según la rama |
| `.../diagnostic/DiagnosticTrigger/` | Monta el diálogo y decide cuándo abrirlo. **Reutilizable** |
| `src/hooks/useDiagnosticPrompt.ts` | Cuándo abrir, cuándo no volver a molestar (`dismiss` cubre rechazo, X y `Esc`) |

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

Desde el 2026-08-03 el modal cumple el patrón estándar y ya no necesita justificación especial:

- **Botón de cierre en todos los pasos** (X arriba a la derecha), con nombre accesible
  *"Cerrar el formulario y seguir navegando"*. El paso de contacto repite esa salida como botón de
  texto, debajo del envío.
- **`Esc` cierra** el diálogo (`dismissible` en `Modal`).
- El diálogo usa `<dialog showModal()>`: el navegador aporta trampa de foco correcta, `inert` en el
  resto de la página y rol `dialog` nativo.
- El **foco inicial va al panel** (`tabIndex={-1}` + `autoFocus`), no a la X: el lector de pantalla
  anuncia el diálogo por su título y no aparece un anillo de foco al abrir. `Tab` lleva a la X.
- Los pasos reservan `pt-16` para que la X **nunca** se superponga a la barra de avance.
- El popup aparece **una sola vez por sesión**. Si se cierra o se rechaza, no vuelve solo.

## Restricciones

- **No inventar contenido fiscal.** Las observaciones que devuelve cada respuesta son operativas
  ("lo marcamos como prioritario"), nunca afirmaciones fiscales o legales. Los textos de servicio
  salen del catálogo, que sale de `context.md`.
- **El precio se deriva del catálogo**, nunca de una lista de slugs hardcodeada.
- **Nunca vender el $50 como el precio del servicio.** Es una consulta inicial que se abona al total,
  y la pantalla tiene que decirlo (ADR-009).
- **El lead se envía antes del resultado.** No al revés.
- **Validación en las dos puntas** con el mismo esquema Zod. La del cliente es UX; la del servidor
  es la que manda (`03-security.md`).
- **Nada de PII en los logs de producción** (`03-security.md` §PII).
- **El popup no simula un pago que no existe.** Mientras el checkout no esté implementado, el
  resultado de la rama `checkout` lo dice con todas sus letras y ofrece el teléfono de la firma.
- **El visitante siempre puede salir.** Cerrar el popup no puede bloquear la navegación ni volver a
  abrirlo automáticamente en la misma sesión.
- **Los textos de los botones viven en `DIAGNOSTIC_COPY`**, nunca sueltos en el JSX: la clienta los
  cambia sin tocar componentes.
- **Ningún color arbitrario** — solo tokens de `globals.css`.

## Pendiente

- [ ] **Dos textos siguen diciendo "gratuito" y siguen contando 3 preguntas**, y el cambio del
      2026-08-06 no los tocó porque la clienta los pidió palabra por palabra en su momento:
      `DIAGNOSTIC_COPY.declineLabel` (*"No quiero mi diagnóstico gratuito, solo estoy viendo"*) y los
      dos `introBody*` del popup (*"Son 3 preguntas rápidas…"*). Decisión de la clienta.
      El tercero —el `label` del `DiagnosticTrigger` de `/servicios`— ya se resolvió: pasó a
      **"Agendar consultoría"**, heredando el texto del CTA que se quitó del encabezado
- [x] ~~Entregar el lead de verdad~~ — cerrado el 2026-08-04: va al CRM de Google Sheets vía n8n.
- [ ] **FASE 5 — Conectar el botón "Agendar y pagar"** con `/agendar`. Hoy el resultado dice con
      todas sus letras que la agenda en línea todavía no está activa y ofrece el teléfono.
- [ ] Desplegar el trigger en la portada (una línea, cuando la clienta lo apruebe).
- [ ] Métrica de conversión del popup (visto / iniciado / completado / rechazado) — se puede resolver
      con una segunda pestaña de la hoja, sin panel.

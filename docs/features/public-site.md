# Feature: Sitio Público

> **Estado:** ✅ Completo — 6 páginas en línea, 18 rutas
> **Fase:** 2 · Última actualización: 2026-08-03 (material audiovisual de Claudia + logo más grande)
> **Archivos clave:** `src/app/(public)/**`, `src/components/layout/**`, `src/components/ui/**`, `src/constants/content/**`
> **Dependencias:** ninguna nueva (solo `next/image`, `next/link`, `<video>` nativo y `lucide-react` ya instalado)

---

## Descripción

Las páginas públicas de leosfirm.com: portada, catálogo de servicios, detalle de cada servicio,
storytelling de Claudia Leos, preguntas frecuentes y política de cancelación. Es la capa de
captación — todo su contenido empuja hacia una sola acción: **agendar y pagar una consultoría**.

## Objetivo

Que un empresario que llega por primera vez entienda en menos de un minuto qué hace la firma, por
qué Claudia es distinta (perfil bicultural México–EE. UU.) y cómo contratar. Sin esta capa, el flujo
de pago y agendamiento de FASE 3–5 no tiene puerta de entrada.

## Fuente del contenido

**Todo** el texto proviene de [`context.md`](../../context.md). No se inventa contenido
(Mandamiento I). Trazabilidad:

| Sección de la UI | Origen |
|------------------|--------|
| Slogan del hero | `context.md` §1 |
| **Slogan del header** (dorado, franja superior) | **Pedido directo de la clienta, 2026-08-03** — no está en `context.md`. Vive en `COMPANY.slogan` |
| Bio, diferenciador y storytelling de Claudia | §2 |
| Misión, visión y 7 valores | §3 |
| Público objetivo | §4 |
| Catálogo de 8 servicios y precios | §5 |
| Campos del intake (mostrados como "qué necesitarás") | §7 |
| Política de cancelación (9 puntos) | §8 |
| 7 preguntas frecuentes | §9 (preguntas) + **respuestas oficiales entregadas por Claudia el 2026-08-03** |
| Dirección, teléfono, sitio | §1 |
| **Fotografía y video de presentación de Claudia** | §2 — **entregados por la firma el 2026-08-03**. Viven en `public/` y se referencian desde `FOUNDER_MEDIA` |

> Las FAQ de `context.md` §9 venían **sin respuesta** y se mostraban como pendientes en vez de
> inventarlas: son afirmaciones fiscales y legales, y una respuesta inventada sería un riesgo real
> para la firma. **Claudia entregó las 7 respuestas el 2026-08-03** y ya están publicadas.
> `FaqItem.answer` es ahora **obligatorio** (`string`, no `string | null`): el tipo impide publicar
> una pregunta sin respuesta oficial. El texto se copia literal — **no se reescribe ni se resume**.

## Modelo de Datos

El catálogo se sirve desde `src/constants/content/services.ts` con **la misma forma que la futura
tabla `services`** de [`DB_SCHEMA.md`](../DB_SCHEMA.md).

**Por qué constantes y no Supabase todavía:** aún no existe proyecto de Supabase para Leos Firm
(la cuenta tiene 2 proyectos, el límite del tier gratuito). Crear uno es una decisión con costo que
corresponde al usuario. El sitio público no necesita base de datos para funcionar.

La migración es un cambio de **una sola función**: `service.service.ts` es la única pieza que sabe
de dónde vienen los datos. Los componentes reciben el tipo `Service` y no cambian.

```
Hoy:      componentes → service.service.ts → constants/content/services.ts
FASE 3:   componentes → service.service.ts → Supabase (tabla services)
```

## Flujo de Uso

1. El cliente entra a `/` y ve el slogan, los servicios destacados y el perfil de Claudia.
2. Va a `/servicios` y compara el catálogo completo con precios. Si no sabe cuál elegir, tiene un
   atajo al **diagnóstico gratuito** (FASE 3).
3. Entra al detalle en `/servicios/[slug]`: qué incluye, precio o "requiere cotización", duración.
   A los ~10 s (o al 30 % de scroll) aparece el **popup de diagnóstico**
   ([`lead-diagnostic.md`](./lead-diagnostic.md)).
4. Deja sus datos en el diagnóstico → según el servicio, va al pago (FASE 7) o su caso llega a
   Claudia por correo (FASE 6).
5. Si duda, consulta `/sobre-claudia`, `/faq` o `/politicas` antes de decidir.

## Componentes / Archivos

| Archivo | Responsabilidad |
|---------|----------------|
| `src/app/(public)/layout.tsx` | Envuelve las páginas públicas con Header y Footer |
| `src/app/(public)/page.tsx` | Portada |
| `src/app/(public)/servicios/page.tsx` | Catálogo completo |
| `src/app/(public)/servicios/[slug]/page.tsx` | Detalle de un servicio (`generateStaticParams`) |
| `src/app/(public)/sobre-claudia/page.tsx` | Storytelling, foto profesional, video de presentación, misión, visión y valores |
| `src/app/(public)/faq/page.tsx` | Preguntas frecuentes |
| `src/app/(public)/politicas/page.tsx` | Política de cancelación y reprogramación |
| `src/components/layout/Header` | Franja con el slogan en dorado + logo (64 px móvil / 88 px escritorio), navegación, CTA y menú móvil |
| `src/components/layout/Footer` | Contacto, enlaces legales, husos |
| `src/components/layout/Container` | Ancho máximo y padding horizontal |
| `src/components/layout/Section` | Bloque vertical con variantes de fondo |
| `src/components/ui/Button` | Botón y enlace-botón, 3 variantes |
| `src/components/ui/Card` | Superficie con borde y sombra |
| `src/components/ui/Badge` | Etiquetas de precio y modalidad |
| `src/components/features/services/ServiceCard` | Tarjeta de servicio del catálogo |
| `src/services/service.service.ts` | **Única** fuente de datos del catálogo |
| `src/constants/content/*` | Contenido literal de `context.md` |
| `src/types/content.types.ts` | `Service`, `FaqItem`, `PolicyItem`, `CompanyValue` |

## Rutas Generadas

17 rutas, todas estáticas salvo el health check:

| Ruta | Tipo |
|------|------|
| `/` | Estática |
| `/servicios` | Estática |
| `/servicios/[slug]` | SSG — 8 páginas vía `generateStaticParams` |
| `/sobre-claudia`, `/faq`, `/politicas` | Estáticas |
| `/servicios/[slug]` inexistente | `404` vía `notFound()` |

## API / Endpoints

Ninguno. Todas las páginas son Server Components que leen datos en el servidor y se prerrenderizan
como estáticas. `GET /api/v1/services` se implementará en FASE 3, cuando el catálogo viva en
Supabase y el checkout necesite consultarlo.

## Skills Utilizadas

| Skill / MCP | Cómo se usó |
|-------------|------------|
| MCP Supabase (`list_projects`) | Verificar si existía proyecto para Leos Firm — no existe, de ahí la decisión de usar constantes |
| Documentación local de Next.js | `node_modules/next/dist/docs/` para confirmar el patrón de `params` asíncronos y `PageProps` |

## Lecciones Aprendidas

**1. `Intl.NumberFormat` con locale `es-MX` y `currency: "USD"` produce `"USD 150"`, no `"$150"`.**
Al concatenar el sufijo " USD" en la UI salía **"USD 150 USD"**. Se detectó en la revisión visual,
no en el build ni en el lint — ningún chequeo automático ve un texto duplicado. `formatPrice` usa
ahora `en-US`, que devuelve `"$150"`, y la UI añade el sufijo.
→ *Formatear moneda es una decisión de locale, no de idioma de la interfaz. La UI está en español,
pero los montos son en dólares estadounidenses y se formatean como tales.*

**2. Correr `npm run build` con el servidor de desarrollo activo corrompe `.next`.**
El dev server quedó sirviendo HTML viejo y sin CSS. Además un `npm run start` anterior sobrevivió
como proceso huérfano ocupando el puerto 3000, lo que hacía que las capturas mostraran la versión
anterior mientras el servidor nuevo fallaba con `EADDRINUSE`.
→ *Antes de capturar pantallas: detener el servidor, verificar que el puerto esté libre, rebuild,
y confirmar que el HTML servido contiene el contenido nuevo antes de dar por buena una captura.*

## Restricciones

- **No inventar contenido.** Si un dato no está en `context.md`, no aparece en la web.
- **No inventar respuestas a las FAQ** — riesgo legal/fiscal real (ver Pendiente).
- **Precios en centavos**, formateados con `Intl.NumberFormat` en el punto de renderizado.
  Los servicios sin precio muestran "Requiere cotización", nunca `$0`.
- **Ningún color arbitrario.** Solo tokens de `globals.css` (Mandamiento VII).
- **Ninguna llamada a datos desde un componente**: todo pasa por `service.service.ts` (Mandamiento II).
- Los CTA de agendamiento apuntan a `/agendar`, que **aún no existe** (FASE 4) — deben comunicar que
  el agendamiento llega en una fase posterior, no simular que funciona.
- **A11Y** (FASE 4.4): toda imagen con `alt`, navegación operable con teclado, contraste ≥ 4.5:1.
  El video lleva `controls` (nunca `autoplay`) y un texto alternativo con enlace de descarga.
- **El header es `sticky`:** si cambia su altura hay que ajustar el `sticky top-*` del aside de
  `/servicios/[slug]`, o la tarjeta se mete debajo del header al hacer scroll.
- **Los medios de `public/` se sirven desde el repo.** Solo vale para archivos livianos; lo pesado
  va a Storage o CDN.

## FASE 8 — Cierre de front end (2026-08-06)

Cinco archivos nuevos, todos en la raíz de `app/` porque son los que Next.js resuelve por convención.

| Archivo | Qué resuelve |
|---|---|
| `not-found.tsx` | 404 con las tres salidas que existen: catálogo, FAQ y teléfono |
| `error.tsx` | 500 dentro del layout público, con botón de reintento (`reset`) |
| `global-error.tsx` | El fallo del propio layout raíz. Trae su `<html>` y `<body>` |
| `robots.ts` | `/robots.txt` |
| `sitemap.ts` | `/sitemap.xml`, con los 8 servicios leídos del catálogo |

Más `src/constants/site.ts` (`SITE_URL`), y en el layout público un **skip link**.

**Tres decisiones que no son obvias:**

1. **`not-found.tsx` va en la raíz, no en `(public)/`, y dibuja el Header y el Footer a mano.** Una URL
   que no coincide con ninguna ruta nunca entra en un grupo, así que un `not-found` dentro de
   `(public)` no la vería y el layout de ese grupo no está en el árbol. `error.tsx` es al contrario:
   sí vive dentro del layout, así que **no** repite el chrome — hacerlo mostraría dos cabeceras.

2. **`global-error.tsx` no importa nada de `@/components` ni de `@/constants`.** Si un módulo falla al
   evaluarse, puede ser justo la razón por la que se está renderizando: el respaldo de una página rota
   no puede romperse igual. Por eso el teléfono está escrito a mano ahí — la única duplicación
   deliberada del proyecto.

3. **`SITE_URL` se centraliza porque ya tenía tres lectores** (`metadataBase`, `robots`, `sitemap`) con
   el mismo fallback copiado, y un cuarto indirecto que es el que muerde: el HMAC del webhook de Square
   se calcula sobre `notificationUrl + rawBody`, así que un carácter de diferencia invalida **todas**
   las firmas ([`payments.md`](./payments.md)).

**Qué se excluye del `sitemap` y del indexado, a propósito:** `/agendar` (solo significa algo con un
lead y un slot retenido), `/agendar/cita/*` (lleva el token de acceso del visitante en la URL —
indexarlo lo publicaría), `/api/*` y `/dashboard`.

**Accesibilidad revisada:** las dos `<Image>` tienen `alt`, `Input` asocia su `<label>` con `htmlFor`,
hay 12 `aria-label` en componentes con icono, y el skip link es ahora el primer elemento enfocable de
cada página. Lo que **no** se hizo es una auditoría con lector de pantalla ni una medición de
contraste token por token.

## Cambios de contenido pedidos por la clienta (2026-08-06)

Cuatro cambios de texto sobre la **tarjeta de diagnóstico** —la que vive en el `aside` de las 8
páginas de servicio— y un aviso nuevo en el catálogo. Ninguno toca lógica.

| Antes | Ahora | Dónde |
|---|---|---|
| Antetítulo *"Diagnóstico gratuito"* | *"Accede a tu diagnóstico"* | `DIAGNOSTIC_COPY.eyebrow` — la tarjeta y el popup lo leen del mismo sitio |
| *"Responde 3 preguntas y te decimos qué corresponde a tu caso y cuál es el siguiente paso"* | *"Responde estas preguntas y te indicaremos a qué corresponde tu caso y cuál es el siguiente paso"* | `DIAGNOSTIC_COPY.teaser` — nuevo, compartido por la tarjeta y el atajo de `/servicios` |
| Botón con el teléfono debajo del CTA | `DEPOSIT_NOTICE` en su lugar | `servicios/[slug]/page.tsx` |
| *(no existía)* | `DEPOSIT_NOTICE` arriba de la rejilla de tarjetas | `servicios/page.tsx` |

**El título "¿Es este el servicio que necesitas?" se queda tal cual**, por pedido expreso.

**Por qué el antetítulo y el teaser pasaron a `DIAGNOSTIC_COPY`.** Estaban escritos a mano en el JSX
de dos páginas distintas, así que "cambiar el título en todos los formularios" eran dos ediciones que
podían desincronizarse. Ahora es una (Mandamiento II: los textos del diagnóstico viven en
`DIAGNOSTIC_COPY`).

> ⚠️ **`DEPOSIT_NOTICE` se muestra en las 8 páginas de servicio, y solo es cierto en 6.**
> Los dos servicios `full-service` ($150 y $250) tienen **precio cerrado**: su pago no es un abono a
> nada. En sus páginas el aviso convive con `PRICING_COPY["full-service"].note` —*"Precio cerrado del
> servicio"*— y se contradicen a la vista del mismo visitante. Se implementó tal como lo pidió la
> clienta; condicionarlo a `pricingModel === "deposit"` es una línea (ver *Pendiente*).

## Pendiente

- [ ] 🔴 **`DEPOSIT_NOTICE` contradice a los dos servicios de precio cerrado.** Decisión de la
      clienta: o el aviso se limita a los 6 servicios `deposit`, o se reformula para que sea cierto
      también con $150 y $250. Hoy se muestra en los 8 (pedido literal del 2026-08-06)
- [ ] 🔴 **CONTRADICCIÓN LEGAL EN PRODUCCIÓN — ya se está cobrando.** La FAQ dice *"los pagos no son
      reembolsables"* y `context.md` §8 dice que con ≥24 h hay reembolso menos comisiones, o crédito.
      Este pendiente decía «antes de cobrar de verdad»; **ese momento ya pasó** (primer pago real el
      2026-08-06). Los dos textos le llegan al mismo cliente y se contradicen
- [ ] **Auditoría de accesibilidad de verdad**: lector de pantalla, recorrido completo por teclado del
      popup de diagnóstico y del calendario, y contraste medido. Lo hecho en la FASE 8 es la base
- [x] ~~**Respuestas de las 7 FAQ**~~ — entregadas por Claudia el 2026-08-03 y publicadas en
      `src/constants/content/faq.ts`. Ojo: la respuesta de reembolso dice *"los pagos no son
      reembolsables"*, más restrictiva que `context.md` §8 (con ≥24 h: reembolso menos comisiones o
      crédito). Hay que unificar ambos textos antes de cobrar de verdad en la FASE 7
- [x] ~~**Material audiovisual de Claudia**~~ — entregado el 2026-08-03: `public/claudia-leos.jpg`
      (retrato 4:5) y `public/claudia-leos-presentacion.mp4` (37 s, 848×480, 1.6 MB), ambos en
      `/sobre-claudia`. Si en el futuro llegan videos más pesados, hay que sacarlos del repo y
      servirlos desde Supabase Storage o un CDN, no desde `public/`
- [ ] **Métricas de impacto** (§3, valor "Impacto": respaldar con estadísticas de empresas
      atendidas) — faltan los números reales
- [ ] Textos legales definitivos (aviso de privacidad, términos) — necesarios ahora que el
      diagnóstico recoge datos personales
- [ ] `/agendar` — FASE 4
- [ ] Migrar el catálogo de constantes a la tabla `services` — FASE 6

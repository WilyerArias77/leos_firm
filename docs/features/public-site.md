# Feature: Sitio Público

> **Estado:** ✅ Completo — 6 páginas en línea, 17 rutas prerrenderizadas
> **Fase:** 2 · Última actualización: 2026-08-02
> **Archivos clave:** `src/app/(public)/**`, `src/components/layout/**`, `src/components/ui/**`, `src/constants/content/**`
> **Dependencias:** ninguna nueva (solo `next/image`, `next/link` y `lucide-react` ya instalado)

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
| Bio, diferenciador y storytelling de Claudia | §2 |
| Misión, visión y 7 valores | §3 |
| Público objetivo | §4 |
| Catálogo de 8 servicios y precios | §5 |
| Campos del intake (mostrados como "qué necesitarás") | §7 |
| Política de cancelación (9 puntos) | §8 |
| 7 preguntas frecuentes | §9 |
| Dirección, teléfono, sitio | §1 |

> Las FAQ de `context.md` §9 vienen **sin respuesta**. Se marcan como pendientes de redacción por
> Claudia en vez de inventarlas: son afirmaciones fiscales y legales, y una respuesta inventada
> sería un riesgo real para la firma. Ver [Pendiente](#pendiente).

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
2. Va a `/servicios` y compara el catálogo completo con precios.
3. Entra al detalle en `/servicios/[slug]`: qué incluye, precio o "requiere cotización", duración.
4. Pulsa **Agendar consultoría** → `/agendar?servicio=[slug]` (**FASE 3**, aún no implementado).
5. Si duda, consulta `/sobre-claudia`, `/faq` o `/politicas` antes de decidir.

## Componentes / Archivos

| Archivo | Responsabilidad |
|---------|----------------|
| `src/app/(public)/layout.tsx` | Envuelve las páginas públicas con Header y Footer |
| `src/app/(public)/page.tsx` | Portada |
| `src/app/(public)/servicios/page.tsx` | Catálogo completo |
| `src/app/(public)/servicios/[slug]/page.tsx` | Detalle de un servicio (`generateStaticParams`) |
| `src/app/(public)/sobre-claudia/page.tsx` | Storytelling, misión, visión y valores |
| `src/app/(public)/faq/page.tsx` | Preguntas frecuentes |
| `src/app/(public)/politicas/page.tsx` | Política de cancelación y reprogramación |
| `src/components/layout/Header` | Navegación + CTA, con menú móvil |
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
- Los CTA de agendamiento apuntan a `/agendar`, que **aún no existe** — deben comunicar que el
  agendamiento llega en la siguiente fase, no simular que funciona.
- **A11Y** (FASE 4.4): toda imagen con `alt`, navegación operable con teclado, contraste ≥ 4.5:1.

## Pendiente

- [ ] **Respuestas de las 7 FAQ** — las redacta Claudia; hoy se muestran con aviso de "próximamente"
- [ ] **Material audiovisual de Claudia** (`context.md` §2: video de presentación y fotos
      profesionales) — hoy hay un placeholder marcado como tal
- [ ] **Métricas de impacto** (§3, valor "Impacto": respaldar con estadísticas de empresas
      atendidas) — faltan los números reales
- [ ] Textos legales definitivos (aviso de privacidad, términos)
- [ ] `/agendar` — FASE 3
- [ ] Migrar el catálogo de constantes a la tabla `services` — FASE 3

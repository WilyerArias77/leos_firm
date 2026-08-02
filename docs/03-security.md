# Seguridad — Leos Firm LLC

> **Última actualización:** 2026-08-02
> **Lectura obligatoria** antes de tocar auth, credenciales, RLS, pagos o datos personales.

Este proyecto maneja **datos fiscales y de identidad de personas y empresas**, y **cobros con
tarjeta**. El estándar de seguridad no es negociable.

---

## Modelo de Amenazas (qué protegemos)

| Activo | Riesgo | Mitigación |
|--------|--------|------------|
| Datos del intake (nombre, país, empresa, situación fiscal) | Fuga de PII | RLS deny-by-default + acceso solo vía servidor |
| Documentos adjuntos (actas, IDs, EIN) | Descarga no autorizada | Supabase Storage bucket **privado** + signed URLs de corta vida |
| Cobros con tarjeta | Fraude / exposición PCI | Square Web Payments SDK: la tarjeta **nunca** toca nuestro servidor ni nuestra DB |
| Precios de servicios | Manipulación del monto | El precio se lee en el servidor desde `services`; el cliente solo manda `service_id` |
| Calendario de Claudia | Escritura no autorizada | Service account con scope mínimo, solo el calendario configurado |
| Enlace de cita del cliente | Enumeración de citas ajenas | `access_token` UUIDv4 aleatorio, no secuencial, revocable |
| Endpoints de cron | Ejecución externa | Header `Authorization: Bearer ${CRON_SECRET}` obligatorio |
| Webhook de Square | Confirmación falsa de pago | Verificación de firma HMAC en cada request |

---

## Autenticación

### Cliente final — SIN cuenta (ADR-001)
El cliente **no se registra**. Su cita se identifica con un `access_token` (UUID) enviado por correo:

```
https://leosfirm.com/agendar/cita/{access_token}
```

Reglas:
- El token es UUIDv4 (aleatorio, no secuencial, no derivable del email ni del id).
- Toda operación con el token pasa por un endpoint del servidor que valida vigencia y estado.
- El token **no** da acceso a ninguna otra cita ni a datos de otros clientes.
- Rate limit por IP en los endpoints que aceptan token, para impedir fuerza bruta.
- Al cancelar una cita, el token se invalida.

### Administración — Supabase Auth
- Acceso al panel `(admin)` solo con sesión válida de Supabase Auth.
- Verificación de rol en **cada** Server Component y Route Handler del panel — nunca confiar solo en
  ocultar el enlace en la UI.
- La verificación de sesión vive en `src/lib/supabase/server.ts`. El archivo `proxy.ts` refresca la
  sesión pero **no sustituye** la verificación en cada endpoint.

> ⚠️ **Next.js 16:** el archivo se llama `proxy.ts` (raíz del proyecto) con función exportada
> `proxy`, no `middleware.ts`. La documentación oficial de `@supabase/ssr` todavía usa el nombre
> viejo: hay que adaptarla. Ver [`02-architecture.md`](./02-architecture.md#nextjs-16--diferencias-que-rompen-código).

---

## Autorización (RLS)

**Deny by default.** Toda tabla nace con `ENABLE ROW LEVEL SECURITY` y sin políticas permisivas para
`anon`.

| Rol | Acceso |
|-----|--------|
| `anon` (navegador público) | **Solo** `services` en modo lectura y solo filas con `is_active = true`. Nada más. |
| `authenticated` con rol admin | Lectura/escritura del CRM y las citas |
| `service_role` (solo servidor) | Acceso completo — se usa en Route Handlers para el flujo automatizado |

Reglas duras:
- `SUPABASE_SERVICE_ROLE_KEY` **jamás** en el cliente, ni en un componente sin `"use server"`, ni en
  una variable con prefijo `NEXT_PUBLIC_`.
- El cliente de service role vive **solo** en `src/lib/supabase/admin.ts` y ese archivo empieza con
  `import "server-only"`.
- Nunca desactivar RLS "temporalmente para probar".
- Toda política nueva se documenta con su SQL exacto en [`DB_SCHEMA.md`](./DB_SCHEMA.md).

Verificación tras cada cambio:
```sql
SELECT tablename, policyname, cmd, roles FROM pg_policies WHERE schemaname = 'public';
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
```

---

## Pagos (Square)

1. **PCI:** se usa el **Web Payments SDK** en el navegador. Este tokeniza la tarjeta contra Square y
   nos devuelve un `sourceId`. Ni el PAN, ni el CVV, ni la fecha de expiración pasan por nuestro
   servidor o base de datos. **Nunca** implementar un formulario de tarjeta propio.
2. **El monto se calcula en el servidor** leyendo `services.price_cents`. Un `amount` enviado desde
   el cliente se ignora.
3. **Idempotencia:** cada `CreatePayment` lleva `idempotency_key` para que un reintento o doble clic
   no cobre dos veces.
4. **El webhook es la verdad** (ADR-002). Verificación obligatoria de la firma:
   - Header `x-square-hmacsha256-signature`.
   - HMAC-SHA256 sobre `notificationUrl + rawBody` con `SQUARE_WEBHOOK_SIGNATURE_KEY`.
   - Comparación en **tiempo constante** (`crypto.timingSafeEqual`), nunca con `===`.
   - Leer el body **crudo** (`await req.text()`); parsearlo antes de verificar invalida la firma.
5. **Anti-replay:** guardar el `event_id` de Square en `webhook_events`; si ya existe, responder 200
   y no reprocesar.
6. **Nunca guardar** datos de tarjeta. De Square solo se persisten `payment_id`, `order_id`,
   `status`, `amount_cents`, `card_brand` y los últimos 4 dígitos (para soporte).
7. Los reembolsos (política de cancelación) se ejecutan **solo** desde el panel admin autenticado,
   nunca desde un endpoint público.

---

## Integraciones de Google

- Autenticación con **service account** + delegación a nivel de dominio (necesaria para enviar
  correo como la firma y para crear enlaces de Meet).
- Scopes **mínimos** — no pedir `https://mail.google.com/` completo:
  - `https://www.googleapis.com/auth/calendar.events`
  - `https://www.googleapis.com/auth/calendar.readonly`
  - `https://www.googleapis.com/auth/gmail.send`
- `GOOGLE_PRIVATE_KEY` se guarda con `\n` escapados y se normaliza al leerla:
  `privateKey.replace(/\\n/g, "\n")`.
- El service account solo tiene permiso sobre el calendario indicado en `GOOGLE_CALENDAR_ID`, no
  sobre toda la cuenta.
- Rotación de la clave: al menos una vez al año, y de inmediato si se sospecha exposición.

---

## Agente IA (Anthropic)

- `ANTHROPIC_API_KEY` es **solo de servidor**. Todas las llamadas salen de Route Handlers.
- **Prompt injection:** el texto libre del intake es entrada **no confiable**. Nunca se le da al
  modelo la capacidad de decidir precio, disponibilidad, estado de pago o de ejecutar herramientas
  con efectos secundarios. El agente propone; el código determinista dispone (ADR-005).
- **Minimización de datos:** no se envían al modelo documentos adjuntos ni el número de contacto si
  no son necesarios para la tarea.
- Toda salida del modelo que vaya a la base de datos se valida con Zod antes de persistirse.
- Fallback obligatorio: si la API falla o tarda, el intake usa el formulario estático.

---

## Validación de Entrada

```
NUNCA CONFIAR EN EL CLIENTE. TODA ENTRADA SE VALIDA EN EL SERVIDOR.
```

- Un esquema Zod por endpoint, compartido con el formulario (misma fuente de verdad).
- La validación del cliente es **UX**, no seguridad: el servidor revalida siempre.
- Adjuntos: validar tipo MIME real, extensión y tamaño máximo (10 MB) antes de subir a Storage.
- Rate limiting en endpoints públicos: `/checkout`, `/intake`, `/availability`, `/agent/*`.
- Escapar/sanear todo texto libre antes de incrustarlo en el HTML de un correo (riesgo de inyección
  en el correo del administrador).

---

## Datos Personales (PII)

- El intake contiene PII y datos fiscales: se guarda solo lo necesario para prestar el servicio.
- El bucket de Storage de adjuntos es **privado**; se accede con signed URLs de vida corta (≤ 15 min).
- Los logs **nunca** incluyen PII, tokens ni cuerpos completos de webhook. Loguear ids, no contenido.
- La aceptación de la política de cancelación se registra con `accepted_at` y `accepted_ip` como
  evidencia (`context.md` §8).

---

## Reglas INVIOLABLES

- NUNCA hardcodear credenciales, tokens, API keys ni el correo del admin en el código.
- NUNCA exponer `SUPABASE_SERVICE_ROLE_KEY`, `SQUARE_ACCESS_TOKEN`, `GOOGLE_PRIVATE_KEY` ni
  `ANTHROPIC_API_KEY` al cliente (nada de eso lleva prefijo `NEXT_PUBLIC_`).
- NUNCA commitear `.env.local` ni `.env`.
- NUNCA desactivar RLS sin autorización explícita.
- NUNCA confiar en la confirmación de pago que venga del navegador.
- NUNCA procesar un webhook sin verificar su firma.
- NUNCA guardar datos de tarjeta.
- NUNCA hacer deploy sin el checklist de [`04-deployment.md`](./04-deployment.md).
- SIEMPRE validar input en el servidor.
- SIEMPRE usar consultas parametrizadas del SDK de Supabase (nada de SQL concatenado).

---

## Estado de Vulnerabilidades Conocidas

**Última auditoría:** 2026-08-02 (`npm audit`)

| Severidad | Paquete | Origen | Decisión |
|-----------|---------|--------|----------|
| Alta | `postcss` | Transitiva de `next@16.2.12` | **Riesgo aceptado.** Afecta al pipeline de build, no al runtime en producción. El "fix" de npm propone degradar a `next@9.3.3`, lo que introduciría vulnerabilidades mucho peores. Se resuelve con el próximo patch de Next. |
| Alta | `sharp` (libvips) | Transitiva de `next@16.2.12` | **Riesgo aceptado.** Mismo motivo. Mitigación: `next/image` solo optimiza imágenes propias de `public/`; no se permiten dominios remotos arbitrarios en `next.config.ts`. |

**Protocolo:** ejecutar `npm audit` antes de cada release. Si aparece una vulnerabilidad **de
runtime** (no de build) o con exploit conocido en producción → detener el release y reportar.
No ejecutar `npm audit fix --force` sin revisar qué degrada.

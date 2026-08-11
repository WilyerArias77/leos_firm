# Deployment — Leos Firm LLC

> **Última actualización:** 2026-08-07
> **Estado:** En producción sobre `www.leosfirm.com`.
> ✅ **Incidente de correo resuelto el 2026-08-07.** El dominio se quedó sin `MX` al delegarlo a
> Vercel y estuvo ~30 h sin poder recibir correo. Los **cuatro registros están publicados** (`MX`,
> SPF, DMARC, DKIM); falta que Marco pulse *Iniciar autenticación* en el Admin de Google.
> Ver § *DNS del dominio — y por qué se llevó por delante el correo*.

---

## Entornos

| Entorno | Rama | URL | Square | Supabase |
|---------|------|-----|--------|----------|
| Local | cualquiera | `http://localhost:3000` | `sandbox` | Proyecto de desarrollo |
| Preview | `develop` / PRs | URL de preview de Vercel | `sandbox` | Proyecto de desarrollo |
| Producción | `main` | `https://www.leosfirm.com` | `production` | Proyecto de producción |

> **Regla dura:** producción **nunca** apunta a Square sandbox, y desarrollo **nunca** apunta a la
> base de datos ni al calendario reales de Claudia. Un test no puede crear una cita real.

---

## Servicios Externos a Configurar (antes del primer deploy)

| # | Servicio | Qué hay que hacer |
|---|----------|-------------------|
| 1 | **Supabase** | Crear proyecto prod, aplicar migraciones, crear bucket privado `intake-documents`, crear usuario admin |
| 2 | **Square** | App en producción, obtener Access Token + Location ID, registrar el webhook y guardar su Signature Key |
| 3 | **Google Cloud** | Proyecto + service account, habilitar Calendar API y Gmail API, delegación de dominio con los scopes mínimos, compartir el calendario de Claudia con el service account |
| 4 | **Anthropic** | API key con límite de gasto configurado |
| 5 | **Vercel** | Conectar repo, cargar variables de entorno, dominio `leosfirm.com` + DNS |
| ~~6~~ | ~~**Zoom** (opcional)~~ | **Retirado el 2026-08-07** — la sala virtual es solo Google Meet (ADR-004) |

---

## DNS del dominio — y por qué se llevó por delante el correo

> 🔴 **Incidente del 2026-08-06.** Detectado el 2026-08-07 a partir de un reporte de la clienta:
> *«claudia@leosfirm.com está presentando problemas para recibir mensajes»*.

### Qué pasó

Al conectar `leosfirm.com` a Vercel se eligió **delegar los nameservers** (`ns1/ns2.vercel-dns.com`)
en vez de dejar el DNS donde estaba y añadir solo el registro del sitio. Vercel ofrece los dos
caminos y no advierte del costo del primero:

> **Cambiar los nameservers abandona la zona anterior completa.** Vercel crea una zona nueva, vacía
> salvo por los registros del sitio web. Los MX del correo, el SPF, el DKIM y el TXT de verificación
> de Google **se van con la zona vieja**.

Sin MX, el RFC 5321 obliga al emisor a intentar el registro `A` como «MX implícito» → cae en el edge
de Vercel, que no habla SMTP → el mensaje se encola y **rebota a las 24–72 h**. De ahí el síntoma
confuso: unos correos «nunca llegan» y otros rebotan días después.

**Afecta a todo `@leosfirm.com`, no solo a Claudia.** `marco@leosfirm.com` estaba igual de caído.

### Estado encontrado durante el incidente (2026-08-07)

| Registro | Estado encontrado |
|---|---|
| `NS` | `ns1.vercel-dns.com`, `ns2.vercel-dns.com` — zona gestionada por Vercel |
| `MX` | ❌ **ninguno** (confirmado contra los dos NS autoritativos, más 8.8.8.8 y 1.1.1.1) |
| `TXT` (SPF) | ❌ ninguno |
| `TXT google._domainkey` (DKIM) | ❌ ninguno |
| `TXT _dmarc` | ❌ ninguno |
| `TXT google-site-verification` | ❌ ninguno |
| `A` apex / `www` | ✅ Vercel — el sitio responde `200` |
| SMTP :25 en el `A` del apex | ❌ conexión rechazada |

### Estado tras la corrección (2026-08-07, verificado contra `ns1.vercel-dns.com`)

| Registro | Valor |
|---|---|
| `MX` | ✅ `smtp.google.com.` prioridad `1` — destino alcanzable en `:25` |
| `TXT` apex (SPF) | ✅ `v=spf1 include:_spf.google.com ~all` |
| `TXT _dmarc` | ✅ `v=DMARC1; p=none; rua=mailto:marco@leosfirm.com` |
| `TXT google._domainkey` (DKIM) | ✅ `v=DKIM1; k=rsa; p=…` — **clave RSA de 2048 bits validada decodificándola**, no solo a ojo |
| Activación del DKIM | ⏳ **pendiente** — Marco tiene que pulsar *Iniciar autenticación* en el Admin |
| Verificación del dominio en Workspace | ⏳ **pendiente de revisar** en `admin.google.com` → *Dominios* |

**La recepción quedó restaurada con el `MX` solo.** El resto no influye en que el correo entre.

> 🧨 **El panel de DNS de Vercel mutila los valores de TXT.** Costó tres intentos y merece quedar
> escrito, porque volverá a pasar con el DKIM:
>
> | Intento | Lo que se guardó | Qué se perdió |
> |---|---|---|
> | 1.º | el SPF quedó con `Name = _dmarc` | el campo *Name* arrastró el valor de la fila anterior |
> | 2.º | `spf1 include:...` y `DMARC1` | **el prefijo `v=`** de los dos |
> | 3.º | `v=DMARC1` | **todo lo posterior al `;`** |
>
> Lo que funcionó al final fue escribir el valor a mano y **reabrir el registro después de guardar
> para comprobar qué quedó**. Un TXT que no empieza exactamente por `v=spf1` / `v=DMARC1` no es un
> registro SPF/DMARC: se ignora en silencio, igual que si no existiera. Y en DMARC la etiqueta `p=`
> es **obligatoria** — `v=DMARC1` a secas se descarta.

### Los registros — referencia

El correo es **Google Workspace** — confirmado porque Gmail responde *«Offline unavailable. Contact
your administrator»*, que es una política de cuenta administrada. El administrador es **Marco**
(ADR-012).

Se añaden en Vercel → proyecto `leos-firm` → **Domains → leosfirm.com → DNS**. Para el apex, el
campo *Name* va **vacío** (o `@`).

| Tipo | Name | Prioridad | Valor |
|------|------|-----------|-------|
| `MX` | *(vacío)* | `1` | `smtp.google.com.` |
| `TXT` | *(vacío)* | — | `v=spf1 include:_spf.google.com ~all` |
| `TXT` | `_dmarc` | — | `v=DMARC1; p=none; rua=mailto:marco@leosfirm.com` |
| `TXT` | `google._domainkey` | — | ⚠️ **generado en el Admin de Google** (ver abajo) |

> **Alternativa al MX único.** El juego clásico de cinco registros sigue siendo válido y equivalente;
> úsese uno **o** el otro, nunca los dos mezclados:
> `1 ASPMX.L.GOOGLE.COM.` · `5 ALT1.ASPMX.L.GOOGLE.COM.` · `5 ALT2.ASPMX.L.GOOGLE.COM.` ·
> `10 ALT3.ASPMX.L.GOOGLE.COM.` · `10 ALT4.ASPMX.L.GOOGLE.COM.`

> ⚠️ **El DKIM no se puede inventar ni copiar de otro dominio.** Es una clave pública propia de este
> Workspace, y el procedimiento va abajo.

### DKIM — el procedimiento, que se reparte entre dos personas

Tres tramos, y el orden no es negociable: si se activa antes de publicar el registro, Google falla la
comprobación.

**1 · Marco, en `admin.google.com`** (hace falta ser superadministrador)

1. Buscar **«Autenticar correo»** en la barra de arriba — más rápido que el menú
   (*Aplicaciones → Google Workspace → Gmail → Autenticar correo electrónico*)
2. Elegir el dominio `leosfirm.com`
3. **Generar registro nuevo** → longitud **2048 bits**, prefijo del selector **`google`** (no tocar)
4. Google devuelve el host (`google._domainkey`) y un valor larguísimo que empieza por `v=DKIM1;`
5. Copiarlo y pasarlo a quien administre Vercel. **No cerrar la pantalla:** hay que volver en el paso 3

> El valor DKIM es una **clave pública**: no es un secreto y se puede mandar por cualquier canal. La
> privada se queda en Google.

**2 · Quien administre Vercel**

6. `TXT` con Name `google._domainkey` y el valor completo
7. **Reabrir el registro tras guardar** — el valor empieza por `v=` y lleva varios `;`, que son
   justo las dos cosas que este panel ya se comió antes
8. Verificar con `nslookup` (§ *Cómo comprobar*) **antes** de avisar a Marco

> ⚠️ **El límite de 255 caracteres.** Una clave de 2048 bits ocupa ~392 caracteres en base64 y no
> cabe en una sola cadena TXT. Vercel/NS1 la parte en dos y los resolutores las concatenan — así
> quedó publicada el 2026-08-07, verificada **decodificando la clave**, que es la única forma de
> saber que no se perdió un trozo: si falta algo, el base64 deja de formar una clave RSA válida.
> **Si el panel la rechaza por longitud**, el plan B es generarla de **1024 bits**, que sí cabe.

**3 · Marco otra vez**

9. Volver a *Autenticar correo* → **Iniciar autenticación**
10. El estado pasa a *«Autenticando el correo electrónico con DKIM»*

**Y la prueba de verdad**, que el DNS correcto no sustituye: mandar un correo desde
`claudia@leosfirm.com` a un Gmail, abrirlo → *Mostrar original*, y comprobar que salen los tres:

```
DKIM: 'PASS' with domain leosfirm.com
SPF:  'PASS' with domain leosfirm.com
DMARC: 'PASS'
```

> **No regenerar la clave** una vez activada: invalida la anterior y obliga a repetir los tres tramos.

### El orden importa

1. **Primero el `MX`.** Es lo único que devuelve el correo entrante, y corre reloj: los mensajes de
   las últimas horas siguen encolados en los servidores remitentes y **se entregan solos** si el MX
   vuelve dentro de la ventana de reintentos. Los que ya rebotaron están perdidos.
2. **Después la verificación del dominio.** En `admin.google.com` → *Dominios*, comprobar si
   `leosfirm.com` aparece con advertencia. El mismo despliegue rompió **las tres** vías por las que
   Google comprobaría la propiedad: el `TXT` se fue con la zona, y el archivo HTML / la etiqueta
   `<meta>` desaparecieron porque el sitio nuevo reemplazó al anterior — verificado, no hay ninguna
   en el HTML que sirve `www.leosfirm.com` ni nada en [`public/`](../public/).
3. **Al final SPF, DKIM y DMARC.** No arreglan la recepción; arreglan que lo que *sale* del dominio
   no acabe en spam. Aplica tanto al correo de Claudia como a los que manda n8n.

### Cómo comprobar que quedó bien

```bash
nslookup -type=MX  leosfirm.com 8.8.8.8      # debe listar smtp.google.com
nslookup -type=TXT leosfirm.com 8.8.8.8      # debe mostrar el v=spf1
nslookup -type=TXT google._domainkey.leosfirm.com 8.8.8.8
nslookup -type=TXT _dmarc.leosfirm.com 8.8.8.8
```

La zona tiene `TTL` de 600 s, así que propaga en minutos. La prueba real es mandar un correo desde
una cuenta externa y que llegue.

### La regla que deja este incidente

> **Conectar un dominio a Vercel NO es una tarea de frontend.** Si el dominio tiene correo, cambiar
> los nameservers lo apaga. El camino correcto con correo vivo es **dejar el DNS donde está** y
> añadir allí solo los registros del sitio; si aun así se delega a Vercel, hay que **exportar la zona
> anterior primero** y recrearla entera.

---

## Configuración de Webhooks de Square

- **URL:** `https://www.leosfirm.com/api/v1/webhooks/square`
- **Eventos suscritos:** `payment.updated`, `refund.updated`
- La **Signature Key** que muestra Square al crear el webhook va en `SQUARE_WEBHOOK_SIGNATURE_KEY`.
- La URL registrada debe coincidir **byte a byte** con la que se usa para calcular el HMAC. Un
  `www` de más o de menos rompe la verificación de firma.
- Sandbox y producción tienen **webhooks y signature keys distintos**.

---

## Cron Jobs (Vercel)

| Ruta | Frecuencia | Qué hace |
|------|-----------|----------|
| `/api/v1/cron/reminders` | cada hora | Recordatorios 24 h y 1 h antes de la cita |
| `/api/v1/cron/close-appointments` | cada hora | Pasa citas vencidas de `pendiente_atencion` a `atendido` |

Ambos exigen `Authorization: Bearer ${CRON_SECRET}`.

> **Aviso de plan:** el plan Hobby de Vercel permite solo **2 cron jobs con frecuencia diaria**.
> Para frecuencia horaria hace falta plan Pro **o** disparar los endpoints desde un scheduler
> externo (n8n self-hosted, GitHub Actions), reutilizando el mismo `CRON_SECRET`.
> Decidir antes del primer deploy — sin scheduler, la feature de recordatorios no corre.

---

## Checklist Pre-Deploy

### Código
- [ ] `npm run build` compila sin errores
- [ ] `npm run lint` sin errores
- [ ] Sin `console.log` con PII, tokens o cuerpos de webhook
- [ ] Sin `any` ni `@ts-ignore` sin justificación documentada
- [ ] Todos los estados de UI cubiertos: loading, error, empty, success

### Seguridad
- [ ] `.env.local` está en `.gitignore` y **no** aparece en el repo
- [ ] `.env.example` tiene TODAS las variables, sin valores reales
- [ ] Ninguna clave secreta lleva prefijo `NEXT_PUBLIC_`
- [ ] RLS activado en todas las tablas (`SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='public'`)
- [ ] Bucket `intake-documents` es privado
- [ ] Firma del webhook de Square verificada y probada con un pago real de prueba
- [ ] `CRON_SECRET` configurado y los endpoints de cron rechazan requests sin él
- [ ] `npm audit` revisado (ver estado conocido en `03-security.md`)

### Datos
- [ ] Migraciones aplicadas en el proyecto de producción
- [ ] Tabla `services` cargada con los precios reales vigentes
- [ ] Usuario admin creado y con acceso al panel
- [ ] Backup de la base de datos habilitado

### Integraciones
- [ ] Square en `production` y con un cobro de prueba real (monto mínimo) verificado y reembolsado
- [ ] Calendario de Google compartido con el service account, con permiso de escritura
- [ ] Prueba end-to-end: se crea el evento y se genera el enlace de Meet
- [ ] Correo de confirmación llega al cliente y la copia al `ADMIN_NOTIFICATION_EMAIL`
- [ ] Correos no caen en spam (SPF/DKIM del dominio en orden)
- [ ] `BUSINESS_TIMEZONE` correcto y slots correctos también con horario de verano

### DNS y correo del dominio
> Añadido tras el incidente del 2026-08-06 (§ *DNS del dominio*). Se comprueba **antes** de tocar
> nameservers y **otra vez** después.
- [ ] **Zona anterior exportada** antes de delegar los nameservers a nadie
- [x] `MX` de `leosfirm.com` resuelve y apunta al proveedor de correo real — `smtp.google.com`
- [ ] Correo entrante probado de verdad: mandar desde una cuenta externa a `claudia@leosfirm.com`
- [x] `TXT` de SPF presente
- [x] `TXT` de DKIM presente y **validado decodificando la clave**, no solo a ojo
- [ ] *Autenticar correo* activado en el Admin de Google (§ *DKIM — el procedimiento*)
- [ ] Cabeceras `DKIM/SPF/DMARC` en `PASS` en un correo real, vía *Mostrar original*
- [x] `TXT` de `_dmarc` presente
- [ ] Verificación del dominio sana en `admin.google.com` → *Dominios*, sin advertencias
- [ ] **Cada valor reabierto tras guardar** para comprobar que Vercel no lo cortó (§ *DNS del dominio*)

### Post-deploy
- [ ] Flujo completo probado en producción: comprar → intake → agendar → recibir correo
- [ ] Estado de la cita visible en el panel admin
- [ ] Cron de recordatorios ejecutándose (verificar logs)
- [ ] Entrada en `CHANGELOG.md` con la versión desplegada

---

## Comandos

```bash
npm run dev      # Desarrollo local  → http://localhost:3000
npm run build    # Build de producción (validación obligatoria antes de push)
npm run start    # Servir el build localmente
npm run lint     # ESLint
```

### Migraciones de Supabase

```bash
supabase link --project-ref <ref>
supabase db push          # Aplica migraciones pendientes
supabase gen types typescript --linked > src/types/database.types.ts
```

Reglas: nunca modificar una migración ya aplicada — crear una nueva. Backup antes de cualquier
migración destructiva (`DROP`, `ALTER TYPE`). Regenerar los tipos después de cada cambio de schema.

---

## Rollback

1. En Vercel: promover el deployment anterior (**Instant Rollback**) — no requiere rebuild.
2. Si el problema es de base de datos: aplicar la migración inversa. Nunca `db reset` en producción.
3. Si el problema es de cobros: **desactivar el webhook de Square primero** para no perder eventos
   (Square reintenta durante 72 h), luego corregir y reactivar.
4. Registrar el incidente y el rollback en `CHANGELOG.md`.

---

## Reglas de Git

- La IA **nunca** ejecuta `git push`, `git tag` ni deploy sin confirmación explícita del usuario.
- Ramas: `main` (producción) ← `develop` (integración) ← `feature/*`, `fix/*`, `docs/*`.
- Commits: `tipo(scope): descripción` — `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`.

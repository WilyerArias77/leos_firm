# Deployment — Leos Firm LLC

> **Última actualización:** 2026-08-02
> **Estado:** Plan definido. Aún **no** se ha hecho el primer deploy.

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
| 6 | **Zoom** (opcional) | App Server-to-Server OAuth, solo si se activa como proveedor alternativo |

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

# Feature: CRM en Google Sheets

> **Estado:** ✅ **Funcionando de punta a punta.** Etapas `formulario` y `agenda` probadas contra la
> hoja real; `pagado` queda a la espera de Square
> **Última actualización:** 2026-08-05
> **Hoja del CRM:** `1A2XY75na61fAcSGqM0F6mje_N_RZEZd-ISjardORr3I` — **creada por la credencial de
> n8n**, no por la clienta. El motivo está más abajo y no es negociable
> **Dónde vive el archivo:** en el Drive de **`wilyerernestoarias@gmail.com`** (cuenta del equipo de
> desarrollo) — ver § Propiedad de la hoja y ADR-012
> **Archivos clave:** `src/services/crm.service.ts`, `src/lib/n8n/client.ts`,
> `src/types/crm.types.ts`, `src/app/api/v1/leads/route.ts`
> **Workflow n8n:** `Leos Firm - CRM de leads` (`NYy88hBunUSkrcZk`)
> **Decisión asociada:** ADR-010 — n8n es la capa de integración; Supabase queda congelado

---

## Descripción

Todo el que llena el diagnóstico queda registrado en una **hoja de cálculo de Google** que Claudia
abre directamente. No hay panel que aprender, no hay correo que revisar: abre la hoja y ve, en una
sola línea por persona, quién es, qué respondió y hasta dónde llegó.

```
Navegador ──POST /api/v1/leads──▶ Next.js ──POST webhook──▶ n8n ──▶ Google Sheets
                                    │                        │
                              valida y arma la fila     tiene las credenciales
                                                        de Google, Next.js no
```

## El problema que resuelve

Antes de este cambio, seis de los ocho servicios terminaban en **un correo a Claudia** con los datos
del interesado. Eso obligaba a Claudia a vivir dentro del correo para saber si tenía clientes nuevos,
y un correo perdido era un cliente perdido. La hoja invierte eso: el dato llega solo, se acumula en
un lugar fijo y el estado de cada persona se ve de un vistazo.

## Modelo: una fila por persona, no una por evento

El `lead_id` (UUID) se genera **en el navegador** cuando el visitante envía el formulario, se guarda
en `sessionStorage` (`LEAD_STORAGE_KEY`) y viaja con él por el resto del flujo. Las tres etapas hacen
*upsert* sobre esa misma fila:

| Etapa | Quién la escribe | Qué significa |
|-------|-----------------|---------------|
| `formulario` | `POST /api/v1/leads` | Llenó el diagnóstico. Existe el contacto, no debe nada |
| `agenda` | La pantalla de agendamiento | Eligió día y hora; el slot está retenido, falta pagar |
| `pagado` | El webhook de Square | El cobro está confirmado y la cita existe de verdad |

Cada etapa escribe **solo sus columnas**. El nodo de Google Sheets deja intactas las que no mapea, así
que el pago no borra las respuestas del diagnóstico y no hace falta que el navegador recuerde los
datos completos ni que n8n lea la fila antes de escribirla.

> El `lead_id` es **opaco y sin privilegios**: nombra una fila, no da acceso a ella. Nada se lee de
> vuelta por id, así que adivinar uno no revela nada. El límite contra el abuso es el rate limit del
> endpoint.

## Columnas de la hoja

La hoja se llama **`Leads`** y su primera fila debe tener exactamente estos encabezados. El workflow
mapea por nombre: **un encabezado mal escrito pierde ese dato en silencio**, Google Sheets no avisa.

| Encabezado en la hoja | Campo del payload | Etapa que lo escribe |
|----------------------|-------------------|---------------------|
| `ID` | `lead_id` | todas (es la clave del upsert) |
| `Estado` | `stage` | todas |
| `Actualizado` | `updated_at` | todas |
| `Nombre` | `full_name` | formulario |
| `Correo` | `email` | formulario |
| `Telefono` | `phone` | formulario |
| `Pais` | `country` | formulario |
| `1. En que punto esta` | `p1_situacion` | formulario |
| `2. Que necesita resolver` | `p2_objetivo` | formulario |
| `3. Para cuando` | `p3_urgencia` | formulario |
| `Ya tiene empresa en EE. UU.` | `has_us_entity` | formulario |
| `Servicio recomendado` | `recommended_service` | formulario |
| `Servicio (slug)` | `recommended_service_slug` | formulario |
| `Precio` | `price_usd` | formulario |
| `Tipo de cobro` | `pricing_model` | formulario |
| `Servicio que veia` | `viewed_service_slug` | formulario |
| `Pagina de origen` | `source_path` | formulario |
| `Autorizacion` | `consent_at` | formulario |
| `IP` | `consent_ip` | formulario |
| `Fecha de la cita` | `appointment_at` | agenda |
| `Zona horaria del cliente` | `appointment_timezone` | agenda |
| `Enlace de la reunion` | `meeting_url` | agenda |
| `Pago (Square)` | `payment_id` | pagado |
| `Monto pagado` | `amount_usd` | pagado |
| `Pagado el` | `paid_at` | pagado |
| `Politica aceptada el` | `policy_accepted_at` | agenda · ⏳ **falta crearla** |
| `IP de aceptacion` | `policy_accepted_ip` | agenda · ⏳ **falta crearla** |

**Los encabezados van sin tildes a propósito.** Es el nombre de una clave, no un texto de UI: una
tilde mal copiada entre la hoja y el workflow es un dato perdido que nadie nota.

### ⏳ Dos columnas nuevas que hay que crear para la FASE 5

> **Esto le toca a quien mantiene el workflow del CRM, no al código.** Acordado el 2026-08-05 junto
> con el contrato de agendamiento ([`scheduling.md`](./scheduling.md) § Contrato exacto).

La FASE 5 registra la **aceptación de la política de cancelación** con su fecha y su IP
(`context.md` §8.9, y es entregable explícito de la fase en [`../00-roadmap.md`](../00-roadmap.md)).
Hoy **no hay dónde guardarlas**: las 25 columnas actuales no contemplan ese dato. Las columnas
`Autorizacion` e `IP` que ya existen son de otra cosa — son el consentimiento **para contactar** que
se firma en el diagnóstico, y se escriben en la etapa `formulario`. Son dos consentimientos
distintos, en dos momentos distintos, y meterlos en la misma celda perdería el primero.

**Los tres pasos, en este orden:**

1. **En la hoja:** añadir `Politica aceptada el` e `IP de aceptacion` **al final**, en las columnas
   Z y AA. Al final y no intercaladas: insertar una columna en medio desplaza los datos de las filas
   que ya existen.
2. **En el workflow:** abrir los tres nodos de Google Sheets, **refrescar las columnas** y verificar
   que `ID` sigue elegida en *Column to Match On*. El esquema pasa de **25 a 27 columnas**. Si no se
   refresca, vuelve el error *"The 'Column to Match On' parameter is required"* que ya apareció una
   vez (§ más abajo).
3. **En el nodo de la etapa `agenda`:** mapear los dos campos nuevos, `policy_accepted_at` y
   `policy_accepted_ip`.

**Qué pasa si no se hace:** nada visible. Next.js manda los dos campos igual, n8n descarta las claves
que no tienen columna y el agendamiento sigue funcionando. Se pierde solo la evidencia de la
aceptación — que es justo lo que se necesitaría el día que alguien reclame un reembolso. **Falla en
silencio, como todo en esta hoja.**

**De dónde salen los valores:** los pone el **servidor**, nunca el navegador. `policy_accepted_at` es
la hora del servidor al recibir la reserva y `policy_accepted_ip` sale de la cabecera de la petición,
igual que `consent_at` / `consent_ip` en `buildLeadRow`. Una evidencia que el cliente puede escribir
no es una evidencia.

### Por qué las respuestas van por número de pregunta y no por posición

El árbol del diagnóstico tiene ramas de distinta longitud: quien responde *"tengo una empresa fuera
de EE. UU."* salta la segunda pregunta y va directo a la urgencia. Leer las respuestas por posición
pondría *"es urgente"* debajo de *"¿qué necesitas resolver?"*. `crm.service.ts` las busca por id de
pregunta y escribe `—` donde la rama no preguntó.

## Por qué n8n y no la API de Google directamente

Ver **ADR-010**. En corto: n8n ya está en producción, ya tiene las credenciales de Google y ya es el
scheduler previsto para los cron. Meter `googleapis` y un service account dentro de Next.js habría
duplicado la superficie de credenciales para escribir una fila en una hoja.

## Manejo de fallos

Un fallo del CRM **nunca** falla la petición del visitante. Si n8n no responde:

1. `postToN8n` devuelve `false` (nunca lanza) y registra el motivo **sin PII**.
2. `syncLeadToCrm` devuelve `"failed"`.
3. El endpoint responde igual `201`, con `delivery: "failed"`.
4. El popup muestra el aviso `deliveryFailed` y **el teléfono de la firma** como vía de recuperación.

La alternativa —devolver un 500— perdería el lead *y* la persona. Así solo se pierde la fila
automática, y el visitante tiene un camino claro.

> ⚠️ **Riesgo aceptado y declarado:** si n8n está caído, ese lead **no se recupera solo**. No se
> loguea la PII para poder rescatarlo (`03-security.md` §PII), y no hay base de datos local porque
> Supabase está congelado. La mitigación es operativa: monitorear el workflow en n8n y revisar
> `[lead] NO LLEGÓ AL CRM` en los logs del servidor.

## Configuración

| Variable | Qué es |
|----------|--------|
| `N8N_CRM_WEBHOOK_URL` | URL **de producción** del webhook: `<host-webhook>/webhook/leos-firm/crm` |
| `N8N_WEBHOOK_TOKEN` | Secreto compartido; viaja en el header `x-leosfirm-token` |

> ⚠️ **El host del webhook NO es el del editor de n8n.** Esta instancia sirve los webhooks desde un
> subdominio distinto al de la interfaz. Copiar la URL del panel del nodo Webhook (pestaña
> *Production URL*) en lugar de construirla a mano — y **nunca** usar la *Test URL*, que solo
> responde mientras alguien tiene el editor abierto escuchando.

`getN8nEnv()` es el **único** getter de entorno que no lanza cuando falta una variable, y la
excepción es deliberada: está explicada en `src/lib/env.ts` y en `03-security.md`.

> ⚠️ **Estas dos variables hay que ponerlas TAMBIÉN en Vercel.** Un `git push` no las lleva —
> `.env` y `.env.local` están en `.gitignore`, que es justamente lo que queremos. Si el sitio
> desplegado responde `delivery: "failed"` mientras en local funciona, es esto. Y Vercel **no recoge
> variables nuevas en un despliegue ya hecho**: hay que volver a desplegar después de añadirlas.

### Montaje desde cero (el orden importa)

1. **Crear la hoja desde la propia credencial de n8n** — no usar una hoja existente. Ver la sección
   de abajo sobre `drive.file`: es la trampa más cara de todo este montaje.
2. Renombrar la pestaña a **`Leads`** y **pegar la fila de encabezados** de la tabla de arriba.
   Antes de cualquier ejecución.
3. Crear la credencial **Header Auth** `Leos Firm - Token del sitio`:
   nombre del header `x-leosfirm-token`, valor = el mismo `N8N_WEBHOOK_TOKEN`.
4. **Publicar** el workflow y copiar la Production URL a `N8N_CRM_WEBHOOK_URL`.
5. Compartir la hoja con Claudia como **Editora**.

> **Un solo workflow puede escuchar en una ruta.** Si al publicar aparece *"There is a conflict with
> one of the webhooks"*, hay otro workflow activo ocupando `leos-firm/crm`. Desactivarlo primero.

### ⚠️ La hoja tiene que ser CREADA por la credencial de n8n

Esto costó una noche entera de depuración y no es evidente en ninguna parte.

La credencial de Google Sheets de n8n pide el permiso **`drive.file`**, que significa literalmente
*"acceso solo a los archivos que esta aplicación creó"*. **No es un permiso sobre la cuenta: es un
permiso sobre archivos concretos.**

Consecuencia: **compartir una hoja preexistente con esa cuenta no sirve de nada.** Google responde
`403 PERMISSION_DENIED` aunque en Drive el archivo se vea perfectamente compartido y con permiso de
Editor. No hay forma de arreglarlo desde el lado de Drive.

Por eso el CRM **no** vive en la hoja que la clienta creó, sino en una hoja
**creada por la propia credencial** (`1A2XY75na61fAcSGqM0F6mje_N_RZEZd-ISjardORr3I`), que después se
comparte con Claudia. El sentido de la compartición es el inverso del que uno esperaría.

**Cómo verificarlo en 30 segundos** si vuelve a pasar con otra hoja: crear un workflow de un solo
nodo que haga `spreadsheet: create` con esa credencial. Si crear funciona pero leer la hoja objetivo
da 403, es exactamente esto y no hay nada que revisar en los permisos.

**La alternativa si algún día hace falta usar una hoja externa:** una credencial de **Service
Account** (`authentication: serviceAccount` en el nodo). Los service accounts sí tienen permiso
completo de Sheets y acceden a cualquier archivo compartido con su correo. Cuesta configurar un
proyecto en Google Cloud Console — y ese proyecto **ya va a existir**: es el mismo Google Console de
`marco@leosfirm.com` donde se monta el calendario ([`scheduling.md`](./scheduling.md)).

## Propiedad de la hoja — quién es el dueño del archivo

**Decisión asociada: ADR-012.** La consecuencia directa de la sección anterior es que **la hoja del
CRM no vive en el Drive de la firma**. Vive en el Drive de la cuenta que tiene conectada la
credencial de Google Sheets de n8n:

```
Credencial de Sheets en n8n  ──está conectada a──▶  wilyerernestoarias@gmail.com
                                                        │
                                                   crea y es DUEÑA de
                                                        ▼
                                          hoja "Leads"  1A2XY75na…rr3I
                                                        │
                                                se comparte (Editor) con
                                                        ▼
                                                     Claudia
```

| | Hoja del CRM (Sheets) | Calendario (Calendar) |
|---|---|---|
| Cuenta dueña | `wilyerernestoarias@gmail.com` | `marco@leosfirm.com` |
| De quién es esa cuenta | Equipo de desarrollo | Cliente (dominio de la firma) |
| Por qué | Forzado por `drive.file` | Elección correcta desde el inicio |
| ¿Definitivo? | **No** — deuda a migrar | Sí |

**Qué implica en la práctica.**

- **Compartir ≠ transferir.** Claudia entra a la hoja como Editora, pero el archivo **no es suyo**:
  no cuenta para su cuota de Drive, no aparece en su "Mi unidad" y **no puede recuperarlo** si la
  cuenta dueña desaparece. La papelera que manda es la del dueño.
- **Hay PII de clientes de la firma en una cuenta personal.** Nombre, correo, teléfono y país de cada
  persona que llena el diagnóstico (`../03-security.md` §PII). Es aceptable mientras se construye;
  no lo es como estado final.
- **Nadie más puede borrarla por accidente**, que es la única ventaja del arreglo.

**Cómo se sale de aquí** (no antes de cerrar la FASE 5, y en un solo movimiento):

1. Drive → clic derecho sobre la hoja → *Compartir* → **Transferir la propiedad** a una cuenta de
   `leosfirm.com`. Ojo: entre una cuenta `@gmail.com` y un dominio de Workspace la transferencia
   directa puede no estar permitida — si Google la bloquea, ir al paso 2.
2. **Ruta recomendada:** crear un **Service Account** en el Google Console de `marco@leosfirm.com`
   (el mismo que se usa para Calendar), compartir con su correo una hoja nueva que sea propiedad de
   la firma, y cambiar los tres nodos del workflow a `authentication: serviceAccount`. Esto elimina
   la trampa del `drive.file` de raíz y deja las dos integraciones de Google bajo el cliente.
3. En cualquiera de los dos caminos: **verificar una escritura real** antes de dar la migración por
   hecha. Un `PERMISSION_DENIED` aquí es silencioso y se paga en leads perdidos.

### ⚠️ La fila de encabezados tiene que existir ANTES de la primera escritura

No se puede dejar que n8n cree los encabezados solo. Con `mappingMode: defineBelow` sobre una hoja
**vacía**, n8n no escribe los nombres de columna mapeados: escribe **las claves del sobre del
webhook** — `headers`, `query`, `body` — y a partir de ahí todas las ejecuciones fallan con
*"Column names were updated after the node's setup"*.

Orden correcto: **1)** crear la hoja · **2)** pegar la fila de encabezados · **3)** recién entonces
ejecutar el workflow.

### "The 'Column to Match On' parameter is required"

El *resource mapper* de Google Sheets guarda tres cosas juntas: `matchingColumns` (por cuál columna
emparejar), `value` (qué escribir) y `schema` (qué columnas existen). **Declarar `matchingColumns`
con el `schema` vacío no basta**: n8n valida la primera contra el segundo, no la encuentra y vuelve a
pedirla. Es lo que pasó al crear el workflow desde el SDK, donde el esquema no se descubre solo.

Los tres nodos declaran ahora las **25 columnas** de la hoja, con `ID` marcada como `defaultMatch`.
El `value` de cada uno sigue siendo un subconjunto: el esquema describe la hoja completa, el `value`
describe lo que esa etapa escribe.

> Si el error reaparece tras editar la hoja, es que n8n perdió el esquema: abrir el nodo, refrescar
> las columnas y volver a elegir **ID** en *Column to Match On*.

### El documento se referencia por ID, no por URL

Una URL hay que parsearla y se puede truncar al copiarla; un ID no cambia nunca. Usar siempre
`mode: 'id'`. `From list` guarda además un valor cacheado que se rompe si alguien renombra el
archivo.

Si el campo *Sheet* sale con triángulo rojo, la pestaña no se llama `Leads`: el campo usa `By Name`
y **distingue mayúsculas**.

## Restricciones

- **El precio y el nombre del servicio se leen del catálogo en el servidor**, nunca del request
  (ADR-006). El cliente solo manda el slug.
- **Todos los valores viajan como texto.** Un teléfono que Google interprete como número se convierte
  en notación científica.
- **`CRM_COLUMNS` en `crm.service.ts` es la lista de campos del payload**, y el workflow los traduce
  a los encabezados en español. Agregar un campo exige tocar los tres: tipo, servicio y workflow.
- **Ninguna etapa retrocede.** `CRM_STAGE_ORDER` existe para que un webhook tardío de una etapa
  anterior no degrade una fila ya pagada.

## Pendiente

- [ ] **Variables en Vercel** — `N8N_CRM_WEBHOOK_URL` y `N8N_WEBHOOK_TOKEN`. Sin ellas el sitio
      desplegado guarda cero leads, en silencio. **Es lo único que separa esto de estar en producción.**
- [ ] Etapa `agenda` — el workflow ya la maneja y está probada; falta la pantalla que la dispare
      ([`scheduling.md`](./scheduling.md)).
- [ ] Etapa `pagado` — la escribe el webhook de Square ([`payments.md`](./payments.md), sin crear).
- [ ] Hacer respetar `CRM_STAGE_ORDER` en el workflow (hoy la protección está definida en el tipo
      pero no aplicada: un `agenda` que llegue después de un `pagado` degradaría la fila).
- [ ] Vista de resumen para Claudia (tabla dinámica o segunda hoja con los del mes).
- [ ] **Migrar la propiedad de la hoja a la firma** (§ Propiedad de la hoja · ADR-012). Hoy el
      archivo con la PII de los clientes es de `wilyerernestoarias@gmail.com`. **Después de la
      FASE 5**, no antes.

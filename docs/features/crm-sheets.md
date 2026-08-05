# Feature: CRM en Google Sheets

> **Estado:** ✅ Implementado (etapa `formulario`) · ⏳ etapas `agenda` y `pagado` esperan sus fases
> **Última actualización:** 2026-08-04
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

**Los encabezados van sin tildes a propósito.** Es el nombre de una clave, no un texto de UI: una
tilde mal copiada entre la hoja y el workflow es un dato perdido que nadie nota.

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

### Pasos manuales en n8n (una sola vez)

1. Crear la hoja **`Leads`** en el spreadsheet y pegar la fila de encabezados de la tabla de arriba.
2. Crear la credencial **Header Auth** `Leos Firm - Token del sitio`:
   nombre del header `x-leosfirm-token`, valor = el mismo `N8N_WEBHOOK_TOKEN`.
3. Verificar que la credencial de Google Sheets de los tres nodos tenga **permiso de edición** sobre
   el spreadsheet. n8n asignó automáticamente `api_sheet_aiinovate`; si el CRM debe quedar bajo la
   cuenta de Claudia, conectar su credencial y cambiarla en los tres nodos.
4. **Publicar** el workflow y copiar la Production URL a `N8N_CRM_WEBHOOK_URL`.

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

- [ ] Etapa `agenda` — la escribe la pantalla de agendamiento ([`scheduling.md`](./scheduling.md)).
- [ ] Etapa `pagado` — la escribe el webhook de Square ([`payments.md`](./payments.md), sin crear).
- [ ] Hacer respetar `CRM_STAGE_ORDER` en el workflow (hoy la protección está definida en el tipo
      pero no aplicada: un `agenda` que llegue después de un `pagado` degradaría la fila).
- [ ] Vista de resumen para Claudia (tabla dinámica o segunda hoja con los del mes).

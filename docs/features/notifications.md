# Feature: Correos — confirmación y recordatorios por n8n

> **Estado:** 🔨 **Los dos recordatorios publicados** (2026-08-06). La confirmación estaba en
> producción desde la FASE 6, y ahora WF6 y WF7 están activos. Falta verificarlos contra una cita real
> y aplicar las tres correcciones al correo de confirmación.
> **Última actualización:** 2026-08-06
> **Dónde vive:** enteramente en **n8n**. Esta fase casi no toca el repositorio (§ *Qué toca del
> repo*)
> **Workflows:** `Leos Firm - Confirmar cita` (`5Tx6yxAmPBMghDBS`, ✅ publicado — manda la
> confirmación) · **WF6** `Leos Firm - Recordatorio 24 h` (`6836anE95HmUiyDg`, ✅ **publicado**) ·
> **WF7** `Leos Firm - Recordatorio 1 h` (`Edd15W7W2FS1Cagf`, ✅ **publicado**)
> **Decisiones asociadas:** ADR-003 (Calendar es la fuente de verdad) · ADR-011 (la retención es un
> evento tentativo) · ADR-013 (la idempotencia la da el propio evento) · **ADR-015 nace aquí**
> **Depende de:** [`payments.md`](./payments.md) — cuando esto corre, la cita ya está confirmada y
> tiene Meet · [`scheduling.md`](./scheduling.md) — los datos del cliente viven en la descripción del
> evento

---

## Qué se construye

Los correos que rodean a la cita. Uno ya existe; faltan dos.

```
        pago confirmado (WF3)
                │
                ├──▶ ✅ CONFIRMACIÓN al cliente — ya en producción
                │      hora en su huso + hora de San Antonio + enlace de Meet
                │
        …pasan los días…
                │
                ├──▶ ⬜ RECORDATORIO 24 h antes   (WF6)
                │
                └──▶ ⬜ RECORDATORIO 1 h antes    (WF7)
```

**El scheduler es n8n, no Vercel Cron.** El plan Hobby de Vercel permite dos cron jobs y solo con
frecuencia diaria ([`../04-deployment.md`](../04-deployment.md)), que no alcanza ni para el
recordatorio de una hora. Además la app no tiene —ni debe tener— credenciales de Google: quien puede
leer el calendario y mandar el correo es n8n (ADR-010).

**La app no participa.** No hay endpoint, no hay cron, no hay servicio nuevo. Es coherente con el
reparto de siempre: n8n tiene las credenciales, Next.js tiene las reglas de negocio — y aquí no hay
ninguna regla de negocio que decidir en tiempo de request.

---

## Lo que ya existe, verificado en el workflow (2026-08-06)

El nodo `Enviar confirmacion al cliente` del WF3 manda esto hoy:

| Campo | Valor actual |
|---|---|
| Para | el correo del cliente, leído de la descripción del evento |
| CC | `marco@leosfirm.com` |
| Remitente | `Leos Firm LLC` (`appendAttribution: false`) |
| Asunto | `Tu cita con Leos Firm quedo confirmada — <hora del cliente>` |
| Cuerpo | hora en el huso del cliente **y** en `America/Chicago`, enlace de Meet, tolerancia de 15 min, reprogramación libre con 24 h |

**Y ya tiene resuelto lo más difícil de un sistema de correos: no manda dos.** El correo cuelga de la
rama en la que el `PATCH` con `If-Match` ganó la carrera. Si otra ejecución confirmó el evento en el
intervalo, Google responde `412`, el flujo responde `alreadyConfirmed` y **no manda nada** (ADR-013).
Está probado con ejecuciones reales.

### Tres defectos del correo actual

| # | Defecto | Por qué importa |
|---|---------|-----------------|
| 1 | **Sin acentos** — «quedo confirmada», «reunion», «sesion» | Va a clientes hispanohablantes y es el primer correo que reciben de la firma. Se escribió así porque el workflow se creó por MCP evitando caracteres no ASCII; en la UI de n8n se escriben con normalidad |
| 2 | **La copia interna va en `CC`** | Un `CC` le muestra al cliente una dirección interna de la firma. Debe ser `BCC` o un correo aparte |
| 3 | **La copia va a `marco@leosfirm.com`** | Marco es el dueño de la cuenta de Google (ADR-012), no quien atiende las citas. **Decidido el 2026-08-06:** pasa a `BCC` a `claudia@leosfirm.com` (§ Decisiones tomadas) |

---

## ADR-015: la marca de «recordatorio enviado» vive en el propio evento

**Fecha:** 2026-08-06 · **Estado:** propuesta

**Contexto.** Un recordatorio se dispara por tiempo, no por un suceso. El workflow despierta cada
cierto rato, pregunta qué citas empiezan pronto y manda correos. El problema es obvio en cuanto se
escribe: **la siguiente corrida encuentra las mismas citas** y manda el correo otra vez.

**Alternativas consideradas.**

| Opción | Por qué no |
|---|---|
| Ventanas exactas que no se solapan (cada 30 min, buscar `[ahora+24h, ahora+24h30m)`) | Frágil de la peor manera: si n8n está caído esa media hora, o el cron se retrasa, **ese recordatorio no se manda nunca y nadie se entera**. El fallo es silencioso y solo se descubre con un no-show |
| Una columna en la hoja del CRM | La hoja no es atómica —ya está documentado en ADR-013— y obliga a cruzar dos fuentes para decidir un correo. Además el recordatorio pasaría a depender de que la fila exista |

**Decisión.** La marca se escribe en el **propio evento de Google Calendar**, en
`extendedProperties.private`:

```
extendedProperties.private.recordatorio24 = "enviado"
extendedProperties.private.recordatorio1  = "enviado"
```

El workflow pide *«los eventos que empiezan en esta ventana»* y descarta los que ya la tienen. No hay
ventana estrecha que calzar: la ventana puede ser generosa porque la marca es la que decide.

> ⚠️ **Corregido al construirlo (2026-08-06): el descarte NO se puede hacer en la API.**
> `privateExtendedProperty` **solo empareja por igualdad** — devuelve los eventos que *tienen* la
> propiedad con un valor dado. No existe un «que NO la tenga». Así que se trae la ventana completa y
> el filtro vive en el nodo Code. No es un problema de volumen: son las citas de un día de una sola
> consultora, nunca más de un puñado.

**Consecuencias.**

- **Es robusto ante caídas.** Si n8n estuvo caído dos horas, al volver manda los que faltan en vez de
  perderlos. La ventana amplia + la marca sustituyen a una ventana estrecha y frágil.
- Coherente con el resto: Calendar ya es la única fuente de verdad de las citas (ADR-003) y el propio
  evento ya es el registro que decide en ADR-011 y ADR-013. **Un tercer sitio donde vivir la verdad
  sería un tercer sitio que desincronizar.**
- Las `extendedProperties` son invisibles para Claudia en la interfaz de Calendar, así que no ensucian
  lo que ella ve.

### El orden importa, y aquí es al revés que en la confirmación

> **Primero se manda el correo, después se escribe la marca.**

En la confirmación el candado va **antes** de actuar, porque un segundo correo de confirmación —con
su segundo Meet y su segunda fila— es un desastre. En un recordatorio la aritmética se invierte:

| Si falla | Consecuencia |
|---|---|
| Marcar antes y que falle el envío | El recordatorio **no llega nunca**. El cliente no se presenta. Por la política (`context.md` §8) un no-show cuenta como cita realizada, sin reembolso: cuesta dinero **y** la confianza del cliente |
| Enviar antes y que falle el marcado | El cliente recibe el recordatorio **dos veces**. Molesta, y nada más |

Un recordatorio duplicado es barato; uno perdido no. Por eso el orden se invierte respecto al WF3, y
por eso queda escrito aquí — es exactamente el tipo de detalle que alguien «corrige» dentro de seis
meses por hacerlo parecido al otro workflow.

---

## WF6 — Recordatorio «de 24 h» (se manda a las 27)

| | |
|---|---|
| **Trigger** | Schedule, cada **30 minutos** |
| **Busca** | eventos con `status = confirmed` que empiezan entre **ahora + 2 h** y ahora + **27 h**, **sin** `recordatorio24` |
| **Manda** | correo al cliente, ofreciendo reprogramar sin costo |
| **Luego** | `PATCH` del evento escribiendo `extendedProperties.private.recordatorio24 = "enviado"` |

Media hora de imprecisión sobre un plazo de 27 horas es irrelevante para el cliente, y correr cada 30
minutos mantiene bajo el número de llamadas a Google.

> ⚠️ **Por qué 27 y no 24.** La reprogramación gratuita exige **al menos 24 h** de anticipación
> (`context.md` §8). Un correo que llega exactamente a las 24 h —o a las 23 h 40 min, contando la
> imprecisión del cron— le ofrecería al cliente reprogramar sin costo **en el preciso momento en que
> ya no puede**. Con 27 h el margen es real y el correo puede ofrecerlo sin letra pequeña.
>
> El nombre «recordatorio de 24 h» se conserva en el roadmap y en las conversaciones porque es como lo
> pidió la clienta. **El número real es 27**, y vive en el filtro del WF6.

> **Y por qué la ventana empieza en +2 h y no en «ahora».** Para que **no se cruce con la del WF7**,
> que mira los próximos 75 minutos. Si las dos se solaparan y el `PATCH` de uno reescribiera las
> `extendedProperties` en vez de fusionarlas —la semántica exacta de Google en este punto no se ha
> verificado contra el calendario real—, el WF6 podría volver a ver la cita como no recordada y mandar
> un segundo correo. Separar las ventanas hace que la pregunta deje de importar.

## WF7 — Recordatorio 1 h

| | |
|---|---|
| **Trigger** | Schedule, cada **15 minutos** |
| **Busca** | eventos confirmados que empiezan en los próximos **75 minutos**, **sin** `recordatorio1` |
| **Manda** | correo corto: hora, enlace de Meet y poco más |
| **Luego** | `PATCH` escribiendo `recordatorio1 = "enviado"` |

**La ventana es de 75 minutos y no de 60** para que el correo salga *antes* de la hora, no después:
con un cron cada 15 minutos, el cliente lo recibe entre 60 y 75 minutos antes de la cita.

> **El texto no dice «en una hora».** Dice *«tu consulta es hoy a las HH:MM»*. Si n8n estuvo caído y
> el correo sale con 20 minutos de antelación, «en una hora» sería una mentira que hace que el cliente
> llegue tarde; una hora concreta es verdad siempre. Misma razón por la que el recordatorio nunca
> incluye una cuenta atrás.

---

## De dónde salen los datos

De la **descripción del propio evento**, igual que hace el WF3. El evento tentativo que crea el WF2
guarda ahí el contexto, y el WF3 lo reescribe al confirmar conservando el mismo formato:

```
lead_id: <uuid>
Servicio: <nombre>
Slug: <slug>
Telefono: <tel>
Correo: <email>
Huso del cliente: <IANA>

CITA CONFIRMADA. Pago <id> por USD <monto> el <fecha>.
```

Los recordatorios leen `Correo`, `Huso del cliente` y `Servicio` con el mismo parseo por etiqueta que
ya usa el nodo `Sacar los datos del evento`, y el nombre lo sacan del `summary`
(`Consulta — <nombre> — <servicio>`). El enlace de Meet viene en `hangoutLink`.

> **Ningún recordatorio consulta la hoja del CRM.** No la necesita, y consultarla ataría el correo a
> que la fila exista. El calendario tiene todo lo que hace falta.

---

## Qué toca del repo

Casi nada, y conviene decirlo explícitamente para que nadie busque dónde está el código:

| Archivo | Cambio |
|---|---|
| `docs/features/notifications.md` | este documento |
| `docs/00-roadmap.md` · `docs/features/README.md` · `CHANGELOG.md` | estado de la fase |
| `docs/02-architecture.md` | ADR-015, cuando se acepte |

**Cero código nuevo.** No hay endpoint, ni servicio, ni tipo, ni variable de entorno nueva.

> 🧹 **Deuda que esta fase deja a la vista:** `ADMIN_NOTIFICATION_EMAIL` está declarada en
> `src/lib/env.ts` y documentada en `02-architecture.md`, pero **no la lee ni una línea de código** —
> el correo lo manda n8n, que tiene su propia configuración. Es una variable que describe una
> arquitectura anterior a ADR-010. Se decide qué hacer con ella en la FASE 12, junto con el resto de
> variables congeladas de Supabase y Google.

---

## Restricciones

- **Un recordatorio jamás confirma ni cancela nada.** Solo informa. Si el evento no está `confirmed`,
  no existe para estos workflows.
- **Los recordatorios no se mandan a citas pasadas.** La ventana siempre empieza en «ahora».
- **Nunca se manda un recordatorio de una reserva tentativa.** Un evento sin pagar no es una cita
  (ADR-011), y el filtro por `status = confirmed` lo garantiza — el mismo criterio que saca al evento
  del limpiador.
- **El correo del cliente no se toma de ningún payload**, se lee del evento. Es la regla de ADR-014
  aplicada aquí: por el canal solo viajan identificadores.
- **Todo instante se calcula en UTC** y se presenta en dos husos: el del cliente y `America/Chicago`.

---

## Decisiones tomadas (2026-08-06)

1. **La copia interna va a `claudia@leosfirm.com`, en `BCC`.** Es quien atiende las citas, y ya era
   el valor que nombraba la documentación. En `BCC` y no en `CC`: una dirección interna de la firma no
   tiene por qué aparecer en la bandeja del cliente.
2. **El recordatorio «de 24 h» se manda a las 27 horas.** Con 24 exactas, el correo llegaría en el
   preciso instante en que la reprogramación gratuita deja de estar disponible —o después, contando la
   imprecisión del cron—, y ofrecerla sería mentir. Con 27 horas el cliente **todavía está a tiempo**,
   así que el correo puede ofrecer el cambio sin letra pequeña. Se le sigue llamando «el recordatorio
   de 24 h» en el roadmap y en las conversaciones; el número real es 27.
3. **Claudia no recibe recordatorios.** Las citas están en su calendario y Google ya la avisa. Un
   segundo canal solo añade ruido.

---

## Pendiente

- [ ] Decidir los tres puntos de § *Decisiones abiertas* — la clienta
- [ ] Confirmar que el **«De:»** del correo actual es la cuenta de la firma y no `api_gmail_aiinovate`
      (arrastrado de la FASE 6; se ve en cualquier correo de confirmación ya enviado)
- [ ] **Acentos** en el correo de confirmación del WF3 — editar a mano en la UI de n8n
- [ ] `CC` → `BCC` en el WF3, con el destinatario que se decida
- [x] **WF6 creado** (`6836anE95HmUiyDg`, 2026-08-06) — sin publicar
- [x] **WF7 creado** (`Edd15W7W2FS1Cagf`, 2026-08-06) — sin publicar
- [x] 🔑 **Credenciales asignadas a mano en los dos workflows** (2026-08-06). n8n había dejado los
      cuatro nodos HTTP sin credencial y auto-asignado `api_gmail_aiinovate` a los dos de Gmail
- [x] **Revisados y publicados los dos** (2026-08-06) — `active: true` verificado por MCP
- [ ] **Verificar contra una cita real.** Ninguno de los dos ha corrido todavía sobre una cita de
      verdad: las tres reservas que hay en la hoja quedaron en `agenda` sin pagar, y estos workflows
      solo miran eventos `confirmed`. La primera cita pagada es la que los estrena
- [ ] Comprobar en esa primera ejecución que el `PATCH` **fusiona** `extendedProperties` en vez de
      reescribirlas. Las ventanas están separadas justo para no depender de ello, pero conviene saber
      la respuesta antes de la FASE 9
- [ ] Copiar **ADR-015** a [`../02-architecture.md`](../02-architecture.md) cuando se acepte
- [ ] En la **FASE 9** el recordatorio de 24 h llevará enlace para reprogramar o cancelar con token.
      Hoy dirá que llamen. Diseñar el correo sabiendo que ese enlace va a entrar

# Asistente virtual — Leos Firm LLC

> **Estado:** 🎨 diseñado, sin implementar · **Fecha:** 2026-08-07
> **Origen:** *Flujo de Procesos – LEOS FIRM* §2, entregado por la clienta el 2026-08-07
> **Decisión asociada: ADR-018** — el asistente conversa; el servidor decide
> **Lectura previa obligatoria:** [`scheduling.md`](./scheduling.md) ·
> [`lead-diagnostic.md`](./lead-diagnostic.md) · [`../03-security.md`](../03-security.md)

---

## Qué es y por qué existe ahora

Una ventana de conversación que se abre en el sitio **en cuanto el visitante envía el formulario de
diagnóstico**, ya con sus datos en la mano, y lo acompaña hasta que la cita queda agendada. Puede
además cancelar y reprogramar citas existentes.

**Esto revierte una decisión anterior de la propia clienta.** El roadmap registra: *«Agente IA en el
intake — **Eliminada. La clienta pidió explícitamente no usar un agente de IA** en el agendamiento»*.
El 2026-08-07 cambió de criterio: quiere un asistente visible en su web y más desarrollos con IA
después. Queda anotado aquí para que nadie lo lea como un descuido, y porque la razón que motivó
aquel rechazo —el miedo a que una máquina se equivoque con las citas de sus clientes— sigue siendo
válida y es justamente lo que ADR-018 protege.

---

## ADR-018: el asistente conversa; el servidor decide

**Contexto.** La especificación pedía que el asistente tuviera *«autonomía para registrar, modificar
y cancelar todas las citas»*. Eso choca de frente con **ADR-005** (*el agente IA asiste, no decide*),
que prohíbe expresamente que la IA decida disponibilidad o estado de pago.

No es una objeción teórica. Hoy la disponibilidad es **resta determinista** —horario de oficina menos
lo que está ocupado, en `availability.service.ts`, sin red y sin reloj propio— y por eso es imposible
que ofrezca un hueco que no existe. Un modelo con permiso de escritura directa sobre Google Calendar
puede inventar un horario, pisar una cita o borrar la equivocada. En el paso más frágil del embudo y
con dinero detrás.

**Decisión.** El asistente **no toca Google Calendar ni la hoja del CRM**. Cada acción suya es una
llamada a un endpoint que ya existe y ya valida:

```
Visitante ──▶ ventana de chat (Next.js)
                   │  POST { chatInput, sessionId, leadId }
                   ▼
            n8n · AI Agent  ◀── el modelo vive aquí, con las credenciales
                   │  herramientas = HTTP Request
                   ▼
            API de Next.js  ◀── AQUÍ están las reglas de negocio
                   │
                   ▼
            n8n · Calendar · Sheets · Gmail
```

El agente **propone**; el servidor **decide y ejecuta**. Si el modelo alucina un horario, el endpoint
lo rechaza porque revalida contra el calendario real: la alucinación muere ahí y el peor caso es que
el asistente diga una tontería, no que la agenda quede rota.

**Por qué en n8n y no en Next.js.** Decisión de la clienta, 2026-08-07. La alternativa era montarlo en
Next.js con `@anthropic-ai/sdk`, que ya es dependencia. Se acepta el coste —la instancia de n8n entra
en el camino del cliente y su caída se vuelve visible— a cambio de que el modelo, sus credenciales y
sus herramientas vivan donde ya vive todo lo demás (ADR-010), y de que ampliarlo después no requiera
tocar el repositorio.

**Consecuencias.**
- **ADR-005 sigue intacto.** El asistente nunca decide precio, disponibilidad ni estado de pago.
- **Ningún permiso de Google nuevo.** El agente no habla con Google: habla con nuestra API.
- **La ventana de chat es la única pieza nueva en el repo.** Todo lo demás ya existe.
- **Si n8n cae, el chat cae** — y tiene que caer *bien*: ver § Cuando el asistente no está.
- **El chat no es el único camino.** El calendario propio de la FASE 5 sigue en pie y sigue siendo el
  camino por defecto. El asistente es una capa encima, nunca un reemplazo: quien no quiera hablar con
  una máquina agenda como hasta ahora.

---

## Las cinco herramientas del agente

Cada una es un nodo HTTP Request contra nuestra propia API, con el header `x-leosfirm-token`.
**Ninguna otra.** Si mañana hace falta una sexta, se añade aquí primero.

| Herramienta | Endpoint | Qué puede y qué no |
|---|---|---|
| `consultar_servicios` | `GET /api/v1/services` | Lee el catálogo. **Los precios salen de aquí, jamás del modelo** (ADR-006) |
| `consultar_disponibilidad` | `GET /api/v1/availability` | Devuelve huecos reales. El modelo **no calcula fechas**: las pide |
| `reservar_cita` | `POST /api/v1/appointments` | Crea la reserva tentativa. El endpoint revalida el hueco antes de crear nada |
| `cancelar_cita` | `POST /api/v1/appointments/[token]/cancel` | **Exige el token firmado** que el cliente recibió por correo. Sin token no hay cancelación |
| `pedir_otro_horario` | `POST /api/v1/appointments/[token]/reschedule-request` | Le manda el pedido a Claudia. **No reagenda solo** (FASE 9) |

**El token firmado es la frontera de seguridad y no es negociable.** Un visitante solo puede cancelar
o mover la cita cuyo enlace tiene en su correo (ADR-016). El agente no puede saltárselo porque el
endpoint verifica el HMAC, no el agente.

**El cobro no es una herramienta.** El asistente lleva al visitante hasta `/agendar` con el hueco ya
reservado y ahí toma el control la pantalla de pago de siempre. Una IA no toca una tarjeta.

---

## Lo que el asistente NO puede hacer, dicho en voz alta

Esta lista va en el *system prompt* y además está garantizada por construcción — no se apoya en que
el modelo obedezca:

1. **Dar un precio que no venga de `consultar_servicios`.** Ni redondear, ni «desde», ni estimar.
2. **Prometer un horario que no venga de `consultar_disponibilidad`.**
3. **Confirmar una cita.** Una cita se confirma con el pago y solo con el pago (ADR-002).
4. **Dar asesoría fiscal o legal.** Es una firma de consultoría: la respuesta a una pregunta fiscal
   es la consulta que se está vendiendo, no un párrafo de un chatbot. Mandamiento I aplicado al
   producto.
5. **Cancelar o mover nada sin el token.**
6. **Inventar plazos, trámites o requisitos migratorios.**

Ante cualquiera de estas: deriva a Claudia y ofrece el teléfono de la firma.

---

## Cuándo aparece

Según §2 de la especificación: **al mismo tiempo que el lead entra al CRM**, es decir justo después de
`POST /api/v1/leads`. La ventana se abre ya sabiendo nombre, correo, teléfono y el servicio deducido
por el diagnóstico, así que la primera frase del asistente no es «¿en qué te ayudo?» sino algo que
demuestra que leyó el caso.

No reemplaza al popup de diagnóstico: **lo continúa.** El diagnóstico sigue siendo quien captura el
dato antes del pago (ADR-008); el asistente es lo que pasa después.

> ⚠️ **El `leadId` viaja al chat, la PII no.** El asistente recupera nombre y correo llamando a la
> API con ese id, igual que hace el WF3 con el evento de Calendar. Nada de datos personales en el
> cuerpo de la conversación que se manda a n8n.

---

## Cuando el asistente no está

n8n se cae, el modelo tarda, la cuota se acaba. El sitio **no puede depender de esto** (ADR-007), así
que el fallo es suave y en tres niveles:

| Situación | Qué ve el visitante |
|---|---|
| n8n no responde en 20 s | «Ahora mismo no puedo responderte. Puedes elegir día y hora tú mismo aquí» + botón a `/agendar` |
| El agente devuelve error | Lo mismo, más el teléfono de la firma |
| El chat no carga | La página funciona igual. **La ventana es un añadido, no un requisito** |

El botón a `/agendar` siempre está visible dentro del chat. En el peor escenario el visitante hace lo
que hacía ayer.

---

## Seguridad

Detalle completo en [`../03-security.md`](../03-security.md). Lo específico de esta feature:

- **Inyección de prompts.** El visitante escribe texto libre que llega a un modelo con herramientas.
  La mitigación real no es el prompt: es que las cinco herramientas **no pueden hacer daño aunque el
  modelo obedezca al atacante**. Lo peor que se consigue convenciendo al agente es reservar un hueco
  —que se libera solo en 15 minutos— o pedirle a Claudia un cambio de horario por correo.
- **Rate limit por sesión**, no solo por IP: una conversación son muchas llamadas al modelo y eso
  cuesta dinero. Es el único endpoint del proyecto donde el abuso se paga por token consumido.
- **Nada de PII en los logs de n8n.** Las ejecuciones quedan guardadas y son legibles por cualquiera
  con acceso a la instancia.
- **El `sessionId` no es un identificador de seguridad.** No autoriza nada: quien manda es el token
  firmado de ADR-016.

---

## Lo que falta decidir

- [ ] **¿Widget `@n8n/chat` o UI propia?** El paquete oficial es una **dependencia nueva**
      (Mandamiento I: requiere autorización) y trae su propio look, difícil de casar con el design
      system. La UI propia son ~200 líneas de React, respeta los tokens de `globals.css` y se parece
      al popup de diagnóstico que ya existe. **Recomendada: la propia.**
- [ ] **¿Qué modelo?** Afecta al coste por conversación.
- [ ] **¿El asistente también aparece para quien NO hizo el diagnóstico?** Hoy el diseño lo ata al
      final del formulario.
- [ ] **¿Historial?** Sin base de datos (ADR-010) la conversación vive en memoria de la sesión y se
      pierde al recargar.

---

## Checklist de implementación

1. [ ] Workflow `Leos Firm - Asistente virtual` con Chat Trigger + AI Agent + las 5 herramientas
2. [ ] `system prompt` con las seis prohibiciones y el tono de la firma (§ Design System: serio,
       profesional, discreto)
3. [ ] `N8N_ASSISTANT_WEBHOOK_URL` en `env.ts`, `.env.example` y Vercel — **opcional**, como las
       demás de n8n: sin ella el chat no aparece y el sitio sigue igual
4. [ ] `src/components/features/assistant/AssistantDialog/` siguiendo la estructura de
       `DiagnosticDialog`
5. [ ] `src/services/assistant.service.ts` — la llamada a n8n, nunca desde el componente
       (Mandamiento II)
6. [ ] Probar los tres niveles de fallo **antes** de publicar el workflow
7. [ ] Probar la inyección de prompts a mano: pedirle que regale una cita, que dé un precio inventado
       y que cancele una cita ajena

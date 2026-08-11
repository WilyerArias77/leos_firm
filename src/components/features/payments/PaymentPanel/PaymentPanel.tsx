"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, CreditCard, Loader2, Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { COMPANY, PAYMENT_POLL } from "@/constants/business";
import { getSquarePayments } from "@/lib/square/webPayments";
import { formatPrice } from "@/lib/utils/formatCurrency";
import { fetchOrderStatus, submitCheckout } from "@/services/checkout.service";
import type { SquareCard, SquarePayments } from "@/types/square.types";
import type { PaymentPanelProps } from "./PaymentPanel.types";

/**
 * The card form and the charge (`docs/features/payments.md`).
 *
 * The inputs below are **Square's iframes**, not ours: the card number never
 * enters this component, this bundle or this server (`docs/03-security.md`). All
 * that crosses back is a single-use token.
 *
 * It talks to `checkout.service.ts` and never to Square's API or to n8n
 * (Mandamiento II), and it cannot confirm the appointment — it charges, then
 * asks whether the money cleared. The confirmation is the webhook's job
 * (ADR-002), which is why closing this tab mid-payment loses nothing.
 */


/** Square's own error copy is in English; these are the cases worth naming. */
const TOKENIZE_FAILURE = "Revisa los datos de la tarjeta e inténtalo de nuevo.";
const SDK_FAILURE =
  `No pudimos cargar el formulario de pago. Puede ser un bloqueador de anuncios o tu conexión. ` +
  `Recarga la página o escríbenos a ${COMPANY.email}.`;

type Phase = "loading" | "ready" | "paying" | "verifying";

export function PaymentPanel({ service, leadId, eventId, payer, onOutcome }: PaymentPanelProps) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState<string | null>(null);

  // The SDK objects are not state: re-rendering must never re-create the card,
  // or the iframes are torn down while someone is typing into them.
  const cardRef = useRef<SquareCard | null>(null);
  const paymentsRef = useRef<SquarePayments | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const applicationId = process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID;
  const locationId = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID;

  useEffect(() => {
    // Guards a double `attach` under React's development double-effect and a
    // late resolve after unmount — both leave a dead iframe behind.
    let cancelled = false;

    async function mountCard() {
      if (!applicationId || !locationId || !containerRef.current) {
        setError(SDK_FAILURE);
        return;
      }

      try {
        const payments = await getSquarePayments(applicationId, locationId);
        if (cancelled) return;

        const card = await payments.card();
        if (cancelled) {
          void card.detach();
          return;
        }

        await card.attach(containerRef.current);
        if (cancelled) {
          void card.detach();
          return;
        }

        paymentsRef.current = payments;
        cardRef.current = card;
        setPhase("ready");
      } catch {
        if (!cancelled) setError(SDK_FAILURE);
      }
    }

    void mountCard();

    return () => {
      cancelled = true;

      const card = cardRef.current;
      cardRef.current = null;

      // Detach explicitly: Square keeps listeners on the iframes, and a bare
      // unmount leaves them attached to a node React has already removed.
      if (card) void card.detach();
    };
  }, [applicationId, locationId]);

  /**
   * Polls until Square says the money cleared.
   *
   * It gives up after a bounded number of tries and reports `processing`, which
   * is the honest answer: the webhook confirms out of band, so a spinner that
   * never ends would be waiting for something that is not going to happen on
   * this screen.
   */
  async function waitForPayment(orderId: string) {
    for (let attempt = 0; attempt < PAYMENT_POLL.maxAttempts; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, PAYMENT_POLL.intervalMs));

      const status = await fetchOrderStatus(orderId);

      if (status === "paid") {
        onOutcome("confirmed");
        return;
      }

      // Square refused after accepting the charge — rare, and the visitor can
      // try another card: the slot is still held.
      if (status === "failed") {
        setPhase("ready");
        setError("El pago no se completó. Prueba con otra tarjeta.");
        return;
      }
    }

    onOutcome("processing");
  }

  async function handlePay() {
    const card = cardRef.current;
    const payments = paymentsRef.current;

    if (!card || !payments) return;

    setError(null);
    setPhase("paying");

    const tokenResult = await card.tokenize();

    if (tokenResult.status !== "OK" || !tokenResult.token) {
      setPhase("ready");
      setError(tokenResult.errors?.[0]?.message ?? TOKENIZE_FAILURE);
      return;
    }

    /**
     * 3-D Secure, when the bank asks for it.
     *
     * A failure here is deliberately NOT fatal: most US cards are never
     * challenged, and refusing to charge because an optional step broke would
     * lose a real payment. Square declines with
     * `CARD_DECLINED_VERIFICATION_REQUIRED` when the token was genuinely
     * needed, and that message is already handled.
     */
    let verificationToken: string | undefined;

    try {
      setPhase("verifying");

      const [givenName, ...rest] = payer.fullName.trim().split(/\s+/);
      const verification = await payments.verifyBuyer(tokenResult.token, {
        // Square wants the decimal amount as a string. It comes from the
        // catalog value the server rendered, and the server charges its own
        // copy regardless (ADR-006) — this cannot change what is billed.
        amount: (service.priceCents / 100).toFixed(2),
        currencyCode: "USD",
        intent: "CHARGE",
        billingContact: {
          givenName,
          familyName: rest.join(" ") || undefined,
          email: payer.email,
          countryCode: "US",
        },
      });

      verificationToken = verification?.token;
    } catch {
      // Nothing to tell the visitor: the charge is about to be attempted anyway.
      console.warn("[pago] verifyBuyer no completó — se cobra sin token de 3-D Secure");
    }

    setPhase("paying");

    const submission = await submitCheckout({
      leadId,
      serviceSlug: service.slug,
      eventId,
      sourceId: tokenResult.token,
      verificationToken,
    });

    if (!submission.ok) {
      setPhase("ready");
      setError(submission.message);
      return;
    }

    // Already `paid` when Square completes the charge synchronously, which is
    // the normal card case. The poll is for everything else.
    if (submission.result.status === "paid") {
      onOutcome("confirmed");
      return;
    }

    await waitForPayment(submission.result.orderId);
  }

  const busy = phase === "paying" || phase === "verifying";

  // The card never loaded. No form is shown at all — an empty box with a button
  // that cannot work is worse than a phone number.
  if (error && phase === "loading") {
    return (
      <div className="mt-5 rounded-card border border-danger/30 bg-danger/5 p-4">
        <p role="alert" className="flex items-start gap-2 text-xs leading-relaxed text-danger">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {error}
        </p>

        <a
          href={`mailto:${COMPANY.email}`}
          className="mt-3 inline-flex items-center gap-2 text-sm text-accent underline underline-offset-4"
        >
          <Mail className="h-4 w-4" aria-hidden="true" />
          Escribir · {COMPANY.email}
        </a>
      </div>
    );
  }

  return (
    <div className="mt-5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-medium text-ink">
          <CreditCard className="h-4 w-4 text-accent" aria-hidden="true" />
          Pagar con tarjeta
        </p>

        <p className="font-serif text-lg text-navy-900">
          {formatPrice(service.priceCents)} <span className="text-xs text-ink-muted">USD</span>
        </p>
      </div>

      {/* Square's iframes mount inside. It must stay in the DOM across phases:
          unmounting it while paying would destroy the fields mid-charge. */}
      <div ref={containerRef} className="mt-3 min-h-24" />

      {phase === "loading" ? (
        <p className="flex items-center gap-2 text-xs text-ink-muted">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          Cargando el formulario seguro de pago…
        </p>
      ) : null}

      {error && phase !== "loading" ? (
        <p
          role="alert"
          className="mt-3 flex items-start gap-2 rounded-card border border-danger/30 bg-danger/5 p-3 text-xs leading-relaxed text-danger"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : null}

      <Button
        type="button"
        onClick={() => void handlePay()}
        disabled={phase !== "ready"}
        className="mt-4 w-full"
      >
        {busy ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Procesando el pago…
          </>
        ) : (
          "Realizar pago"
        )}
      </Button>

      <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-xs text-ink-muted">
        <Lock className="h-3 w-3" aria-hidden="true" />
        Pago procesado por Square. No guardamos los datos de tu tarjeta.
      </p>
    </div>
  );
}

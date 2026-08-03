"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DIAGNOSTIC_PROMPT } from "@/constants/business";

/**
 * Decides WHEN the diagnosis popup shows up and when it must stay quiet.
 *
 * Two triggers, whichever fires first: time on the page or scroll depth. It
 * never fires on first paint — a popup that lands before the visitor read
 * anything gets dismissed on reflex, and a dismissal costs us the lead.
 *
 * Storage is deliberately split:
 * - declined  → `sessionStorage`, so "solo estoy viendo" is respected for this
 *   visit but a later visit gets another chance.
 * - completed → `localStorage`, so someone who already left their details is
 *   never asked again on that device.
 */

function readFlag(storage: Storage | undefined, key: string): boolean {
  try {
    return storage?.getItem(key) === "1";
  } catch {
    // Private mode and blocked storage: behave as "never asked".
    return false;
  }
}

function writeFlag(storage: Storage | undefined, key: string): void {
  try {
    storage?.setItem(key, "1");
  } catch {
    // Not being able to remember the answer must never break the flow.
  }
}

function hasBeenAnswered(): boolean {
  if (typeof window === "undefined") return false;

  return (
    readFlag(window.sessionStorage, DIAGNOSTIC_PROMPT.declinedStorageKey) ||
    readFlag(window.localStorage, DIAGNOSTIC_PROMPT.completedStorageKey)
  );
}

function scrolledRatio(): number {
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  if (scrollable <= 0) return 0;

  return window.scrollY / scrollable;
}

export type UseDiagnosticPromptOptions = {
  /** `false` on pages where the popup must only open from a button. */
  autoOpen: boolean;
};

export function useDiagnosticPrompt({ autoOpen }: UseDiagnosticPromptOptions) {
  const [isOpen, setIsOpen] = useState(false);
  /** Guards against the timer and the scroll listener both firing. */
  const autoOpenedRef = useRef(false);

  useEffect(() => {
    if (!autoOpen || autoOpenedRef.current || hasBeenAnswered()) return;

    const openOnce = () => {
      if (autoOpenedRef.current) return;
      autoOpenedRef.current = true;
      setIsOpen(true);
    };

    const timer = window.setTimeout(openOnce, DIAGNOSTIC_PROMPT.autoOpenDelayMs);
    const handleScroll = () => {
      if (scrolledRatio() >= DIAGNOSTIC_PROMPT.scrollTriggerRatio) openOnce();
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [autoOpen]);

  const open = useCallback(() => {
    autoOpenedRef.current = true;
    setIsOpen(true);
  }, []);

  const close = useCallback(() => setIsOpen(false), []);

  const decline = useCallback(() => {
    writeFlag(window.sessionStorage, DIAGNOSTIC_PROMPT.declinedStorageKey);
    setIsOpen(false);
  }, []);

  const complete = useCallback(() => {
    writeFlag(window.localStorage, DIAGNOSTIC_PROMPT.completedStorageKey);
  }, []);

  return { isOpen, open, close, decline, complete };
}

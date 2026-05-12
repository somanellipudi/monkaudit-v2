"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

const CLICK_FEEDBACK_MS = 1800;
const NAVIGATION_FALLBACK_MS = 7000;

export function GlobalInteractionFeedback() {
  const pathname = usePathname();
  const [active, setActive] = useState(false);
  const activeElementRef = useRef<HTMLElement | null>(null);
  const timerRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const clearFeedback = useCallback(() => {
    activeElementRef.current?.removeAttribute("data-interaction-loading");
    activeElementRef.current?.removeAttribute("aria-busy");
    activeElementRef.current = null;
    setActive(false);
    clearTimer();
  }, [clearTimer]);

  const startFeedback = useCallback((element: HTMLElement | null, timeout: number) => {
    if (element) {
      activeElementRef.current?.removeAttribute("data-interaction-loading");
      activeElementRef.current = element;
      element.setAttribute("data-interaction-loading", "true");
      element.setAttribute("aria-busy", "true");
    }
    setActive(true);
    clearTimer();
    timerRef.current = window.setTimeout(clearFeedback, timeout);
  }, [clearFeedback, clearTimer]);

  useEffect(() => {
    clearFeedback();
  }, [clearFeedback, pathname]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      const target = event.target instanceof Element ? event.target : null;
      const control = target?.closest<HTMLElement>("button, a, [role='button'], input[type='submit']");
      if (!control || shouldIgnoreClick(event, control)) return;

      const isInternalNavigation = control instanceof HTMLAnchorElement && isSameWindowNavigation(control);
      startFeedback(control, isInternalNavigation ? NAVIGATION_FALLBACK_MS : CLICK_FEEDBACK_MS);
    }

    function handleSubmit(event: SubmitEvent) {
      const submitter = event.submitter instanceof HTMLElement ? event.submitter : null;
      const form = event.target instanceof HTMLFormElement ? event.target : null;
      startFeedback(submitter || form, NAVIGATION_FALLBACK_MS);
    }

    document.addEventListener("click", handleClick, true);
    document.addEventListener("submit", handleSubmit, true);
    return () => {
      document.removeEventListener("click", handleClick, true);
      document.removeEventListener("submit", handleSubmit, true);
      clearTimer();
    };
  }, [clearTimer, startFeedback]);

  return (
    <div
      className="global-interaction-progress"
      data-active={active ? "true" : "false"}
      aria-hidden="true"
    />
  );
}

function shouldIgnoreClick(event: MouseEvent, control: HTMLElement) {
  if (event.defaultPrevented) return true;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return true;
  if (control.hasAttribute("data-no-loader")) return true;
  if (control.hasAttribute("data-print-button")) return true;
  if (control instanceof HTMLButtonElement && control.disabled) return true;
  if (control instanceof HTMLInputElement && control.disabled) return true;
  if (control.getAttribute("aria-disabled") === "true") return true;

  if (control instanceof HTMLAnchorElement) {
    const href = control.getAttribute("href") || "";
    if (!href || href.startsWith("#")) return true;
    if (control.target && control.target !== "_self") return true;
    if (control.hasAttribute("download")) return true;
    if (/^(tel|mailto|sms|whatsapp):/i.test(href)) return true;
  }

  return false;
}

function isSameWindowNavigation(anchor: HTMLAnchorElement) {
  const href = anchor.getAttribute("href") || "";
  if (/^https?:\/\//i.test(href)) {
    try {
      return new URL(href).origin === window.location.origin;
    } catch {
      return false;
    }
  }
  return href.startsWith("/");
}

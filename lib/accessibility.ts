import { useEffect, useRef } from "react";
import type { KeyboardEvent } from "react";

export function useDialogFocusRestore(isOpen: boolean) {
  const opener = useRef<HTMLElement | null>(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    const rememberOutsideFocus = (event: FocusEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement && !target.closest('[role="dialog"][aria-modal="true"]')) {
        opener.current = target;
      }
    };

    document.addEventListener("focusin", rememberOutsideFocus);
    return () => document.removeEventListener("focusin", rememberOutsideFocus);
  }, []);

  useEffect(() => {
    if (isOpen) {
      wasOpen.current = true;
      return;
    }

    if (wasOpen.current) {
      wasOpen.current = false;
      if (opener.current?.isConnected) opener.current.focus();
    }
  }, [isOpen]);
}

export function keepDialogFocusInside(event: KeyboardEvent<HTMLDivElement>) {
  if (event.key !== "Tab") return;

  const dialog = event.currentTarget;
  const focusable = Array.from(
    dialog.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  ).filter((element) => element.getClientRects().length > 0);

  if (!focusable.length) {
    event.preventDefault();
    return;
  }

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = document.activeElement;

  if (event.shiftKey && (active === first || !dialog.contains(active))) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (active === last || !dialog.contains(active))) {
    event.preventDefault();
    first.focus();
  }
}

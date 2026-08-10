"use client";

import { useEffect } from "react";

/**
 * Keeps the student on the opened deep-link page:
 * - hides Telegram BackButton
 * - traps browser back
 * - blocks in-app <a> navigation away from current path
 */
export function LockNavigation() {
  useEffect(() => {
    const wa = window.Telegram?.WebApp;
    try {
      wa?.BackButton?.hide?.();
      wa?.expand?.();
    } catch {
      /* ignore */
    }

    const path = window.location.pathname + window.location.search;
    window.history.pushState({ liqLock: true }, "", path);

    const onPop = () => {
      window.history.pushState({ liqLock: true }, "", path);
    };
    window.addEventListener("popstate", onPop);

    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest?.("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:")) return;
      if (href.startsWith("http") && !href.includes(window.location.host)) {
        return; // allow external if any
      }
      // Block internal navigation (including /admin accidental taps from students)
      if (href.startsWith("/") && !href.startsWith("/admin")) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    document.addEventListener("click", onClick, true);

    return () => {
      window.removeEventListener("popstate", onPop);
      document.removeEventListener("click", onClick, true);
    };
  }, []);

  return null;
}

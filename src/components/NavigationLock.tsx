"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Locks students to the current Mini App page:
 * - blocks in-app link navigation (except /admin)
 * - blocks browser/Telegram back when possible
 */
export function NavigationLock() {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");

  useEffect(() => {
    if (isAdmin) return;

    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href") || "";
      if (!href || href.startsWith("http") || href.startsWith("tg:")) return;
      if (href.startsWith("/admin")) return;
      event.preventDefault();
      event.stopPropagation();
    };

    // Trap history so "back" stays on this page
    const lockState = { liqLock: true };
    try {
      window.history.pushState(lockState, "", window.location.href);
    } catch {
      /* ignore */
    }

    const onPopState = () => {
      try {
        window.history.pushState(lockState, "", window.location.href);
      } catch {
        /* ignore */
      }
    };

    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPopState);

    const wa = window.Telegram?.WebApp as
      | { BackButton?: { hide?: () => void; onClick?: (cb: () => void) => void; offClick?: (cb: () => void) => void } }
      | undefined;
    const back = wa?.BackButton;
    back?.hide?.();
    const ignoreBack = () => {
      back?.hide?.();
    };
    back?.onClick?.(ignoreBack);

    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPopState);
      back?.offClick?.(ignoreBack);
    };
  }, [isAdmin, pathname]);

  return null;
}

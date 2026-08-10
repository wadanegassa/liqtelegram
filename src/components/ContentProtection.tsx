"use client";

import { useEffect } from "react";

/**
 * Best-effort anti-copy / anti-forward UX inside the Mini App.
 * Note: OS-level screenshots cannot be fully blocked on phones.
 */
export function ContentProtection() {
  useEffect(() => {
    document.documentElement.classList.add("liq-protect");

    const block = (e: Event) => {
      e.preventDefault();
      return false;
    };

    const events: Array<keyof DocumentEventMap> = [
      "copy",
      "cut",
      "paste",
      "contextmenu",
      "dragstart",
      "selectstart",
    ];
    events.forEach((name) => document.addEventListener(name, block, true));

    const onKey = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && ["c", "x", "a", "s", "p", "u"].includes(key)) {
        e.preventDefault();
      }
      if (key === "printscreen") {
        e.preventDefault();
      }
    };
    document.addEventListener("keydown", onKey, true);

    return () => {
      document.documentElement.classList.remove("liq-protect");
      events.forEach((name) => document.removeEventListener(name, block, true));
      document.removeEventListener("keydown", onKey, true);
    };
  }, []);

  return null;
}

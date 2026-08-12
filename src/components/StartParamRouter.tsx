"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { parseStartParam, pathForTarget } from "@/lib/links";
import { useTelegram } from "@/components/TelegramProvider";

export function StartParamRouter() {
  const { ready, startParam } = useTelegram();
  const pathname = usePathname();

  useEffect(() => {
    if (!ready || !startParam) return;
    if (pathname !== "/") return;
    const target = parseStartParam(startParam);
    const path = pathForTarget(target);
    if (path === "/") return;
    // Hard navigation so Telegram always loads fresh SSR content (not a soft cache).
    window.location.replace(path);
  }, [ready, startParam, pathname]);

  return null;
}

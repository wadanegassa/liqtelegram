"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { parseStartParam, pathForTarget } from "@/lib/links";
import { useTelegram } from "@/components/TelegramProvider";

export function StartParamRouter() {
  const { ready, startParam } = useTelegram();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!ready || !startParam) return;
    if (pathname !== "/") return;
    const target = parseStartParam(startParam);
    const path = pathForTarget(target);
    if (path !== "/") router.replace(path);
  }, [ready, startParam, pathname, router]);

  return null;
}

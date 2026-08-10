"use client";

import { useEffect, useState } from "react";

type Props = {
  /** Shown as a repeating watermark, e.g. @user · 123456 */
  watermark?: string;
};

/**
 * Best-effort anti-copy / anti-screenshot UX for Mini App lessons.
 * OS screenshots cannot be fully blocked; we blur on leave + watermark leaks.
 */
export function ContentProtection({ watermark }: Props) {
  const [hidden, setHidden] = useState(false);
  const [mark, setMark] = useState(watermark || "Liq Academy");

  useEffect(() => {
    if (watermark) {
      setMark(watermark);
      return;
    }
    const u = window.Telegram?.WebApp?.initDataUnsafe?.user;
    if (u?.id) {
      setMark(u.username ? `@${u.username} · ${u.id}` : `ID ${u.id}`);
    }
  }, [watermark]);

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
      if (
        (e.ctrlKey || e.metaKey) &&
        ["c", "x", "a", "s", "p", "u"].includes(key)
      ) {
        e.preventDefault();
      }
      if (key === "printscreen") {
        e.preventDefault();
        setHidden(true);
        window.setTimeout(() => setHidden(false), 1500);
      }
    };
    document.addEventListener("keydown", onKey, true);

    const cover = () => setHidden(true);
    const uncover = () => {
      if (!document.hidden && document.hasFocus()) setHidden(false);
    };

    const onVisibility = () => {
      if (document.hidden) cover();
      else uncover();
    };

    window.addEventListener("blur", cover);
    window.addEventListener("focus", uncover);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", cover);

    return () => {
      document.documentElement.classList.remove("liq-protect");
      events.forEach((name) => document.removeEventListener(name, block, true));
      document.removeEventListener("keydown", onKey, true);
      window.removeEventListener("blur", cover);
      window.removeEventListener("focus", uncover);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", cover);
    };
  }, []);

  return (
    <>
      <div className="liq-watermark" aria-hidden>
        {Array.from({ length: 24 }).map((_, i) => (
          <span key={i}>{mark}</span>
        ))}
      </div>
      {hidden ? (
        <div className="liq-screenshot-shield" aria-hidden>
          <p>Content hidden</p>
          <p className="liq-screenshot-shield-sub">
            Screenshots are not allowed
          </p>
        </div>
      ) : null}
    </>
  );
}

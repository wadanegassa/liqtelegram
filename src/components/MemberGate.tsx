"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ReaderShell } from "@/components/AppShell";
import { LockNavigation } from "@/components/LockNavigation";
import { ContentProtection } from "@/components/ContentProtection";
import { useTelegram } from "@/components/TelegramProvider";

type State =
  | { kind: "loading" }
  | { kind: "allowed"; watermark: string }
  | { kind: "denied"; message: string };

function readInitData(): string {
  return window.Telegram?.WebApp?.initData || "";
}

/** Wait briefly for Telegram WebApp to inject initData (avoids false "members only"). */
async function waitForInitData(maxMs = 2500): Promise<string> {
  const existing = readInitData();
  if (existing) return existing;

  const started = Date.now();
  while (Date.now() - started < maxMs) {
    await new Promise((r) => setTimeout(r, 50));
    const next = readInitData();
    if (next) return next;
  }
  return readInitData();
}

/**
 * Blocks Mini App content unless the Telegram user is in the paid group.
 */
export function MemberGate({ children }: { children: ReactNode }) {
  const { ready } = useTelegram();
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    if (!ready) return;

    let cancelled = false;

    async function run() {
      const initData = await waitForInitData();
      if (cancelled) return;

      if (!initData) {
        setState({
          kind: "denied",
          message:
            "Open this link from inside Telegram while you are a member of the paid group.",
        });
        return;
      }

      try {
        const res = await fetch("/api/telegram/verify-member", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ initData }),
        });
        const json = await res.json();
        if (cancelled) return;
        if (json.allowed) {
          const u = window.Telegram?.WebApp?.initDataUnsafe?.user;
          const watermark = u
            ? u.username
              ? `@${u.username} · ${u.id}`
              : `ID ${u.id}`
            : `UID ${json.userId || ""}`;
          setState({ kind: "allowed", watermark });
        } else {
          setState({
            kind: "denied",
            message:
              json.error ||
              "Only paid group members can open this content.",
          });
        }
      } catch {
        if (!cancelled) {
          setState({
            kind: "denied",
            message: "Could not verify membership. Try again.",
          });
        }
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [ready]);

  if (state.kind === "loading") {
    return (
      <>
        <LockNavigation />
        <ContentProtection />
        <ReaderShell
          title="Checking access…"
          subtitle="Verifying paid group membership"
        >
          <p className="text-sm text-[var(--tg-hint)]">Please wait.</p>
        </ReaderShell>
      </>
    );
  }

  if (state.kind === "denied") {
    return (
      <>
        <LockNavigation />
        <ContentProtection />
        <ReaderShell title="Access denied" subtitle="Paid group members only">
          <div className="card-liq text-sm leading-relaxed">
            <p>{state.message}</p>
            <p className="mt-3 text-[var(--tg-hint)]">
              Message the bot to pay and join, then open the pinned link again
              from the paid group.
            </p>
          </div>
        </ReaderShell>
      </>
    );
  }

  return (
    <>
      <LockNavigation />
      <ContentProtection watermark={state.watermark} />
      {children}
    </>
  );
}

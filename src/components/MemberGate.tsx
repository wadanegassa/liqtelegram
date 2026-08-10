"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ReaderShell } from "@/components/AppShell";
import { LockNavigation } from "@/components/LockNavigation";
import { ContentProtection } from "@/components/ContentProtection";

type State =
  | { kind: "loading" }
  | { kind: "allowed" }
  | { kind: "denied"; message: string };

/**
 * Blocks Mini App content unless the Telegram user is in the paid group.
 */
export function MemberGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const initData = window.Telegram?.WebApp?.initData || "";
      if (!initData) {
        if (!cancelled) {
          setState({
            kind: "denied",
            message:
              "Open this link from inside Telegram while you are a member of the paid group.",
          });
        }
        return;
      }

      try {
        const res = await fetch("/api/telegram/verify-member", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ initData }),
        });
        const json = await res.json();
        if (cancelled) return;
        if (json.allowed) {
          setState({ kind: "allowed" });
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
  }, []);

  if (state.kind === "loading") {
    return (
      <>
        <LockNavigation />
        <ContentProtection />
        <ReaderShell title="Checking access…" subtitle="Verifying paid group membership">
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
              Message the bot to pay and join, then open the pinned link again from
              the paid group.
            </p>
          </div>
        </ReaderShell>
      </>
    );
  }

  return (
    <>
      <LockNavigation />
      <ContentProtection />
      {children}
    </>
  );
}

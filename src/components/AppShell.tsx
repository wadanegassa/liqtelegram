"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ThemeToggle } from "@/components/ThemeProvider";

function TopBar() {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <p className="text-xs font-semibold tracking-[0.18em] uppercase text-[var(--tg-text)]">
        Liq Academy
      </p>
      <ThemeToggle />
    </div>
  );
}

/** Locked reader chrome — no back / browse links (student deep links). */
export function ReaderShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto min-h-screen w-full max-w-3xl px-2 pb-12 pt-4 sm:px-4 sm:pt-5">
      <header className="mb-6 border-b border-[var(--tg-text)] pb-4">
        <TopBar />
        <h1 className="mt-2 text-2xl leading-tight font-semibold tracking-tight text-[var(--tg-text)] sm:text-3xl">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-2 text-[15px] leading-relaxed text-[var(--tg-hint)]">
            {subtitle}
          </p>
        ) : null}
      </header>
      {children}
    </div>
  );
}

/** Admin chrome — navigation allowed. */
export function AppShell({
  title,
  subtitle,
  children,
  backHref,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  backHref?: string;
}) {
  return (
    <div className="mx-auto min-h-screen w-full max-w-5xl px-3 pb-10 pt-5 sm:px-4">
      <header className="mb-6 border-b border-[var(--tg-text)] pb-4">
        <TopBar />
        {backHref ? (
          <Link
            href={backHref}
            className="mt-1 inline-block text-sm text-[var(--tg-hint)] underline-offset-2 hover:underline"
          >
            ← Back
          </Link>
        ) : null}
        <h1 className="mt-2 text-2xl leading-tight font-semibold tracking-tight text-[var(--tg-text)] sm:text-3xl">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-[var(--tg-hint)]">
            {subtitle}
          </p>
        ) : null}
      </header>
      {children}
    </div>
  );
}

export function AccessGate() {
  return (
    <ReaderShell
      title="Members only"
      subtitle="Open a course, chapter, or exam link from the paid Telegram group."
    >
      <div className="card-liq text-sm leading-relaxed text-[var(--tg-text)]">
        <p>
          This Mini App does not have a public menu. Your admin pins the correct
          link in each group topic.
        </p>
        <p className="mt-3 text-[var(--tg-hint)]">
          If you are not in the paid group yet, message the bot to pay and join.
        </p>
      </div>
    </ReaderShell>
  );
}

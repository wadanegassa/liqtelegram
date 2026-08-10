import Link from "next/link";
import type { ReactNode } from "react";

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
    <div className="mx-auto min-h-screen w-full max-w-3xl px-4 pb-12 pt-6">
      <header className="mb-6 border-b border-black pb-4">
        <p className="text-xs font-semibold tracking-[0.18em] uppercase text-black">
          Liq Academy
        </p>
        <h1 className="mt-3 text-2xl leading-tight font-semibold tracking-tight text-black sm:text-3xl">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-2 text-[15px] leading-relaxed text-neutral-600">
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
    <div className="mx-auto min-h-screen w-full max-w-3xl px-4 pb-10 pt-5">
      <header className="mb-6 border-b border-black pb-4">
        <p className="text-xs font-semibold tracking-[0.18em] uppercase text-black">
          Liq Academy
        </p>
        {backHref ? (
          <Link
            href={backHref}
            className="mt-2 inline-block text-sm text-neutral-600 underline-offset-2 hover:underline"
          >
            ← Back
          </Link>
        ) : null}
        <h1 className="mt-3 text-2xl leading-tight font-semibold tracking-tight text-black sm:text-3xl">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-neutral-600">
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
      <div className="border border-black bg-white p-5 text-sm leading-relaxed text-black">
        <p>
          This Mini App does not have a public menu. Your admin pins the correct
          link in each group topic.
        </p>
        <p className="mt-3 text-neutral-600">
          If you are not in the paid group yet, message the bot to pay and join.
        </p>
      </div>
    </ReaderShell>
  );
}

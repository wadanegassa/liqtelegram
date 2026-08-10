import type { ReactNode } from "react";

/** Read-only shell: no back links, no in-app navigation chrome. */
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
    <div className="reader-shell mx-auto min-h-screen w-full max-w-2xl px-4 pb-12 pt-6">
      <header className="mb-6 border-b border-black pb-4">
        <p className="text-xs font-semibold tracking-[0.16em] uppercase">
          Liq Academy
        </p>
        <h1 className="font-display mt-3 text-[1.75rem] leading-tight font-semibold tracking-tight sm:text-3xl">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-2 text-sm leading-relaxed text-neutral-600">
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
    <ReaderShell title="Liq Academy">
      <p className="text-[15px] leading-relaxed text-neutral-700">
        Open a course, chapter, or exam link from the paid Telegram group to
        read materials here.
      </p>
    </ReaderShell>
  );
}

import Link from "next/link";
import type { ReactNode } from "react";

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
      <header className="mb-6">
        <p className="font-display text-sm font-semibold tracking-[0.14em] text-[var(--liq-accent)] uppercase">
          Liq Academy
        </p>
        {backHref ? (
          <Link
            href={backHref}
            className="mt-2 inline-block text-sm text-[var(--tg-hint)] underline-offset-2 hover:underline"
          >
            ← Back
          </Link>
        ) : null}
        <h1 className="font-display mt-2 text-3xl leading-tight font-semibold tracking-tight">
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

export function NavCards() {
  const items = [
    {
      href: "/courses",
      title: "Courses",
      desc: "Chapters and explanations by subject",
    },
    {
      href: "/departments",
      title: "Departments",
      desc: "Pick a major with clear guidance",
    },
  ];

  return (
    <div className="grid gap-3">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="rounded-2xl border border-[color:color-mix(in_srgb,var(--tg-text)_12%,transparent)] bg-[var(--tg-secondary)] px-4 py-4 transition hover:brightness-[0.98]"
        >
          <div className="font-display text-xl font-semibold">{item.title}</div>
          <p className="mt-1 text-sm text-[var(--tg-hint)]">{item.desc}</p>
        </Link>
      ))}
    </div>
  );
}

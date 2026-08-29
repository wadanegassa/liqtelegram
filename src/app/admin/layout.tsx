import type { ReactNode } from "react";

/** Admin uses a clean browser layout (no Mini App routing). */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-[var(--tg-bg)]">{children}</div>;
}

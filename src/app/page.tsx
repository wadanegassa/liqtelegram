"use client";

import { AppShell, NavCards } from "@/components/AppShell";
import { useTelegram } from "@/components/TelegramProvider";

export default function HomePage() {
  const { userName } = useTelegram();

  return (
    <AppShell
      title="Freshman course support"
      subtitle={
        userName
          ? `Hi ${userName}. Open a course, revise chapters, practice past exams, or explore departments.`
          : "Open a course, revise chapters, practice past exams, or explore departments — all inside Telegram."
      }
    >
      <NavCards />
      <p className="mt-8 text-center text-xs text-[var(--tg-hint)]">
        Tip: each course topic in the paid group has a pinned link that opens
        that course here.
      </p>
    </AppShell>
  );
}

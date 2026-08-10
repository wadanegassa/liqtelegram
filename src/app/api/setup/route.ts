import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = createAdminSupabase();
    const tables = [
      "courses",
      "chapters",
      "exams",
      "departments",
      "members",
      "payment_requests",
    ] as const;
    const status: Record<string, "ok" | "missing" | "error"> = {};

    for (const table of tables) {
      const { error } = await supabase.from(table).select("*").limit(1);
      if (!error) status[table] = "ok";
      else if (error.message.toLowerCase().includes("could not find the table"))
        status[table] = "missing";
      else if (error.code === "PGRST205") status[table] = "missing";
      else status[table] = "error";
    }

    const contentReady = ["courses", "chapters", "exams", "departments"].every(
      (t) => status[t] === "ok"
    );
    const botReady = ["members", "payment_requests"].every(
      (t) => status[t] === "ok"
    );

    return NextResponse.json({
      ready: contentReady && botReady,
      contentReady,
      botReady,
      status,
      setup: !contentReady
        ? "Run supabase/schema.sql in Supabase SQL Editor."
        : !botReady
          ? "Run supabase/payments.sql in Supabase SQL Editor."
          : null,
      botEnv: {
        adminGroup: Boolean(process.env.TELEGRAM_ADMIN_GROUP_ID),
        paidGroup: Boolean(process.env.TELEGRAM_PAID_GROUP_ID),
        appUrl: Boolean(process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL),
      },
    });
  } catch (e) {
    return NextResponse.json(
      {
        ready: false,
        error: e instanceof Error ? e.message : "Failed",
      },
      { status: 500 }
    );
  }
}

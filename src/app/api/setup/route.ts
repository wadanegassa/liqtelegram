import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = createAdminSupabase();
    const tables = ["courses", "chapters", "exams", "departments"] as const;
    const status: Record<string, "ok" | "missing" | "error"> = {};

    for (const table of tables) {
      const { error } = await supabase.from(table).select("id").limit(1);
      if (!error) status[table] = "ok";
      else if (error.message.toLowerCase().includes("could not find the table"))
        status[table] = "missing";
      else if (error.code === "PGRST205") status[table] = "missing";
      else status[table] = "error";
    }

    const ready = Object.values(status).every((s) => s === "ok");
    return NextResponse.json({
      ready,
      status,
      setup: ready
        ? null
        : "Open Supabase → SQL Editor, paste supabase/schema.sql, click Run.",
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

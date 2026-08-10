import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { DEFAULT_BOT_SETTINGS } from "@/lib/bot-settings";
import { createAdminSupabase } from "@/lib/supabase/admin";

const FIELDS = [
  "welcome_text",
  "payment_instructions",
  "help_text",
  "ask_screenshot_text",
  "proof_received_text",
  "approved_text",
  "rejected_text",
  "status_member_text",
  "status_pending_text",
  "status_none_text",
] as const;

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createAdminSupabase();
    const { data, error } = await supabase
      .from("bot_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    if (error) {
      return NextResponse.json({
        settings: { id: 1, ...DEFAULT_BOT_SETTINGS },
        hint: "Run supabase/bot_settings.sql in Supabase SQL Editor, then save again.",
        error: error.message,
      });
    }

    return NextResponse.json({
      settings: data || { id: 1, ...DEFAULT_BOT_SETTINGS },
      hint: data
        ? null
        : "No settings row yet — save once after running supabase/bot_settings.sql.",
    });
  } catch (e) {
    return NextResponse.json({
      settings: { id: 1, ...DEFAULT_BOT_SETTINGS },
      error: e instanceof Error ? e.message : "Failed",
      hint: "Run supabase/bot_settings.sql in Supabase SQL Editor.",
    });
  }
}

export async function PUT(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const row: Record<string, string | number> = {
    id: 1,
    updated_at: new Date().toISOString(),
  };

  for (const field of FIELDS) {
    row[field] =
      body[field] !== undefined
        ? String(body[field])
        : DEFAULT_BOT_SETTINGS[field];
  }

  const supabase = createAdminSupabase();
  const { data, error } = await supabase
    .from("bot_settings")
    .upsert(row, { onConflict: "id" })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json(
      {
        error: error.message,
        hint: "Run supabase/bot_settings.sql in Supabase SQL Editor.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ settings: data });
}

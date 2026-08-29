import { createAdminSupabase } from "@/lib/supabase/admin";
import {
  DEFAULT_BOT_SETTINGS,
  type BotSettings,
} from "@/lib/bot-settings";

function pick(
  data: Record<string, unknown> | null,
  key: keyof typeof DEFAULT_BOT_SETTINGS
): string {
  const value = data?.[key];
  if (typeof value === "string" && value.trim()) return value;
  return DEFAULT_BOT_SETTINGS[key];
}

export async function getBotSettings(): Promise<BotSettings> {
  try {
    const supabase = createAdminSupabase();
    const { data, error } = await supabase
      .from("bot_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    if (error || !data) {
      return { id: 1, ...DEFAULT_BOT_SETTINGS };
    }

    const row = data as Record<string, unknown>;
    return {
      id: 1,
      welcome_text: pick(row, "welcome_text"),
      payment_instructions: pick(row, "payment_instructions"),
      help_text: pick(row, "help_text"),
      ask_screenshot_text: pick(row, "ask_screenshot_text"),
      proof_received_text: pick(row, "proof_received_text"),
      approved_text: pick(row, "approved_text"),
      rejected_text: pick(row, "rejected_text"),
      status_member_text: pick(row, "status_member_text"),
      status_pending_text: pick(row, "status_pending_text"),
      status_none_text: pick(row, "status_none_text"),
      payment_amount: pick(row, "payment_amount"),
      payment_account_name: pick(row, "payment_account_name"),
      telebirr_phone: pick(row, "telebirr_phone"),
      telebirr_name: pick(row, "telebirr_name"),
      cbe_account_number: pick(row, "cbe_account_number"),
      cbe_account_name: pick(row, "cbe_account_name"),
      updated_at:
        typeof row.updated_at === "string" ? row.updated_at : undefined,
    };
  } catch {
    return { id: 1, ...DEFAULT_BOT_SETTINGS };
  }
}

import { createAdminSupabase } from "@/lib/supabase/admin";
import {
  DEFAULT_BOT_SETTINGS,
  type BotSettings,
} from "@/lib/bot-settings";

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

    return {
      id: 1,
      welcome_text: data.welcome_text || DEFAULT_BOT_SETTINGS.welcome_text,
      payment_instructions:
        data.payment_instructions || DEFAULT_BOT_SETTINGS.payment_instructions,
      help_text: data.help_text || DEFAULT_BOT_SETTINGS.help_text,
      ask_screenshot_text:
        data.ask_screenshot_text || DEFAULT_BOT_SETTINGS.ask_screenshot_text,
      proof_received_text:
        data.proof_received_text || DEFAULT_BOT_SETTINGS.proof_received_text,
      approved_text: data.approved_text || DEFAULT_BOT_SETTINGS.approved_text,
      rejected_text: data.rejected_text || DEFAULT_BOT_SETTINGS.rejected_text,
      status_member_text:
        data.status_member_text || DEFAULT_BOT_SETTINGS.status_member_text,
      status_pending_text:
        data.status_pending_text || DEFAULT_BOT_SETTINGS.status_pending_text,
      status_none_text:
        data.status_none_text || DEFAULT_BOT_SETTINGS.status_none_text,
      updated_at: data.updated_at,
    };
  } catch {
    return { id: 1, ...DEFAULT_BOT_SETTINGS };
  }
}

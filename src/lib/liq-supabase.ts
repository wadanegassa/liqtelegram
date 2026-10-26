import { createClient, SupabaseClient } from "@supabase/supabase-js";

let liqAdminClient: SupabaseClient | null = null;

/** LIQ (temari) Supabase — separate project from Telegram mini app. */
export function createLiqAdminSupabase(): SupabaseClient | null {
  const url = process.env.LIQ_SUPABASE_URL?.trim();
  const key = process.env.LIQ_SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  if (!liqAdminClient) {
    liqAdminClient = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return liqAdminClient;
}

export function liqConfigured(): boolean {
  return Boolean(
    process.env.LIQ_SUPABASE_URL?.trim() &&
      process.env.LIQ_SUPABASE_SERVICE_ROLE_KEY?.trim()
  );
}

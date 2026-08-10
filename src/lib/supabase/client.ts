import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function getSupabasePublicConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return { url, key };
}

export function createBrowserSupabase(): SupabaseClient {
  const config = getSupabasePublicConfig();
  if (!config) {
    throw new Error(
      "Missing Supabase public env vars. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel → Settings → Environment Variables, then redeploy."
    );
  }
  return createClient(config.url, config.key);
}

export function tryCreateBrowserSupabase(): SupabaseClient | null {
  const config = getSupabasePublicConfig();
  if (!config) return null;
  return createClient(config.url, config.key);
}

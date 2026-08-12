import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabasePublicConfig } from "@/lib/supabase/client";

/** Always bypass Next.js Data Cache so admin content edits show immediately. */
function noStoreFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  return fetch(input, {
    ...init,
    cache: "no-store",
    next: { revalidate: 0 },
  } as RequestInit);
}

export function createServerSupabase(): SupabaseClient {
  const config = getSupabasePublicConfig();
  if (!config) {
    throw new Error(
      "Missing Supabase public env vars. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel → Settings → Environment Variables, then redeploy."
    );
  }
  return createClient(config.url, config.key, {
    global: { fetch: noStoreFetch },
  });
}

export function tryCreateServerSupabase(): SupabaseClient | null {
  const config = getSupabasePublicConfig();
  if (!config) return null;
  return createClient(config.url, config.key, {
    global: { fetch: noStoreFetch },
  });
}

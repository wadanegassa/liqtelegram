/**
 * Resolve markdown image/file paths for the Mini App.
 * Absolute http(s)/data URLs are kept. Relative paths like
 * `graphs/circular_flow_labeled.png` map to the public content bucket.
 */
export function resolveContentUrl(src: string | undefined | null): string {
  if (!src) return "";
  const trimmed = src.trim();
  if (!trimmed) return "";
  if (/^(https?:|data:|blob:)/i.test(trimmed)) return trimmed;

  const clean = trimmed.replace(/^\.\//, "").replace(/^\/+/, "");
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const bucket =
    process.env.NEXT_PUBLIC_CONTENT_BUCKET?.trim() || "liq-content";

  if (supabaseUrl) {
    return `${supabaseUrl}/storage/v1/object/public/${bucket}/${clean}`;
  }

  const appUrl = (
    process.env.NEXT_PUBLIC_APP_URL ||
    (typeof window !== "undefined" ? window.location.origin : "")
  ).replace(/\/$/, "");
  return appUrl ? `${appUrl}/${clean}` : `/${clean}`;
}

export const CONTENT_BUCKET =
  process.env.NEXT_PUBLIC_CONTENT_BUCKET?.trim() || "liq-content";

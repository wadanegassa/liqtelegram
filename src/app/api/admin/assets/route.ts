import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { CONTENT_BUCKET, resolveContentUrl } from "@/lib/content-assets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
const ALLOWED = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
] as const;

function sanitizePath(input: string, fallbackName: string): string | null {
  const raw = (input || fallbackName).trim().replace(/\\/g, "/");
  const clean = raw.replace(/^\/+/, "").replace(/\.\./g, "");
  if (!clean || clean.includes("..")) return null;
  if (!/^[a-zA-Z0-9/_\-. ]+$/.test(clean)) return null;
  return clean.replace(/\s+/g, "_");
}

async function ensurePublicBucket() {
  const supabase = createAdminSupabase();
  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = (buckets || []).some((b) => b.name === CONTENT_BUCKET);
  if (!exists) {
    const { error } = await supabase.storage.createBucket(CONTENT_BUCKET, {
      public: true,
      fileSizeLimit: MAX_BYTES,
      allowedMimeTypes: [...ALLOWED],
    });
    if (error && !/already exists/i.test(error.message)) {
      throw new Error(error.message);
    }
  } else {
    await supabase.storage.updateBucket(CONTENT_BUCKET, {
      public: true,
      fileSizeLimit: MAX_BYTES,
      allowedMimeTypes: [...ALLOWED],
    });
  }
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }
    if (file.size <= 0 || file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "File must be between 1 byte and 8 MB" },
        { status: 400 }
      );
    }
    const mime = file.type || "application/octet-stream";
    if (!(ALLOWED as readonly string[]).includes(mime)) {
      return NextResponse.json(
        { error: "Only PNG, JPEG, WebP, GIF, or SVG images are allowed" },
        { status: 400 }
      );
    }

    const requestedPath = String(form.get("path") || "");
    const path = sanitizePath(requestedPath, `graphs/${file.name}`);
    if (!path) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    await ensurePublicBucket();
    const supabase = createAdminSupabase();
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { error } = await supabase.storage
      .from(CONTENT_BUCKET)
      .upload(path, bytes, { contentType: mime, upsert: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const publicUrl = resolveContentUrl(path);
    const markdown = `![${file.name.replace(/\.[^.]+$/, "")}](${path})`;

    return NextResponse.json({
      ok: true,
      path,
      publicUrl,
      markdown,
      bucket: CONTENT_BUCKET,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Upload failed" },
      { status: 500 }
    );
  }
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({
    bucket: CONTENT_BUCKET,
    example:
      "![Circular flow](graphs/circular_flow_labeled.png)",
    tip: "Upload images with path graphs/your-file.png so markdown like that works.",
  });
}

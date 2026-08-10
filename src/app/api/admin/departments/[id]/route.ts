import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { isValidSlug, slugify } from "@/lib/slug";

type Params = { params: { id: string } };

export async function PATCH(request: Request, { params }: Params) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (body.title !== undefined) patch.title = String(body.title).trim();
  if (body.summary !== undefined) patch.summary = String(body.summary).trim();
  if (body.content_md !== undefined) patch.content_md = String(body.content_md);
  if (body.sort_order !== undefined)
    patch.sort_order = Number(body.sort_order) || 0;
  if (body.slug !== undefined) {
    let slug = String(body.slug).trim() || slugify(String(body.title || ""));
    if (!isValidSlug(slug)) slug = slugify(slug);
    if (!isValidSlug(slug)) {
      return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
    }
    patch.slug = slug;
  }

  const supabase = createAdminSupabase();
  const { data, error } = await supabase
    .from("departments")
    .update(patch)
    .eq("id", params.id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ department: data });
}

export async function DELETE(_request: Request, { params }: Params) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminSupabase();
  const { error } = await supabase
    .from("departments")
    .delete()
    .eq("id", params.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

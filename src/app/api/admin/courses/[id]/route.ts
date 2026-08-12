import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { isValidSlug, slugify } from "@/lib/slug";
import { revalidateCourseContent } from "@/lib/revalidate-content";

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
  if (body.description !== undefined)
    patch.description = String(body.description).trim();
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
  const { data: before } = await supabase
    .from("courses")
    .select("slug")
    .eq("id", params.id)
    .maybeSingle();

  const { data, error } = await supabase
    .from("courses")
    .update(patch)
    .eq("id", params.id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidateCourseContent(data.slug);
  if (before?.slug && before.slug !== data.slug) {
    revalidateCourseContent(before.slug);
  }

  return NextResponse.json({ course: data });
}

export async function DELETE(_request: Request, { params }: Params) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminSupabase();
  const { data: before } = await supabase
    .from("courses")
    .select("slug")
    .eq("id", params.id)
    .maybeSingle();

  const { error } = await supabase.from("courses").delete().eq("id", params.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (before?.slug) revalidateCourseContent(before.slug);

  return NextResponse.json({ ok: true });
}

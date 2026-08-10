import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { isValidSlug, slugify } from "@/lib/slug";

export async function GET(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const courseId = new URL(request.url).searchParams.get("course_id");
  const supabase = createAdminSupabase();
  let query = supabase.from("exams").select("*");
  if (courseId) query = query.eq("course_id", courseId);
  const { data, error } = await query
    .order("sort_order", { ascending: true })
    .order("title", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ exams: data });
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const course_id = String(body.course_id || "").trim();
  const title = String(body.title || "").trim();
  const content_md = String(body.content_md || "");
  const year = String(body.year || "").trim();
  const sort_order = Number(body.sort_order ?? 0) || 0;
  let slug = String(body.slug || "").trim() || slugify(title);

  if (!course_id || !title) {
    return NextResponse.json(
      { error: "course_id and title are required" },
      { status: 400 }
    );
  }
  if (!isValidSlug(slug)) slug = slugify(slug || title);
  if (!isValidSlug(slug)) {
    return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
  }

  const supabase = createAdminSupabase();
  const { data, error } = await supabase
    .from("exams")
    .insert({ course_id, title, content_md, year, slug, sort_order })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ exam: data }, { status: 201 });
}

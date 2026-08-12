import { revalidatePath } from "next/cache";
import { createAdminSupabase } from "@/lib/supabase/admin";

/** Bust cached Mini App content pages after admin writes. */
export function revalidateCourseContent(
  courseSlug: string,
  opts?: { chapterSlug?: string; examSlug?: string }
) {
  revalidatePath(`/courses/${courseSlug}`);
  if (opts?.chapterSlug) {
    revalidatePath(`/courses/${courseSlug}/chapters/${opts.chapterSlug}`);
  }
  if (opts?.examSlug) {
    revalidatePath(`/courses/${courseSlug}/exams/${opts.examSlug}`);
  }
  revalidatePath("/courses", "layout");
}

export function revalidateDepartmentContent(slug: string) {
  revalidatePath(`/departments/${slug}`);
  revalidatePath("/departments", "layout");
}

export async function courseSlugById(courseId: string): Promise<string | null> {
  const supabase = createAdminSupabase();
  const { data } = await supabase
    .from("courses")
    .select("slug")
    .eq("id", courseId)
    .maybeSingle();
  return data?.slug ?? null;
}

import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { createBrowserSupabase } from "@/lib/supabase/client";
import type { Course } from "@/lib/types";

export const dynamic = "force-dynamic";

async function getCourses(): Promise<{ courses: Course[]; error?: string }> {
  try {
    const supabase = createBrowserSupabase();
    const { data, error } = await supabase
      .from("courses")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("title", { ascending: true });
    if (error) return { courses: [], error: error.message };
    return { courses: data || [] };
  } catch (e) {
    return { courses: [], error: e instanceof Error ? e.message : "Failed" };
  }
}

export default async function CoursesPage() {
  const { courses, error } = await getCourses();

  return (
    <AppShell
      title="Courses"
      subtitle="Pick a course to browse chapters and past exams."
      backHref="/"
    >
      {error ? (
        <div className="card-liq text-sm text-red-700">
          Could not load courses. Run <code>supabase/schema.sql</code> in your
          Supabase SQL editor if tables are missing.
          <div className="mt-2 text-xs opacity-80">{error}</div>
        </div>
      ) : null}

      {!error && courses.length === 0 ? (
        <div className="card-liq text-sm text-[var(--tg-hint)]">
          No courses yet. An admin can add them from the admin dashboard.
        </div>
      ) : null}

      <div className="grid gap-3">
        {courses.map((course) => (
          <Link
            key={course.id}
            href={`/courses/${course.slug}`}
            className="card-liq block transition hover:bg-white"
          >
            <h2 className="font-display text-xl font-semibold">{course.title}</h2>
            {course.description ? (
              <p className="mt-1 text-sm text-[var(--tg-hint)]">
                {course.description}
              </p>
            ) : null}
          </Link>
        ))}
      </div>
    </AppShell>
  );
}

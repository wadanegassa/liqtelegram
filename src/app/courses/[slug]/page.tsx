import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { createBrowserSupabase } from "@/lib/supabase/client";
import type { Chapter, Course, Exam } from "@/lib/types";

export const dynamic = "force-dynamic";

type Props = { params: { slug: string } };

async function getCourseBundle(slug: string) {
  const supabase = createBrowserSupabase();
  const { data: course } = await supabase
    .from("courses")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (!course) return null;

  const [{ data: chapters }, { data: exams }] = await Promise.all([
    supabase
      .from("chapters")
      .select("*")
      .eq("course_id", course.id)
      .order("sort_order", { ascending: true })
      .order("title", { ascending: true }),
    supabase
      .from("exams")
      .select("*")
      .eq("course_id", course.id)
      .order("sort_order", { ascending: true })
      .order("title", { ascending: true }),
  ]);

  return {
    course: course as Course,
    chapters: (chapters || []) as Chapter[],
    exams: (exams || []) as Exam[],
  };
}

export default async function CoursePage({ params }: Props) {
  const bundle = await getCourseBundle(params.slug);
  if (!bundle) notFound();
  const { course, chapters, exams } = bundle;

  return (
    <AppShell
      title={course.title}
      subtitle={course.description || "Chapters and past exams for this course."}
      backHref="/courses"
    >
      <section className="mb-8">
        <h2 className="font-display mb-3 text-lg font-semibold">Chapters</h2>
        {chapters.length === 0 ? (
          <p className="text-sm text-[var(--tg-hint)]">No chapters yet.</p>
        ) : (
          <div className="grid gap-2">
            {chapters.map((chapter, i) => (
              <Link
                key={chapter.id}
                href={`/courses/${course.slug}/chapters/${chapter.slug}`}
                className="card-liq flex items-start gap-3"
              >
                <span className="mt-0.5 text-xs font-semibold text-[var(--liq-accent)]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="font-medium">{chapter.title}</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-display mb-3 text-lg font-semibold">Past exams</h2>
        {exams.length === 0 ? (
          <p className="text-sm text-[var(--tg-hint)]">No exams yet.</p>
        ) : (
          <div className="grid gap-2">
            {exams.map((exam) => (
              <Link
                key={exam.id}
                href={`/courses/${course.slug}/exams/${exam.slug}`}
                className="card-liq block"
              >
                <div className="font-medium">{exam.title}</div>
                {exam.year ? (
                  <div className="mt-1 text-xs text-[var(--tg-hint)]">
                    {exam.year}
                  </div>
                ) : null}
              </Link>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}

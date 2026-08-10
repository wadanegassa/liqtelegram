import { ReaderShell } from "@/components/AppShell";
import { LockNavigation } from "@/components/LockNavigation";
import { tryCreateBrowserSupabase } from "@/lib/supabase/client";
import type { Chapter, Course, Exam } from "@/lib/types";

export const dynamic = "force-dynamic";

type Props = { params: { slug: string } };

async function getCourseBundle(slug: string): Promise<
  | { ok: true; course: Course; chapters: Chapter[]; exams: Exam[] }
  | { ok: false; error: string }
> {
  const supabase = tryCreateBrowserSupabase();
  if (!supabase) {
    return { ok: false, error: "Content is temporarily unavailable." };
  }

  const { data: course, error } = await supabase
    .from("courses")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!course) return { ok: false, error: "not_found" };

  const [{ data: chapters }, { data: exams }] = await Promise.all([
    supabase
      .from("chapters")
      .select("id, title, slug, sort_order")
      .eq("course_id", course.id)
      .order("sort_order", { ascending: true })
      .order("title", { ascending: true }),
    supabase
      .from("exams")
      .select("id, title, slug, year, sort_order")
      .eq("course_id", course.id)
      .order("sort_order", { ascending: true })
      .order("title", { ascending: true }),
  ]);

  return {
    ok: true,
    course: course as Course,
    chapters: (chapters || []) as Chapter[],
    exams: (exams || []) as Exam[],
  };
}

export default async function CoursePage({ params }: Props) {
  const bundle = await getCourseBundle(params.slug);

  if (!bundle.ok) {
    return (
      <>
        <LockNavigation />
        <ReaderShell
          title={bundle.error === "not_found" ? "Course not found" : "Error"}
          subtitle={
            bundle.error === "not_found"
              ? "This link does not match any course."
              : bundle.error
          }
        >
          <p className="text-sm text-neutral-600">
            Ask your admin for an updated link from the paid group.
          </p>
        </ReaderShell>
      </>
    );
  }

  const { course, chapters, exams } = bundle;

  return (
    <>
      <LockNavigation />
      <ReaderShell
        title={course.title}
        subtitle={course.description || undefined}
      >
        <section className="card-liq mb-5">
          <h2 className="mb-3 text-sm font-semibold tracking-wide uppercase">
            Chapters
          </h2>
          {chapters.length === 0 ? (
            <p className="text-sm text-neutral-600">No chapters listed.</p>
          ) : (
            <ol className="space-y-2 text-[15px] leading-relaxed">
              {chapters.map((chapter, i) => (
                <li key={chapter.id} className="border-b border-neutral-200 pb-2">
                  <span className="mr-2 text-neutral-500">
                    {String(i + 1).padStart(2, "0")}.
                  </span>
                  {chapter.title}
                </li>
              ))}
            </ol>
          )}
          <p className="mt-4 text-xs text-neutral-500">
            Open each chapter from its pinned link in the paid group.
          </p>
        </section>

        <section className="card-liq">
          <h2 className="mb-3 text-sm font-semibold tracking-wide uppercase">
            Past exams
          </h2>
          {exams.length === 0 ? (
            <p className="text-sm text-neutral-600">No exams listed.</p>
          ) : (
            <ul className="space-y-2 text-[15px] leading-relaxed">
              {exams.map((exam) => (
                <li key={exam.id} className="border-b border-neutral-200 pb-2">
                  {exam.title}
                  {exam.year ? (
                    <span className="text-neutral-500"> · {exam.year}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-xs text-neutral-500">
            Open each exam from its pinned link in the paid group.
          </p>
        </section>
      </ReaderShell>
    </>
  );
}

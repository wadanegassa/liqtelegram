import { ReaderShell } from "@/components/AppShell";
import { MemberGate } from "@/components/MemberGate";
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
      <MemberGate>
        <ReaderShell
          title={bundle.error === "not_found" ? "Course not found" : "Error"}
          subtitle={
            bundle.error === "not_found"
              ? "This link does not match any course."
              : bundle.error
          }
        >
          <p className="text-sm text-[var(--tg-hint)]">
            Ask your admin for an updated link from the paid group.
          </p>
        </ReaderShell>
      </MemberGate>
    );
  }

  const { course, chapters, exams } = bundle;

  return (
    <MemberGate>
      <ReaderShell
        title={course.title}
        subtitle={course.description || undefined}
      >
        <section className="card-liq mb-5">
          <h2 className="mb-3 text-sm font-semibold tracking-wide uppercase">
            Chapters
          </h2>
          {chapters.length === 0 ? (
            <p className="text-sm text-[var(--tg-hint)]">No chapters listed.</p>
          ) : (
            <ol className="space-y-2 text-[15px] leading-relaxed">
              {chapters.map((chapter, i) => (
                <li
                  key={chapter.id}
                  className="border-b border-[var(--tg-hint)]/30 pb-2"
                >
                  <span className="mr-2 text-[var(--tg-hint)]">
                    {String(i + 1).padStart(2, "0")}.
                  </span>
                  {chapter.title}
                </li>
              ))}
            </ol>
          )}
          <p className="mt-4 text-xs text-[var(--tg-hint)]">
            Open each chapter from its pinned link in the paid group.
          </p>
        </section>

        <section className="card-liq">
          <h2 className="mb-3 text-sm font-semibold tracking-wide uppercase">
            Past exams
          </h2>
          {exams.length === 0 ? (
            <p className="text-sm text-[var(--tg-hint)]">No exams listed.</p>
          ) : (
            <ul className="space-y-2 text-[15px] leading-relaxed">
              {exams.map((exam) => (
                <li
                  key={exam.id}
                  className="border-b border-[var(--tg-hint)]/30 pb-2"
                >
                  {exam.title}
                  {exam.year ? (
                    <span className="text-[var(--tg-hint)]"> · {exam.year}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-xs text-[var(--tg-hint)]">
            Open each exam from its pinned link in the paid group.
          </p>
        </section>
      </ReaderShell>
    </MemberGate>
  );
}

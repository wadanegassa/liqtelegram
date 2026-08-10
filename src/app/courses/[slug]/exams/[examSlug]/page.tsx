import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Markdown } from "@/components/Markdown";
import { createBrowserSupabase } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";

type Props = { params: { slug: string; examSlug: string } };

export default async function ExamPage({ params }: Props) {
  const supabase = createBrowserSupabase();
  const { data: course } = await supabase
    .from("courses")
    .select("*")
    .eq("slug", params.slug)
    .maybeSingle();
  if (!course) notFound();

  const { data: exam } = await supabase
    .from("exams")
    .select("*")
    .eq("course_id", course.id)
    .eq("slug", params.examSlug)
    .maybeSingle();
  if (!exam) notFound();

  return (
    <AppShell
      title={exam.title}
      subtitle={`${course.title}${exam.year ? ` · ${exam.year}` : ""}`}
      backHref={`/courses/${course.slug}`}
    >
      <article className="card-liq">
        <Markdown content={exam.content_md} />
      </article>
    </AppShell>
  );
}

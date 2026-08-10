import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Markdown } from "@/components/Markdown";
import { createBrowserSupabase } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";

type Props = { params: { slug: string; chapterSlug: string } };

export default async function ChapterPage({ params }: Props) {
  const supabase = createBrowserSupabase();
  const { data: course } = await supabase
    .from("courses")
    .select("*")
    .eq("slug", params.slug)
    .maybeSingle();
  if (!course) notFound();

  const { data: chapter } = await supabase
    .from("chapters")
    .select("*")
    .eq("course_id", course.id)
    .eq("slug", params.chapterSlug)
    .maybeSingle();
  if (!chapter) notFound();

  return (
    <AppShell
      title={chapter.title}
      subtitle={`${course.title} · Chapter`}
      backHref={`/courses/${course.slug}`}
    >
      <article className="card-liq">
        <Markdown content={chapter.content_md} />
      </article>
    </AppShell>
  );
}

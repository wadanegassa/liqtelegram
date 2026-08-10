import { ReaderShell } from "@/components/AppShell";
import { LockNavigation } from "@/components/LockNavigation";
import { Markdown } from "@/components/Markdown";
import { tryCreateBrowserSupabase } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";

type Props = { params: { slug: string; chapterSlug: string } };

export default async function ChapterPage({ params }: Props) {
  const supabase = tryCreateBrowserSupabase();
  if (!supabase) {
    return (
      <>
        <LockNavigation />
        <ReaderShell title="Unavailable" subtitle="Content is temporarily unavailable.">
          <p className="text-sm text-neutral-600">Try again later.</p>
        </ReaderShell>
      </>
    );
  }

  const { data: course } = await supabase
    .from("courses")
    .select("*")
    .eq("slug", params.slug)
    .maybeSingle();
  if (!course) {
    return (
      <>
        <LockNavigation />
        <ReaderShell title="Course not found">
          <p className="text-sm text-neutral-600">
            Ask your admin for an updated link.
          </p>
        </ReaderShell>
      </>
    );
  }

  const { data: chapter } = await supabase
    .from("chapters")
    .select("*")
    .eq("course_id", course.id)
    .eq("slug", params.chapterSlug)
    .maybeSingle();
  if (!chapter) {
    return (
      <>
        <LockNavigation />
        <ReaderShell title="Chapter not found">
          <p className="text-sm text-neutral-600">
            Ask your admin for an updated link.
          </p>
        </ReaderShell>
      </>
    );
  }

  return (
    <>
      <LockNavigation />
      <ReaderShell title={chapter.title} subtitle={course.title}>
        <article className="card-liq">
          <Markdown content={chapter.content_md} />
        </article>
      </ReaderShell>
    </>
  );
}

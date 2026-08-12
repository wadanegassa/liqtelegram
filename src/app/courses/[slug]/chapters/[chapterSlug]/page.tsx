import { unstable_noStore as noStore } from "next/cache";
import { ReaderShell } from "@/components/AppShell";
import { MemberGate } from "@/components/MemberGate";
import { Markdown } from "@/components/Markdown";
import { tryCreateServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

type Props = { params: { slug: string; chapterSlug: string } };

export default async function ChapterPage({ params }: Props) {
  noStore();
  const supabase = tryCreateServerSupabase();
  if (!supabase) {
    return (
      <MemberGate>
        <ReaderShell title="Unavailable" subtitle="Content is temporarily unavailable.">
          <p className="text-sm text-[var(--tg-hint)]">Try again later.</p>
        </ReaderShell>
      </MemberGate>
    );
  }

  const { data: course } = await supabase
    .from("courses")
    .select("*")
    .eq("slug", params.slug)
    .maybeSingle();
  if (!course) {
    return (
      <MemberGate>
        <ReaderShell title="Course not found">
          <p className="text-sm text-[var(--tg-hint)]">
            Ask your admin for an updated link.
          </p>
        </ReaderShell>
      </MemberGate>
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
      <MemberGate>
        <ReaderShell title="Chapter not found">
          <p className="text-sm text-[var(--tg-hint)]">
            Ask your admin for an updated link.
          </p>
        </ReaderShell>
      </MemberGate>
    );
  }

  return (
    <MemberGate>
      <ReaderShell title={chapter.title} subtitle={course.title}>
        <article className="card-liq">
          <Markdown content={chapter.content_md} />
        </article>
      </ReaderShell>
    </MemberGate>
  );
}

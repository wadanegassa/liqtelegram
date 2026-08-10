import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Markdown } from "@/components/Markdown";
import { tryCreateBrowserSupabase } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";

type Props = { params: { slug: string; chapterSlug: string } };

export default async function ChapterPage({ params }: Props) {
  const supabase = tryCreateBrowserSupabase();
  if (!supabase) {
    return (
      <AppShell
        title="Chapter error"
        subtitle="Missing Supabase env vars on Vercel. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, then redeploy."
        backHref="/courses"
      >
        <Link href="/courses" className="btn-liq inline-block">
          Browse courses
        </Link>
      </AppShell>
    );
  }

  const { data: course } = await supabase
    .from("courses")
    .select("*")
    .eq("slug", params.slug)
    .maybeSingle();
  if (!course) {
    return (
      <AppShell title="Course not found" backHref="/courses">
        <Link href="/courses" className="btn-liq inline-block">
          Browse courses
        </Link>
      </AppShell>
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
      <AppShell
        title="Chapter not found"
        backHref={`/courses/${course.slug}`}
      >
        <Link
          href={`/courses/${course.slug}`}
          className="btn-liq inline-block"
        >
          Back to course
        </Link>
      </AppShell>
    );
  }

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

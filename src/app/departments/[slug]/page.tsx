import { ReaderShell } from "@/components/AppShell";
import { LockNavigation } from "@/components/LockNavigation";
import { Markdown } from "@/components/Markdown";
import { tryCreateBrowserSupabase } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";

type Props = { params: { slug: string } };

export default async function DepartmentPage({ params }: Props) {
  const supabase = tryCreateBrowserSupabase();
  if (!supabase) {
    return (
      <>
        <LockNavigation />
        <ReaderShell title="Unavailable">
          <p className="text-sm text-neutral-600">Try again later.</p>
        </ReaderShell>
      </>
    );
  }

  const { data: department } = await supabase
    .from("departments")
    .select("*")
    .eq("slug", params.slug)
    .maybeSingle();
  if (!department) {
    return (
      <>
        <LockNavigation />
        <ReaderShell title="Department not found">
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
      <ReaderShell
        title={department.title}
        subtitle={department.summary || undefined}
      >
        <article className="card-liq">
          <Markdown content={department.content_md} />
        </article>
      </ReaderShell>
    </>
  );
}

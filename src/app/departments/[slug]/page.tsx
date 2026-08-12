import { unstable_noStore as noStore } from "next/cache";
import { ReaderShell } from "@/components/AppShell";
import { MemberGate } from "@/components/MemberGate";
import { Markdown } from "@/components/Markdown";
import { tryCreateServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

type Props = { params: { slug: string } };

export default async function DepartmentPage({ params }: Props) {
  noStore();
  const supabase = tryCreateServerSupabase();
  if (!supabase) {
    return (
      <MemberGate>
        <ReaderShell title="Unavailable">
          <p className="text-sm text-[var(--tg-hint)]">Try again later.</p>
        </ReaderShell>
      </MemberGate>
    );
  }

  const { data: department } = await supabase
    .from("departments")
    .select("*")
    .eq("slug", params.slug)
    .maybeSingle();
  if (!department) {
    return (
      <MemberGate>
        <ReaderShell title="Department not found">
          <p className="text-sm text-[var(--tg-hint)]">
            Ask your admin for an updated link.
          </p>
        </ReaderShell>
      </MemberGate>
    );
  }

  return (
    <MemberGate>
      <ReaderShell
        title={department.title}
        subtitle={department.summary || undefined}
      >
        <article className="card-liq">
          <Markdown content={department.content_md} />
        </article>
      </ReaderShell>
    </MemberGate>
  );
}

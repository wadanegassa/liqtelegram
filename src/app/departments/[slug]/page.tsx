import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Markdown } from "@/components/Markdown";
import { tryCreateBrowserSupabase } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";

type Props = { params: { slug: string } };

export default async function DepartmentPage({ params }: Props) {
  const supabase = tryCreateBrowserSupabase();
  if (!supabase) {
    return (
      <AppShell
        title="Department error"
        subtitle="Missing Supabase env vars on Vercel. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, then redeploy."
        backHref="/departments"
      >
        <Link href="/departments" className="btn-liq inline-block">
          Browse departments
        </Link>
      </AppShell>
    );
  }

  const { data: department } = await supabase
    .from("departments")
    .select("*")
    .eq("slug", params.slug)
    .maybeSingle();
  if (!department) {
    return (
      <AppShell title="Department not found" backHref="/departments">
        <Link href="/departments" className="btn-liq inline-block">
          Browse departments
        </Link>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={department.title}
      subtitle={department.summary || "Department guidance"}
      backHref="/departments"
    >
      <article className="card-liq">
        <Markdown content={department.content_md} />
      </article>
    </AppShell>
  );
}

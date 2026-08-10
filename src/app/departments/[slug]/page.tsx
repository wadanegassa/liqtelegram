import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Markdown } from "@/components/Markdown";
import { createBrowserSupabase } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";

type Props = { params: { slug: string } };

export default async function DepartmentPage({ params }: Props) {
  const supabase = createBrowserSupabase();
  const { data: department } = await supabase
    .from("departments")
    .select("*")
    .eq("slug", params.slug)
    .maybeSingle();
  if (!department) notFound();

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

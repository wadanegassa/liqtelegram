import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { createBrowserSupabase } from "@/lib/supabase/client";
import type { Department } from "@/lib/types";

export const dynamic = "force-dynamic";

async function getDepartments(): Promise<{
  departments: Department[];
  error?: string;
}> {
  try {
    const supabase = createBrowserSupabase();
    const { data, error } = await supabase
      .from("departments")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("title", { ascending: true });
    if (error) return { departments: [], error: error.message };
    return { departments: data || [] };
  } catch (e) {
    return {
      departments: [],
      error: e instanceof Error ? e.message : "Failed",
    };
  }
}

export default async function DepartmentsPage() {
  const { departments, error } = await getDepartments();

  return (
    <AppShell
      title="Departments"
      subtitle="Career paths, requirements, and what each department is actually like."
      backHref="/"
    >
      {error ? (
        <div className="card-liq text-sm text-red-700">{error}</div>
      ) : null}

      {!error && departments.length === 0 ? (
        <div className="card-liq text-sm text-[var(--tg-hint)]">
          No department guides yet.
        </div>
      ) : null}

      <div className="grid gap-3">
        {departments.map((dept) => (
          <Link
            key={dept.id}
            href={`/departments/${dept.slug}`}
            className="card-liq block"
          >
            <h2 className="font-display text-xl font-semibold">{dept.title}</h2>
            {dept.summary ? (
              <p className="mt-1 text-sm text-[var(--tg-hint)]">{dept.summary}</p>
            ) : null}
          </Link>
        ))}
      </div>
    </AppShell>
  );
}

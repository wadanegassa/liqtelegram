import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createAdminSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

export async function DELETE(_request: Request, context: Ctx) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = context.params?.id;
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  try {
    const supabase = createAdminSupabase();
    const { error } = await supabase
      .from("partner_expenses")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        {
          error: error.message,
          hint: "Run supabase/partner_money.sql in Supabase SQL Editor.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "Failed to delete expense",
      },
      { status: 500 }
    );
  }
}

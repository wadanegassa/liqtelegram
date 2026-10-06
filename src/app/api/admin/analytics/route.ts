import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { isTestAccount } from "@/lib/test-accounts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PaymentRow = {
  id: string;
  telegram_user_id: number;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  reviewed_at: string | null;
  invite_link: string | null;
};

function dayKey(iso: string) {
  // Bucket by Africa/Addis_Ababa calendar day (UTC+3, no DST).
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  const addisMs = d.getTime() + 3 * 60 * 60 * 1000;
  return new Date(addisMs).toISOString().slice(0, 10);
}

function parseAmount(raw: string | null | undefined): number {
  if (!raw) return 0;
  const n = Number(String(raw).replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createAdminSupabase();

    const [paymentsRes, settingsRes] = await Promise.all([
      supabase
        .from("payment_requests")
        .select(
          "id, telegram_user_id, username, first_name, last_name, status, created_at, reviewed_at, invite_link"
        )
        .order("created_at", { ascending: false })
        .limit(5000),
      supabase
        .from("bot_settings")
        .select("payment_amount")
        .eq("id", 1)
        .maybeSingle(),
    ]);

    if (paymentsRes.error) {
      return NextResponse.json(
        {
          error: paymentsRes.error.message,
          hint: "Run supabase/payments.sql in Supabase if the table is missing.",
        },
        { status: 500 }
      );
    }

    const allRows = (paymentsRes.data || []) as PaymentRow[];
    // Exclude test accounts (e.g. @Pro_hispeace) from revenue and counts.
    const rows = allRows.filter(
      (row) =>
        !isTestAccount({
          telegram_user_id: row.telegram_user_id,
          username: row.username,
        })
    );
    const excludedTests = allRows.length - rows.length;
    const amountEtb = parseAmount(settingsRes.data?.payment_amount);

    let pending = 0;
    let approved = 0;
    let rejected = 0;
    const approvedUserIds = new Set<number>();
    const allUserIds = new Set<number>();

    for (const row of rows) {
      allUserIds.add(row.telegram_user_id);
      if (row.status === "pending") pending += 1;
      else if (row.status === "approved") {
        approved += 1;
        approvedUserIds.add(row.telegram_user_id);
      } else if (row.status === "rejected") rejected += 1;
    }

    // Revenue only from approved payment proofs (not Telegram group size).
    const revenueEtb = approved * amountEtb;

    const byDayMap = new Map<
      string,
      { date: string; approved: number; rejected: number; pending: number }
    >();
    const todayKey = dayKey(new Date().toISOString());
    const today = new Date(`${todayKey}T12:00:00.000Z`);
    for (let i = 29; i >= 0; i -= 1) {
      const d = new Date(today);
      d.setUTCDate(today.getUTCDate() - i);
      const key = d.toISOString().slice(0, 10);
      byDayMap.set(key, { date: key, approved: 0, rejected: 0, pending: 0 });
    }

    for (const row of rows) {
      // Approvals/rejections on review day; still-pending on submit day.
      const key = dayKey(
        row.status === "pending"
          ? row.created_at
          : row.reviewed_at || row.created_at
      );
      const bucket = byDayMap.get(key);
      if (!bucket) continue;
      if (row.status === "approved") bucket.approved += 1;
      else if (row.status === "rejected") bucket.rejected += 1;
      else if (row.status === "pending") bucket.pending += 1;
    }

    const recent = rows.slice(0, 100).map((row) => ({
      id: row.id,
      telegram_user_id: row.telegram_user_id,
      username: row.username,
      first_name: row.first_name,
      last_name: row.last_name,
      status: row.status,
      created_at: row.created_at,
      reviewed_at: row.reviewed_at,
      estimated_amount_etb: row.status === "approved" ? amountEtb : 0,
    }));

    return NextResponse.json({
      summary: {
        total_requests: rows.length,
        pending,
        approved,
        rejected,
        paying_users: approvedUserIds.size,
        unique_submitters: allUserIds.size,
        payment_amount_etb: amountEtb,
        revenue_etb: revenueEtb,
        excluded_test_proofs: excludedTests,
      },
      by_day: Array.from(byDayMap.values()),
      recent,
      note:
        "Revenue = approved payment proofs × current bot payment amount. Test accounts (e.g. @Pro_hispeace), group admins, and manually invited members are not counted.",
    });
  } catch (e) {
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "Failed to load analytics",
      },
      { status: 500 }
    );
  }
}

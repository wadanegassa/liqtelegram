import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { isTestAccount } from "@/lib/test-accounts";
import { dayKeyAddis, loadLiqFinance } from "@/lib/liq-finance";

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
  return dayKeyAddis(iso);
}

function parseAmount(raw: string | null | undefined): number {
  if (!raw) return 0;
  const n = Number(String(raw).replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function emptyDayBuckets() {
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
  return byDayMap;
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createAdminSupabase();

    const [paymentsRes, settingsRes, liq] = await Promise.all([
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
      loadLiqFinance(),
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

    const telegramRevenueEtb = approved * amountEtb;
    const liqRevenueEtb = liq.revenue_etb;
    const combinedRevenueEtb = telegramRevenueEtb + liqRevenueEtb;

    const byDayMap = emptyDayBuckets();
    const byDayTelegram = emptyDayBuckets();
    const byDayLiq = emptyDayBuckets();

    for (const row of rows) {
      const key = dayKey(
        row.status === "pending"
          ? row.created_at
          : row.reviewed_at || row.created_at
      );
      for (const map of [byDayMap, byDayTelegram]) {
        const bucket = map.get(key);
        if (!bucket) continue;
        if (row.status === "approved") bucket.approved += 1;
        else if (row.status === "rejected") bucket.rejected += 1;
        else if (row.status === "pending") bucket.pending += 1;
      }
    }

    for (const row of liq.payments) {
      const isPending =
        row.status === "pending" || row.status === "notified";
      const isApproved = row.status === "approved";
      const isRejected = row.status === "rejected";
      if (!isPending && !isApproved && !isRejected) continue;

      // Approved money only after baseline; pending/rejected show for ops.
      if (
        isApproved &&
        liq.count_from &&
        Date.parse(row.reviewed_at || row.created_at) <
          Date.parse(liq.count_from)
      ) {
        continue;
      }

      const key = dayKey(
        isPending ? row.created_at : row.reviewed_at || row.created_at
      );
      for (const map of [byDayMap, byDayLiq]) {
        const bucket = map.get(key);
        if (!bucket) continue;
        if (isApproved) bucket.approved += 1;
        else if (isRejected) bucket.rejected += 1;
        else if (isPending) bucket.pending += 1;
      }
    }

    const telegramRecent = rows.slice(0, 100).map((row) => ({
      id: row.id,
      source: "telegram_group" as const,
      source_label: "Telegram paid group",
      display_name: null as string | null,
      telegram_user_id: row.telegram_user_id,
      username: row.username,
      first_name: row.first_name,
      last_name: row.last_name,
      plan_label: null as string | null,
      status: row.status,
      created_at: row.created_at,
      reviewed_at: row.reviewed_at,
      estimated_amount_etb: row.status === "approved" ? amountEtb : 0,
    }));

    const liqRecent = liq.payments
      .filter((row) => {
        if (row.status === "cancelled") return false;
        if (row.status !== "approved") return true;
        if (!liq.count_from) return true;
        return (
          Date.parse(row.reviewed_at || row.created_at) >=
          Date.parse(liq.count_from)
        );
      })
      .slice(0, 100)
      .map((row) => ({
        id: row.id,
        source: "liq_subscription" as const,
        source_label: "LIQ Premium subscription",
        display_name: row.user_full_name || row.user_email,
        telegram_user_id: null as number | null,
        username: null as string | null,
        first_name: null as string | null,
        last_name: null as string | null,
        plan_label: row.plan_label,
        status:
          row.status === "notified"
            ? ("pending" as const)
            : (row.status as "pending" | "approved" | "rejected"),
        created_at: row.created_at,
        reviewed_at: row.reviewed_at,
        estimated_amount_etb:
          row.status === "approved" ? row.amount_etb : 0,
      }));

    const recent = [...telegramRecent, ...liqRecent]
      .sort(
        (a, b) =>
          Date.parse(b.created_at) - Date.parse(a.created_at)
      )
      .slice(0, 150);

    const activationRecent = liq.activations.slice(0, 50).map((row) => ({
      id: row.id,
      telegram_user_id: row.telegram_user_id,
      telegram_username: row.telegram_username,
      months: row.months,
      granted_expires_at: row.granted_expires_at,
      created_at: row.created_at,
    }));

    return NextResponse.json({
      summary: {
        // Combined (backward compatible fields)
        total_requests: rows.length + liq.payments.filter((p) => p.status !== "cancelled").length,
        pending: pending + liq.pending_count,
        approved: approved + liq.approved_count,
        rejected: rejected + liq.rejected_count,
        paying_users: approvedUserIds.size + liq.approved_count,
        unique_submitters: allUserIds.size,
        payment_amount_etb: amountEtb,
        revenue_etb: combinedRevenueEtb,
        excluded_test_proofs: excludedTests,
      },
      sources: {
        telegram_group: {
          label: "Telegram paid group",
          pending,
          approved,
          rejected,
          paying_users: approvedUserIds.size,
          unique_submitters: allUserIds.size,
          payment_amount_etb: amountEtb,
          revenue_etb: telegramRevenueEtb,
          total_requests: rows.length,
        },
        liq_subscription: {
          label: "LIQ Premium subscription",
          configured: liq.configured,
          count_from: liq.count_from,
          pending: liq.pending_count,
          approved: liq.approved_count,
          rejected: liq.rejected_count,
          revenue_etb: liqRevenueEtb,
          total_requests: liq.payments.filter((p) => p.status !== "cancelled")
            .length,
          error: liq.error,
          note:
            "Real money from approved Premium payment proofs only. Count starts from LIQ_PAYMENT_COUNT_FROM (the real 300 ETB).",
        },
        liq_activation: {
          label: "LIQ Academy activation",
          configured: liq.configured,
          count: liq.activation_count,
          revenue_etb: 0,
          note:
            "Telegram group members activating website Premium — not a payment. Not included in revenue or Money split.",
        },
      },
      by_day: Array.from(byDayMap.values()),
      by_day_sources: {
        telegram_group: Array.from(byDayTelegram.values()),
        liq_subscription: Array.from(byDayLiq.values()),
      },
      recent,
      activations_recent: activationRecent,
      note:
        "Revenue = Telegram paid-group approvals × bot amount + LIQ Premium approved amounts (from baseline). Academy activations are free grants and are never counted as money.",
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

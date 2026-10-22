import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createAdminSupabase } from "@/lib/supabase/admin";
import {
  PARTNERS,
  countApprovedPayments,
  normalizePartnerId,
  parseEtb,
  summarizePartnerMoney,
  type ExpenseKind,
  type PartnerId,
} from "@/lib/partner-money";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TABLE_HINT =
  "Run supabase/partner_money.sql in Supabase SQL Editor, then refresh.";

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createAdminSupabase();

    const [paymentsRes, settingsRes, expensesRes] = await Promise.all([
      supabase
        .from("payment_requests")
        .select("status, telegram_user_id, username")
        .eq("status", "approved")
        .limit(5000),
      supabase
        .from("bot_settings")
        .select("payment_amount")
        .eq("id", 1)
        .maybeSingle(),
      supabase
        .from("partner_expenses")
        .select("id, kind, partner, amount_etb, note, spent_at, created_at")
        .order("spent_at", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(500),
    ]);

    if (expensesRes.error) {
      return NextResponse.json(
        {
          error: expensesRes.error.message,
          hint: TABLE_HINT,
          partners: PARTNERS,
        },
        { status: 500 }
      );
    }

    const amountEtb = parseEtb(settingsRes.data?.payment_amount);
    const { approved, incomeEtb } = countApprovedPayments(
      paymentsRes.data || [],
      amountEtb
    );

    const expenses = (expensesRes.data || []).map((row) => ({
      id: String(row.id),
      kind: row.kind as ExpenseKind,
      partner: normalizePartnerId(
        row.partner == null ? null : String(row.partner)
      ),
      amount_etb: Number(row.amount_etb) || 0,
      note: String(row.note || ""),
      spent_at: String(row.spent_at),
      created_at: String(row.created_at),
    }));

    const summary = summarizePartnerMoney(incomeEtb, expenses);

    return NextResponse.json({
      partners: PARTNERS,
      payment_amount_etb: amountEtb,
      approved_count: approved,
      summary,
      expenses,
      note:
        "Income from approved payments. Company costs come out first (shared). Then the rest splits 50/50 for Wada and Lemi. Personal expenses only reduce that person.",
    });
  } catch (e) {
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "Failed to load money",
        hint: TABLE_HINT,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const kind = String(body.kind || "") as ExpenseKind;
    const partnerRaw = body.partner ? String(body.partner) : null;
    const amount = parseEtb(body.amount_etb ?? body.amount);
    const note = String(body.note || "").trim();
    const spentAt = String(body.spent_at || "").slice(0, 10);

    if (kind !== "company" && kind !== "individual") {
      return NextResponse.json(
        { error: "kind must be company or individual" },
        { status: 400 }
      );
    }
    if (!(amount > 0)) {
      return NextResponse.json(
        { error: "amount_etb must be greater than 0" },
        { status: 400 }
      );
    }
    if (kind === "individual") {
      if (partnerRaw !== "wada" && partnerRaw !== "lemi") {
        return NextResponse.json(
          { error: "individual expenses need partner wada or lemi" },
          { status: 400 }
        );
      }
    }

    const supabase = createAdminSupabase();
    const row = {
      kind,
      partner: kind === "company" ? null : (partnerRaw as PartnerId),
      amount_etb: amount,
      note,
      spent_at: /^\d{4}-\d{2}-\d{2}$/.test(spentAt)
        ? spentAt
        : new Date().toISOString().slice(0, 10),
    };

    const { data, error } = await supabase
      .from("partner_expenses")
      .insert(row)
      .select("id, kind, partner, amount_etb, note, spent_at, created_at")
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message, hint: TABLE_HINT },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, expense: data });
  } catch (e) {
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "Failed to save expense",
        hint: TABLE_HINT,
      },
      { status: 500 }
    );
  }
}

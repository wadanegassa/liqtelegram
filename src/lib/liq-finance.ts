import { createLiqAdminSupabase, liqConfigured } from "@/lib/liq-supabase";

export type LiqPaymentStatus =
  | "pending"
  | "notified"
  | "approved"
  | "rejected"
  | "cancelled";

export type LiqPaymentIntent = {
  id: string;
  user_email: string | null;
  user_full_name: string | null;
  plan_label: string | null;
  amount_etb: number;
  status: LiqPaymentStatus;
  created_at: string;
  reviewed_at: string | null;
  notified_at: string | null;
};

export type LiqActivation = {
  id: string;
  telegram_user_id: number | null;
  telegram_username: string | null;
  months: number;
  granted_expires_at: string | null;
  created_at: string;
};

export type LiqFinanceSnapshot = {
  configured: boolean;
  count_from: string | null;
  payments: LiqPaymentIntent[];
  /** Approved payments that count toward revenue (from count_from inclusive). */
  revenue_payments: LiqPaymentIntent[];
  revenue_etb: number;
  approved_count: number;
  pending_count: number;
  rejected_count: number;
  activations: LiqActivation[];
  activation_count: number;
  error: string | null;
};

function parseIsoMs(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const t = Date.parse(raw);
  return Number.isFinite(t) ? t : null;
}

/** Inclusive floor for real LIQ subscription money. Older approved proofs are ignored. */
export function getLiqPaymentCountFromMs(): number | null {
  return parseIsoMs(process.env.LIQ_PAYMENT_COUNT_FROM?.trim());
}

function paymentEventMs(row: LiqPaymentIntent): number {
  return (
    parseIsoMs(row.reviewed_at) ??
    parseIsoMs(row.notified_at) ??
    parseIsoMs(row.created_at) ??
    0
  );
}

function isPendingLike(status: string) {
  return status === "pending" || status === "notified";
}

/**
 * Load LIQ Premium subscription payments + Academy activations.
 * Activations are membership grants — not money. Do not add them to revenue.
 */
export async function loadLiqFinance(): Promise<LiqFinanceSnapshot> {
  const empty: LiqFinanceSnapshot = {
    configured: false,
    count_from: process.env.LIQ_PAYMENT_COUNT_FROM?.trim() || null,
    payments: [],
    revenue_payments: [],
    revenue_etb: 0,
    approved_count: 0,
    pending_count: 0,
    rejected_count: 0,
    activations: [],
    activation_count: 0,
    error: null,
  };

  if (!liqConfigured()) {
    return {
      ...empty,
      error:
        "Set LIQ_SUPABASE_URL and LIQ_SUPABASE_SERVICE_ROLE_KEY to include LIQ Premium payments.",
    };
  }

  const supabase = createLiqAdminSupabase();
  if (!supabase) {
    return { ...empty, error: "LIQ Supabase client unavailable" };
  }

  const countFromMs = getLiqPaymentCountFromMs();

  const [paymentsRes, activationsRes] = await Promise.all([
    supabase
      .from("website_payment_intents")
      .select(
        "id, user_email, user_full_name, plan_label, amount_etb, status, created_at, reviewed_at, notified_at"
      )
      .order("created_at", { ascending: false })
      .limit(5000),
    supabase
      .from("academy_activations")
      .select(
        "id, telegram_user_id, telegram_username, months, granted_expires_at, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(5000),
  ]);

  if (paymentsRes.error) {
    return {
      ...empty,
      configured: true,
      error: paymentsRes.error.message,
    };
  }
  if (activationsRes.error) {
    return {
      ...empty,
      configured: true,
      error: activationsRes.error.message,
    };
  }

  const payments = ((paymentsRes.data || []) as Array<Record<string, unknown>>).map(
    (row) => ({
      id: String(row.id),
      user_email: row.user_email == null ? null : String(row.user_email),
      user_full_name:
        row.user_full_name == null ? null : String(row.user_full_name),
      plan_label: row.plan_label == null ? null : String(row.plan_label),
      amount_etb: Number(row.amount_etb) || 0,
      status: String(row.status) as LiqPaymentStatus,
      created_at: String(row.created_at),
      reviewed_at: row.reviewed_at == null ? null : String(row.reviewed_at),
      notified_at: row.notified_at == null ? null : String(row.notified_at),
    })
  );

  const activations = (
    (activationsRes.data || []) as Array<Record<string, unknown>>
  ).map((row) => ({
    id: String(row.id),
    telegram_user_id:
      row.telegram_user_id == null ? null : Number(row.telegram_user_id),
    telegram_username:
      row.telegram_username == null ? null : String(row.telegram_username),
    months: Number(row.months) || 0,
    granted_expires_at:
      row.granted_expires_at == null ? null : String(row.granted_expires_at),
    created_at: String(row.created_at),
  }));

  let pending_count = 0;
  let rejected_count = 0;
  let approved_count = 0;
  let revenue_etb = 0;
  const revenue_payments: LiqPaymentIntent[] = [];

  for (const row of payments) {
    if (isPendingLike(row.status)) pending_count += 1;
    else if (row.status === "rejected") rejected_count += 1;
    else if (row.status === "approved") {
      // Money only from the real baseline onward (older proofs ignored).
      if (countFromMs != null && paymentEventMs(row) < countFromMs) continue;
      approved_count += 1;
      revenue_etb += row.amount_etb;
      revenue_payments.push(row);
    }
  }

  return {
    configured: true,
    count_from: process.env.LIQ_PAYMENT_COUNT_FROM?.trim() || null,
    payments,
    revenue_payments,
    revenue_etb,
    approved_count,
    pending_count,
    rejected_count,
    activations,
    activation_count: activations.length,
    error: null,
  };
}

export function dayKeyAddis(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  const addisMs = d.getTime() + 3 * 60 * 60 * 1000;
  return new Date(addisMs).toISOString().slice(0, 10);
}

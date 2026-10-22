import { isTestAccount } from "@/lib/test-accounts";

export const PARTNERS = [
  { id: "wada" as const, name: "Wada", accent: "#0f766e" },
  { id: "laemi" as const, name: "Laemi", accent: "#b45309" },
];

export type PartnerId = (typeof PARTNERS)[number]["id"];
export type ExpenseKind = "company" | "individual";

export type PartnerExpense = {
  id: string;
  kind: ExpenseKind;
  partner: PartnerId | null;
  amount_etb: number;
  note: string;
  spent_at: string;
  created_at: string;
};

/** Map legacy ids (mw/lemi) to current ids. */
export function normalizePartnerId(
  raw: string | null | undefined
): PartnerId | null {
  if (!raw) return null;
  const v = raw.trim().toLowerCase();
  if (v === "wada" || v === "mw") return "wada";
  if (v === "laemi" || v === "lemi") return "laemi";
  return null;
}

export function partnerName(id: PartnerId | null | undefined): string {
  if (!id) return "Shared / company";
  return PARTNERS.find((p) => p.id === id)?.name || id;
}

export function parseEtb(raw: unknown): number {
  const n = Number(String(raw ?? "").replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

type PaymentLike = {
  status: string;
  telegram_user_id?: number | null;
  username?: string | null;
};

export function countApprovedPayments(
  rows: PaymentLike[],
  amountEtb: number
): { approved: number; incomeEtb: number } {
  let approved = 0;
  for (const row of rows) {
    if (row.status !== "approved") continue;
    if (
      isTestAccount({
        telegram_user_id: row.telegram_user_id,
        username: row.username,
      })
    ) {
      continue;
    }
    approved += 1;
  }
  return { approved, incomeEtb: approved * amountEtb };
}

export function summarizePartnerMoney(
  incomeEtb: number,
  expenses: Array<{
    kind: ExpenseKind;
    partner: string | null;
    amount_etb: number;
  }>
) {
  let companyEtb = 0;
  let wadaIndividualEtb = 0;
  let laemiIndividualEtb = 0;

  for (const e of expenses) {
    const amount = Number(e.amount_etb) || 0;
    if (e.kind === "company") {
      companyEtb += amount;
      continue;
    }
    const partner = normalizePartnerId(e.partner);
    if (partner === "wada") wadaIndividualEtb += amount;
    else if (partner === "laemi") laemiIndividualEtb += amount;
  }

  const poolEtb = incomeEtb - companyEtb;
  const eachShareEtb = poolEtb / 2;
  const wadaBalanceEtb = eachShareEtb - wadaIndividualEtb;
  const laemiBalanceEtb = eachShareEtb - laemiIndividualEtb;

  return {
    income_etb: incomeEtb,
    company_expenses_etb: companyEtb,
    pool_etb: poolEtb,
    each_share_etb: eachShareEtb,
    wada: {
      id: "wada" as const,
      name: "Wada",
      individual_expenses_etb: wadaIndividualEtb,
      balance_etb: wadaBalanceEtb,
    },
    laemi: {
      id: "laemi" as const,
      name: "Laemi",
      individual_expenses_etb: laemiIndividualEtb,
      balance_etb: laemiBalanceEtb,
    },
  };
}

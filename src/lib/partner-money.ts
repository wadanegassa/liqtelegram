import { isTestAccount } from "@/lib/test-accounts";

export const PARTNERS = [
  { id: "mw" as const, name: "MW" },
  { id: "lemi" as const, name: "Lemi" },
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

export function partnerName(id: PartnerId | null | undefined): string {
  if (!id) return "—";
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
    partner: PartnerId | null;
    amount_etb: number;
  }>
) {
  let companyEtb = 0;
  let mwIndividualEtb = 0;
  let lemiIndividualEtb = 0;

  for (const e of expenses) {
    const amount = Number(e.amount_etb) || 0;
    if (e.kind === "company") companyEtb += amount;
    else if (e.partner === "mw") mwIndividualEtb += amount;
    else if (e.partner === "lemi") lemiIndividualEtb += amount;
  }

  const poolEtb = incomeEtb - companyEtb;
  const eachShareEtb = poolEtb / 2;
  const mwBalanceEtb = eachShareEtb - mwIndividualEtb;
  const lemiBalanceEtb = eachShareEtb - lemiIndividualEtb;

  return {
    income_etb: incomeEtb,
    company_expenses_etb: companyEtb,
    pool_etb: poolEtb,
    each_share_etb: eachShareEtb,
    mw: {
      id: "mw" as const,
      name: "MW",
      individual_expenses_etb: mwIndividualEtb,
      balance_etb: mwBalanceEtb,
    },
    lemi: {
      id: "lemi" as const,
      name: "Lemi",
      individual_expenses_etb: lemiIndividualEtb,
      balance_etb: lemiBalanceEtb,
    },
  };
}

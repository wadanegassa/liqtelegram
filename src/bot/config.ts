function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

function optional(name: string, fallback = ""): string {
  return process.env[name] || fallback;
}

export function getBotConfig() {
  const token = required("TELEGRAM_BOT_TOKEN");
  const adminGroupId = optional("TELEGRAM_ADMIN_GROUP_ID");
  const paidGroupId = optional("TELEGRAM_PAID_GROUP_ID");
  const webhookSecret = optional("TELEGRAM_WEBHOOK_SECRET", "");
  const appUrl = optional(
    "NEXT_PUBLIC_APP_URL",
    optional("VERCEL_URL") ? `https://${process.env.VERCEL_URL}` : ""
  );
  const miniAppUrl = `https://t.me/${optional(
    "NEXT_PUBLIC_TELEGRAM_BOT_USERNAME",
    "Liq_Academy_bot"
  ).replace(/^@/, "")}/${optional("NEXT_PUBLIC_TELEGRAM_MINI_APP_NAME", "app")}`;

  const paymentInstructions = optional(
    "PAYMENT_INSTRUCTIONS",
    [
      "🎓 *Liq Academy — Join the paid community*",
      "",
      "Pay once (or per semester), then send a *screenshot* of your payment here.",
      "",
      "💳 *Payment details*",
      "• Amount: UPDATE_ME ETB",
      "• Method: Telebirr / CBE Birr / Bank",
      "• Account name: UPDATE_ME",
      "• Account number: UPDATE_ME",
      "",
      "After paying, send a clear screenshot in this chat.",
      "An admin will approve it, then you get a one-time invite link.",
    ].join("\n")
  ).replace(/\\n/g, "\n");

  return {
    token,
    adminGroupId: adminGroupId ? Number(adminGroupId) : null,
    paidGroupId: paidGroupId ? Number(paidGroupId) : null,
    webhookSecret,
    appUrl,
    miniAppUrl,
    paymentInstructions,
  };
}

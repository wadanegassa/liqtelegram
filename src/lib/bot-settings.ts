export type BotSettings = {
  id: number;
  welcome_text: string;
  payment_instructions: string;
  help_text: string;
  ask_screenshot_text: string;
  proof_received_text: string;
  approved_text: string;
  rejected_text: string;
  status_member_text: string;
  status_pending_text: string;
  status_none_text: string;
  /** ETB amount shown on pay screen, e.g. "500" */
  payment_amount: string;
  /** Name on the receiving account */
  payment_account_name: string;
  /** Telebirr phone number students can copy */
  telebirr_phone: string;
  /** Optional Telebirr display label */
  telebirr_name: string;
  /** CBE account number students can copy */
  cbe_account_number: string;
  /** Optional CBE account holder name */
  cbe_account_name: string;
  updated_at?: string;
};

export const DEFAULT_BOT_SETTINGS: Omit<BotSettings, "id" | "updated_at"> = {
  welcome_text: `✨ Hey {{first_name}}! Welcome to *Liq Academy* 🎓

Your freshman course buddy is ready.

👇 Use the menu, or tap *How to pay* to join the paid community.`,
  payment_instructions: `💎 *Join Liq Academy*

Pay once, send your screenshot, and get your invite 🚀

💰 *Amount:* {{amount}} ETB
👤 *Account name:* {{account_name}}

🟢 *Telebirr*
📱 \`{{telebirr_phone}}\`

🔵 *CBE Birr*
🏦 \`{{cbe_account}}\`

Tap a button below to *copy* the number, pay, then send a clear screenshot here 📸`,
  help_text: `🧭 *How joining works*

1️⃣ Open *How to pay* and copy Telebirr or CBE
2️⃣ Send the amount to the account shown
3️⃣ Send a clear *screenshot* in this private chat
4️⃣ Admins review it ⚡
5️⃣ If approved, you get a *one-time* invite (24h)

📚 Inside the paid group, open pinned course / chapter / exam links.

Mini App tip: only use links from the paid group.`,
  ask_screenshot_text: `📸 Awesome — send your *payment screenshot* as a photo in this chat now.

Make sure the amount, name, and success status are visible ✨`,
  proof_received_text: `✅ Got it! Your proof is in the review queue ⏳

Hang tight — an admin will check it soon.
You can tap *My status* anytime.`,
  approved_text: `🎉 *Payment approved!* Welcome to Liq Academy 💚

Here is your *one-time* invite (expires in 24h):
{{invite_link}}

Open the paid group, then use the pinned lesson links to study 📚✨`,
  rejected_text: `😅 That proof was rejected.

Please send a *clearer screenshot* of a successful payment (amount + name visible), then try again.`,
  status_member_text: `✅ You're an approved member 🌟

Use the pinned links inside the paid group to open lessons.
Lost access? Send /rejoin for a fresh invite.`,
  status_pending_text: `⏳ Your proof is waiting for admin review.

We'll message you as soon as it's checked ✨`,
  status_none_text: `👋 No payment proof yet.

Tap *How to pay*, copy Telebirr or CBE, pay, then send a screenshot here 📸`,
  payment_amount: "UPDATE_ME",
  payment_account_name: "UPDATE_ME",
  telebirr_phone: "UPDATE_ME",
  telebirr_name: "Telebirr",
  cbe_account_number: "UPDATE_ME",
  cbe_account_name: "CBE Birr",
};

export function renderBotText(
  template: string,
  vars: Record<string, string>
): string {
  return Object.entries(vars).reduce(
    (text, [key, value]) =>
      text.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value),
    template
  );
}

export function paymentVars(settings: BotSettings): Record<string, string> {
  return {
    amount: settings.payment_amount || "UPDATE_ME",
    account_name: settings.payment_account_name || "UPDATE_ME",
    telebirr_phone: settings.telebirr_phone || "UPDATE_ME",
    telebirr_name: settings.telebirr_name || "Telebirr",
    cbe_account: settings.cbe_account_number || "UPDATE_ME",
    cbe_account_name: settings.cbe_account_name || "CBE Birr",
  };
}

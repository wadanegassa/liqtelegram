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
  updated_at?: string;
};

export const DEFAULT_BOT_SETTINGS: Omit<BotSettings, "id" | "updated_at"> = {
  welcome_text: `Welcome to *Liq Academy*, {{first_name}}!

Use the menu below, or send a payment screenshot after you pay.`,
  payment_instructions: `🎓 *Liq Academy — Join the paid community*

Pay, then send a *screenshot* of your payment here.

💳 *Payment details*
• Amount: UPDATE_ME ETB
• Method: Telebirr / CBE Birr / Bank
• Account name: UPDATE_ME
• Account number: UPDATE_ME

After paying, send a clear screenshot in this chat.
An admin will approve it, then you get a one-time invite link.`,
  help_text: `*How joining works*
1. Pay using the details from How to pay
2. Send a clear *screenshot* in this private chat
3. Admins review it in the proof group
4. If approved, you get a *one-time* invite link to the paid group
5. Open course / chapter / exam links pinned inside the paid group`,
  ask_screenshot_text:
    "Great — send your payment screenshot as a photo in this chat now.",
  proof_received_text:
    "✅ Proof received. An admin will review it soon. Use My status anytime.",
  approved_text: `✅ Payment approved — welcome to Liq Academy!

Here is your *one-time* invite link (expires in 24h):
{{invite_link}}

Inside the paid group, open the pinned course / chapter / exam links to study.`,
  rejected_text:
    "❌ Your payment proof was rejected. Please send a clearer screenshot of a successful payment.",
  status_member_text:
    "✅ You are an approved member. Use the pinned links inside the paid group to open lessons.",
  status_pending_text: "⏳ Your proof is waiting for admin review.",
  status_none_text: "No payment proof yet. Pay, then send a screenshot here.",
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

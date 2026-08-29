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
  /** Support chat / Telegram link opened from Help */
  support_chat_url: string;
  updated_at?: string;
};

export const DEFAULT_BOT_SETTINGS: Omit<BotSettings, "id" | "updated_at"> = {
  welcome_text: `✨ Hey {{first_name}}! Welcome to *Liq Academy* 🎓
ሰላም {{first_name}}! ወደ *Liq Academy* እንኳን በደህና መጡ 🎓

Easy steps / ቀላል እርምጃዎች:
1️⃣ Tap *Pay / ክፍያ* → copy Telebirr or CBE
2️⃣ Pay the amount / መጠኑን ይክፈሉ
3️⃣ Send screenshot here / ስክሪንሹት እዚህ ይላኩ
4️⃣ Wait for approval / እስከሚፀድቅ ይጠብቁ

👇 Use the menu below.`,

  payment_instructions: `💎 *Pay to join / ለመቀላቀል ይክፈሉ*

💰 Amount / መጠን: *{{amount}} ETB*
👤 Name / ስም: *{{account_name}}*

🟢 *Telebirr*
📱 \`{{telebirr_phone}}\`

🔵 *CBE Birr*
🏦 \`{{cbe_account}}\`

👇 Tap a button to *copy* the number
ቁጥሩን ለመቅዳት ከታች ያለውን ቁልፍ ይጫኑ

Then pay and send a clear screenshot here 📸
ከዚያ ይክፈሉና ግልጽ ስክሪንሹት እዚህ ይላኩ`,

  help_text: `🧭 *Help / እገዛ*

*How to join / እንዴት ይቀላቀላሉ*
1️⃣ *Pay / ክፍያ* → copy Telebirr or CBE
2️⃣ Pay {{amount}} ETB to {{account_name}}
3️⃣ Send payment *screenshot* in this chat
4️⃣ Admin reviews → you get invite link (24h)

📚 After joining: open pinned lesson links in the paid group only.
ቡድኑ ውስጥ ከተሰቀሉት ሊንኮች ብቻ ይጠቀሙ።

Need a person? Tap *Support chat / ድጋፍ* below 💬
ሰው ከፈለጉ ከታች *Support* ይጫኑ።`,

  ask_screenshot_text: `📸 Send your *payment screenshot* as a photo now.
አሁን የክፍያ *ስክሪንሹት* እንደ ፎቶ ይላኩ።

Show amount + success clearly / መጠንና ስኬት በግልጽ ይታይ`,

  proof_received_text: `✅ Received! / ተቀብለናል!
⏳ Admin is reviewing / አድሚን እየገመገመ ነው።

Check anytime with *Status / ሁኔታ*`,

  approved_text: `🎉 *Approved! / ተፅድቋል!* Welcome to Liq Academy 💚

One-time invite (24h) / አንድ ጊዜ የሚያገለግል ሊንክ:
{{invite_link}}

Join the group, then open pinned lesson links 📚
ቡድኑን ይቀላቀሉ፣ ከዚያ የተሰቀሉትን ሊንኮች ይክፈቱ`,

  rejected_text: `😅 Proof rejected / ማስረጃው አልተቀበለም።

Send a clearer successful-payment screenshot (amount + name visible).
ግልጽ የተሳካ ክፍያ ስክሪንሹት እንደገና ይላኩ።`,

  status_member_text: `✅ You are a member / አባል ነዎት 🌟

Use pinned links in the paid group.
Lost access? / አገናኝ ጠፋ? → /rejoin`,

  status_pending_text: `⏳ Pending review / በመጠባበቅ ላይ

We will message you after admin checks it.
አድሚን ካረጋገጠ በኋላ እንልክልዎታለን።`,

  status_none_text: `👋 No payment yet / ገና አልከፈሉም

Tap *Pay / ክፍያ* → copy number → pay → send screenshot 📸`,

  payment_amount: "UPDATE_ME",
  payment_account_name: "UPDATE_ME",
  telebirr_phone: "UPDATE_ME",
  telebirr_name: "Telebirr",
  cbe_account_number: "UPDATE_ME",
  cbe_account_name: "CBE Birr",
  support_chat_url: "https://t.me/Liq_Academy_bot",
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
    support_url: (settings.support_chat_url || "").trim(),
  };
}

export function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value.trim());
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

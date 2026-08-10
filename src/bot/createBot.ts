import { Markup, Telegraf, Context } from "telegraf";
import type { Update } from "telegraf/types";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getBotConfig } from "@/bot/config";

type BotContext = Context<Update>;

function displayName(ctx: BotContext) {
  const u = ctx.from;
  if (!u) return "Unknown";
  const name = [u.first_name, u.last_name].filter(Boolean).join(" ");
  return u.username ? `${name} (@${u.username})` : name || String(u.id);
}

function mainMenu() {
  return Markup.keyboard([
    ["💳 How to pay", "📤 I already paid"],
    ["✅ My status", "📚 Open Mini App"],
    ["ℹ️ Help"],
  ])
    .resize()
    .persistent();
}

async function isActiveMember(telegramUserId: number) {
  const supabase = createAdminSupabase();
  const { data } = await supabase
    .from("members")
    .select("telegram_user_id, status")
    .eq("telegram_user_id", telegramUserId)
    .maybeSingle();
  return Boolean(data && data.status === "active");
}

async function ensureCommands(bot: Telegraf<BotContext>) {
  await bot.telegram.setMyCommands([
    { command: "start", description: "Pay & join the community" },
    { command: "pay", description: "Show payment instructions" },
    { command: "status", description: "Check my payment / membership" },
    { command: "help", description: "How this bot works" },
    { command: "chatid", description: "Show this chat ID (for setup)" },
  ]);
}

export function createBot() {
  const config = getBotConfig();
  const bot = new Telegraf<BotContext>(config.token);

  bot.start(async (ctx) => {
    if (ctx.chat?.type !== "private") {
      await ctx.reply("Please message me in a private chat to join.");
      return;
    }
    await ctx.replyWithMarkdown(
      [
        `Welcome to *Liq Academy*, ${ctx.from?.first_name || "friend"}!`,
        "",
        "Use the menu below, or send a payment screenshot after you pay.",
      ].join("\n"),
      mainMenu()
    );
    await ctx.replyWithMarkdown(config.paymentInstructions, {
      disable_web_page_preview: true,
    });
  });

  bot.command("pay", async (ctx) => {
    await ctx.replyWithMarkdown(config.paymentInstructions, {
      disable_web_page_preview: true,
      ...mainMenu(),
    });
  });

  bot.command("help", async (ctx) => {
    await ctx.replyWithMarkdown(
      [
        "*How joining works*",
        "1. Pay using the details from /pay",
        "2. Send a clear *screenshot* in this private chat",
        "3. Admins review it in the proof group",
        "4. If approved, you get a *one-time* invite link",
        "",
        `Mini App: ${config.miniAppUrl}`,
      ].join("\n"),
      mainMenu()
    );
  });

  bot.command("status", async (ctx) => {
    if (!ctx.from) return;
    const member = await isActiveMember(ctx.from.id);
    if (member) {
      await ctx.reply(
        "✅ You are an approved member. If you lost the invite, ask an admin to send a new one.",
        mainMenu()
      );
      return;
    }

    const supabase = createAdminSupabase();
    const { data: latest } = await supabase
      .from("payment_requests")
      .select("status, created_at")
      .eq("telegram_user_id", ctx.from.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!latest) {
      await ctx.reply(
        "No payment proof yet. Send /pay, pay, then send a screenshot here.",
        mainMenu()
      );
      return;
    }
    if (latest.status === "pending") {
      await ctx.reply("⏳ Your proof is waiting for admin review.", mainMenu());
      return;
    }
    if (latest.status === "rejected") {
      await ctx.reply(
        "❌ Your last proof was rejected. Please send a clearer screenshot.",
        mainMenu()
      );
      return;
    }
    await ctx.reply("✅ Your last proof was approved.", mainMenu());
  });

  bot.command("chatid", async (ctx) => {
    const chat = ctx.chat;
    if (!chat) return;
    await ctx.reply(
      `Chat title: ${"title" in chat ? chat.title : "private"}\nChat ID: \`${chat.id}\`\nType: ${chat.type}`,
      { parse_mode: "Markdown" }
    );
  });

  bot.hears("💳 How to pay", async (ctx) => {
    await ctx.replyWithMarkdown(config.paymentInstructions, {
      disable_web_page_preview: true,
    });
  });

  bot.hears("📤 I already paid", async (ctx) => {
    await ctx.reply(
      "Great — send your payment screenshot as a photo in this chat now."
    );
  });

  bot.hears("✅ My status", async (ctx) => {
    if (!ctx.from) return;
    const member = await isActiveMember(ctx.from.id);
    if (member) {
      await ctx.reply(
        "✅ You are an approved member. If you lost the invite, ask an admin.",
        mainMenu()
      );
      return;
    }
    const supabase = createAdminSupabase();
    const { data: latest } = await supabase
      .from("payment_requests")
      .select("status")
      .eq("telegram_user_id", ctx.from.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!latest) {
      await ctx.reply(
        "No payment proof yet. Pay, then send a screenshot here.",
        mainMenu()
      );
      return;
    }
    if (latest.status === "pending") {
      await ctx.reply("⏳ Waiting for admin review.", mainMenu());
      return;
    }
    if (latest.status === "rejected") {
      await ctx.reply("❌ Last proof rejected. Send a new screenshot.", mainMenu());
      return;
    }
    await ctx.reply("✅ Last proof was approved.", mainMenu());
  });

  bot.hears("📚 Open Mini App", async (ctx) => {
    await ctx.reply(`Open the Mini App:\n${config.miniAppUrl}`, mainMenu());
  });

  bot.hears("ℹ️ Help", async (ctx) => {
    await ctx.replyWithMarkdown(
      [
        "1. Pay with /pay details",
        "2. Send screenshot here",
        "3. Wait for admin Approve/Reject",
        "4. Join with the invite link you receive",
      ].join("\n"),
      mainMenu()
    );
  });

  bot.on("photo", async (ctx) => {
    if (ctx.chat?.type !== "private") {
      await ctx.reply("Please send payment screenshots in a private chat with me.");
      return;
    }
    if (!ctx.from) return;

    if (!config.adminGroupId) {
      await ctx.reply(
        "Admin proof group is not configured yet. Tell the founder to set TELEGRAM_ADMIN_GROUP_ID."
      );
      return;
    }

    const photos = ctx.message.photo;
    const best = photos[photos.length - 1];
    const caption = ctx.message.caption || "";
    const supabase = createAdminSupabase();

    const { data: request, error } = await supabase
      .from("payment_requests")
      .insert({
        telegram_user_id: ctx.from.id,
        username: ctx.from.username || null,
        first_name: ctx.from.first_name || null,
        last_name: ctx.from.last_name || null,
        caption,
        file_id: best.file_id,
        status: "pending",
      })
      .select("*")
      .single();

    if (error || !request) {
      console.error(error);
      await ctx.reply(
        "Could not save your proof. If this keeps happening, the founder needs to run supabase/payments.sql."
      );
      return;
    }

    const adminCaption = [
      "🧾 *New payment proof*",
      `Request: \`${request.id}\``,
      `From: ${displayName(ctx)}`,
      `User ID: \`${ctx.from.id}\``,
      caption ? `Note: ${caption}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const sent = await ctx.telegram.sendPhoto(config.adminGroupId, best.file_id, {
      caption: adminCaption,
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback("✅ Approve", `pay:approve:${request.id}`),
          Markup.button.callback("❌ Reject", `pay:reject:${request.id}`),
        ],
      ]),
    });

    await supabase
      .from("payment_requests")
      .update({
        admin_chat_id: sent.chat.id,
        admin_message_id: sent.message_id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", request.id);

    await ctx.reply(
      "✅ Proof received. An admin will review it soon. Use ✅ My status anytime.",
      mainMenu()
    );
  });

  bot.action(/^pay:(approve|reject):(.+)$/, async (ctx) => {
    const match = ctx.match;
    const action = match[1] as "approve" | "reject";
    const requestId = match[2];
    const adminId = ctx.from?.id;
    if (!adminId) return;

    if (config.adminGroupId && ctx.chat?.id !== config.adminGroupId) {
      await ctx.answerCbQuery("Use these buttons in the proof group only.");
      return;
    }

    const supabase = createAdminSupabase();
    const { data: request } = await supabase
      .from("payment_requests")
      .select("*")
      .eq("id", requestId)
      .maybeSingle();

    if (!request) {
      await ctx.answerCbQuery("Request not found");
      return;
    }
    if (request.status !== "pending") {
      await ctx.answerCbQuery(`Already ${request.status}`);
      return;
    }

    if (action === "reject") {
      await supabase
        .from("payment_requests")
        .update({
          status: "rejected",
          reviewed_by: adminId,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      try {
        await ctx.telegram.sendMessage(
          request.telegram_user_id,
          "❌ Your payment proof was rejected. Please send a clearer screenshot of a successful payment."
        );
      } catch (e) {
        console.error("Failed to notify student", e);
      }

      await ctx.editMessageCaption(
        `${ctx.callbackQuery.message && "caption" in ctx.callbackQuery.message ? ctx.callbackQuery.message.caption : ""}\n\n❌ Rejected by admin \`${adminId}\``,
        {
          parse_mode: "Markdown",
          reply_markup: { inline_keyboard: [] },
        }
      );
      await ctx.answerCbQuery("Rejected");
      return;
    }

    // Approve
    if (!config.paidGroupId) {
      await ctx.answerCbQuery("TELEGRAM_PAID_GROUP_ID is not set");
      await ctx.reply(
        "Set TELEGRAM_PAID_GROUP_ID in env, make the bot admin of the paid group, then try Approve again."
      );
      return;
    }

    let inviteLink = "";
    try {
      const link = await ctx.telegram.createChatInviteLink(config.paidGroupId, {
        name: `liq-${request.telegram_user_id}`.slice(0, 32),
        member_limit: 1,
        expire_date: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
      });
      inviteLink = link.invite_link;
    } catch (e) {
      console.error(e);
      await ctx.answerCbQuery("Could not create invite link");
      await ctx.reply(
        "Failed to create invite link. Make sure the bot is admin of the paid group with invite permission."
      );
      return;
    }

    await supabase.from("members").upsert({
      telegram_user_id: request.telegram_user_id,
      username: request.username,
      first_name: request.first_name,
      last_name: request.last_name,
      status: "active",
      approved_at: new Date().toISOString(),
    });

    await supabase
      .from("payment_requests")
      .update({
        status: "approved",
        reviewed_by: adminId,
        reviewed_at: new Date().toISOString(),
        invite_link: inviteLink,
        updated_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    try {
      await ctx.telegram.sendMessage(
        request.telegram_user_id,
        [
          "✅ Payment approved — welcome to Liq Academy!",
          "",
          "Here is your *one-time* invite link (expires in 24h):",
          inviteLink,
          "",
          `Mini App: ${config.miniAppUrl}`,
        ].join("\n"),
        { parse_mode: "Markdown", disable_web_page_preview: true }
      );
    } catch (e) {
      console.error("Failed to DM invite", e);
      await ctx.reply(
        `Approved, but could not DM the student. Send this link manually:\n${inviteLink}`
      );
    }

    const oldCaption =
      ctx.callbackQuery.message && "caption" in ctx.callbackQuery.message
        ? ctx.callbackQuery.message.caption || ""
        : "";
    await ctx.editMessageCaption(
      `${oldCaption}\n\n✅ Approved by admin \`${adminId}\`\nInvite sent.`,
      {
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard: [] },
      }
    );
    await ctx.answerCbQuery("Approved");
  });

  bot.catch((err, ctx) => {
    console.error("Bot error", err, ctx.updateType);
  });

  return {
    bot,
    config,
    async launchCommands() {
      await ensureCommands(bot);
    },
  };
}

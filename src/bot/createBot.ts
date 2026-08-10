import { Markup, Telegraf, Context } from "telegraf";
import type { Update } from "telegraf/types";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getBotConfig } from "@/bot/config";
import { getBotSettings } from "@/lib/bot-settings-server";
import { renderBotText } from "@/lib/bot-settings";

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

function baseVars(config: ReturnType<typeof getBotConfig>, firstName?: string) {
  return {
    first_name: firstName || "friend",
    mini_app_url: config.miniAppUrl,
    invite_link: "",
  };
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

async function replyStatus(ctx: BotContext, config: ReturnType<typeof getBotConfig>) {
  if (!ctx.from) return;
  const settings = await getBotSettings();
  const vars = baseVars(config, ctx.from.first_name);
  const member = await isActiveMember(ctx.from.id);
  if (member) {
    await ctx.reply(
      renderBotText(settings.status_member_text, vars),
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
    await ctx.reply(renderBotText(settings.status_none_text, vars), mainMenu());
    return;
  }
  if (latest.status === "pending") {
    await ctx.reply(
      renderBotText(settings.status_pending_text, vars),
      mainMenu()
    );
    return;
  }
  if (latest.status === "rejected") {
    await ctx.reply(renderBotText(settings.rejected_text, vars), mainMenu());
    return;
  }
  await ctx.reply(
    renderBotText(settings.status_member_text, vars),
    mainMenu()
  );
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
    const settings = await getBotSettings();
    const vars = baseVars(config, ctx.from?.first_name);
    await ctx.replyWithMarkdown(
      renderBotText(settings.welcome_text, vars),
      mainMenu()
    );
    await ctx.replyWithMarkdown(
      renderBotText(settings.payment_instructions, vars)
    );
  });

  bot.command("pay", async (ctx) => {
    const settings = await getBotSettings();
    const vars = baseVars(config, ctx.from?.first_name);
    await ctx.replyWithMarkdown(
      renderBotText(settings.payment_instructions, vars),
      mainMenu()
    );
  });

  bot.command("help", async (ctx) => {
    const settings = await getBotSettings();
    const vars = baseVars(config, ctx.from?.first_name);
    await ctx.replyWithMarkdown(
      renderBotText(settings.help_text, vars),
      mainMenu()
    );
  });

  bot.command("status", async (ctx) => {
    await replyStatus(ctx, config);
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
    const settings = await getBotSettings();
    const vars = baseVars(config, ctx.from?.first_name);
    await ctx.replyWithMarkdown(
      renderBotText(settings.payment_instructions, vars)
    );
  });

  bot.hears("📤 I already paid", async (ctx) => {
    const settings = await getBotSettings();
    const vars = baseVars(config, ctx.from?.first_name);
    await ctx.reply(renderBotText(settings.ask_screenshot_text, vars));
  });

  bot.hears("✅ My status", async (ctx) => {
    await replyStatus(ctx, config);
  });

  bot.hears("📚 Open Mini App", async (ctx) => {
    await ctx.reply(`Open the Mini App:\n${config.miniAppUrl}`, mainMenu());
  });

  bot.hears("ℹ️ Help", async (ctx) => {
    const settings = await getBotSettings();
    const vars = baseVars(config, ctx.from?.first_name);
    await ctx.replyWithMarkdown(
      renderBotText(settings.help_text, vars),
      mainMenu()
    );
  });

  bot.on("photo", async (ctx) => {
    if (ctx.chat?.type !== "private") {
      await ctx.reply(
        "Please send payment screenshots in a private chat with me."
      );
      return;
    }
    if (!ctx.from) return;

    const settings = await getBotSettings();
    const vars = baseVars(config, ctx.from.first_name);

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

    const sent = await ctx.telegram.sendPhoto(
      config.adminGroupId,
      best.file_id,
      {
        caption: adminCaption,
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback("✅ Approve", `pay:approve:${request.id}`),
            Markup.button.callback("❌ Reject", `pay:reject:${request.id}`),
          ],
        ]),
      }
    );

    await supabase
      .from("payment_requests")
      .update({
        admin_chat_id: sent.chat.id,
        admin_message_id: sent.message_id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", request.id);

    await ctx.reply(
      renderBotText(settings.proof_received_text, vars),
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

    const settings = await getBotSettings();
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
          renderBotText(
            settings.rejected_text,
            baseVars(config, request.first_name || undefined)
          )
        );
      } catch (e) {
        console.error("Failed to notify student", e);
      }

      const oldCaption =
        ctx.callbackQuery.message && "caption" in ctx.callbackQuery.message
          ? ctx.callbackQuery.message.caption || ""
          : "";
      await ctx.editMessageCaption(
        `${oldCaption}\n\n❌ Rejected by admin \`${adminId}\``,
        {
          parse_mode: "Markdown",
          reply_markup: { inline_keyboard: [] },
        }
      );
      await ctx.answerCbQuery("Rejected");
      return;
    }

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
        renderBotText(settings.approved_text, {
          ...baseVars(config, request.first_name || undefined),
          invite_link: inviteLink,
        }),
        { parse_mode: "Markdown" }
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

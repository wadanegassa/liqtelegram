import { Markup, Telegraf, Context } from "telegraf";
import type { Update } from "telegraf/types";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getBotConfig } from "@/bot/config";
import { getBotSettings } from "@/lib/bot-settings-server";
import { renderBotText } from "@/lib/bot-settings";

type BotContext = Context<Update>;
type Extra = object;

function displayName(ctx: BotContext) {
  const u = ctx.from;
  if (!u) return "Unknown";
  const name = [u.first_name, u.last_name].filter(Boolean).join(" ");
  return u.username ? `${name} (@${u.username})` : name || String(u.id);
}

function mainMenu() {
  return Markup.keyboard([
    ["How to pay", "I already paid"],
    ["My status", "Help"],
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

/** Telegram legacy Markdown is fragile — fall back to plain text on parse errors. */
async function safeReply(ctx: BotContext, text: string, extra: Extra = {}) {
  const body = (text || "").trim() || "…";
  const protectedExtra = { protect_content: true, ...extra };
  try {
    await ctx.reply(body, { parse_mode: "Markdown", ...protectedExtra });
  } catch (err) {
    console.error("Markdown reply failed, falling back to plain text", err);
    try {
      await ctx.reply(body.replace(/[*_`\[\]]/g, ""), protectedExtra);
    } catch (err2) {
      console.error("Plain reply failed", err2);
    }
  }
}

/**
 * Removing someone from a Telegram group bans them, so old invite links
 * look "expired". Unban first, then always mint a fresh unique link.
 */
async function issuePaidGroupInvite(
  telegram: BotContext["telegram"],
  paidGroupId: number,
  userId: number
): Promise<string> {
  try {
    await telegram.unbanChatMember(paidGroupId, userId, {
      only_if_banned: true,
    });
  } catch (e) {
    console.error("unbanChatMember failed (bot needs Ban users permission)", e);
  }

  const stamp = Date.now().toString().slice(-8);
  const link = await telegram.createChatInviteLink(paidGroupId, {
    name: `liq-${userId}-${stamp}`.slice(0, 32),
    member_limit: 1,
    expire_date: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
  });
  return link.invite_link;
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

async function sendPaymentInfo(ctx: BotContext, config: ReturnType<typeof getBotConfig>) {
  const settings = await getBotSettings();
  const vars = baseVars(config, ctx.from?.first_name);
  await safeReply(
    ctx,
    renderBotText(settings.payment_instructions, vars),
    mainMenu()
  );
}

async function sendHelp(ctx: BotContext, config: ReturnType<typeof getBotConfig>) {
  const settings = await getBotSettings();
  const vars = baseVars(config, ctx.from?.first_name);
  await safeReply(ctx, renderBotText(settings.help_text, vars), mainMenu());
}

async function replyStatus(
  ctx: BotContext,
  config: ReturnType<typeof getBotConfig>
) {
  if (!ctx.from) return;
  const settings = await getBotSettings();
  const vars = baseVars(config, ctx.from.first_name);
  const member = await isActiveMember(ctx.from.id);
  if (member) {
    await safeReply(
      ctx,
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
    await safeReply(
      ctx,
      renderBotText(settings.status_none_text, vars),
      mainMenu()
    );
    return;
  }
  if (latest.status === "pending") {
    await safeReply(
      ctx,
      renderBotText(settings.status_pending_text, vars),
      mainMenu()
    );
    return;
  }
  if (latest.status === "rejected") {
    await safeReply(
      ctx,
      renderBotText(settings.rejected_text, vars),
      mainMenu()
    );
    return;
  }
  await safeReply(
    ctx,
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
    { command: "rejoin", description: "Get a new paid-group invite if you were removed" },
  ]);
}

export function createBot() {
  const config = getBotConfig();
  const bot = new Telegraf<BotContext>(config.token);

  bot.start(async (ctx) => {
    try {
      if (ctx.chat?.type !== "private") {
        await ctx.reply("Please message me in a private chat to join.");
        return;
      }
      const settings = await getBotSettings();
      const vars = baseVars(config, ctx.from?.first_name);
      await safeReply(
        ctx,
        renderBotText(settings.welcome_text, vars),
        mainMenu()
      );
      await safeReply(ctx, renderBotText(settings.payment_instructions, vars));
    } catch (e) {
      console.error("/start failed", e);
      await ctx.reply("Sorry, something went wrong. Try /pay or /help.");
    }
  });

  bot.command("pay", async (ctx) => {
    try {
      await sendPaymentInfo(ctx, config);
    } catch (e) {
      console.error("/pay failed", e);
      await ctx.reply("Could not load payment info. Try again.");
    }
  });

  bot.command("help", async (ctx) => {
    try {
      await sendHelp(ctx, config);
    } catch (e) {
      console.error("/help failed", e);
      await ctx.reply("Help is temporarily unavailable.");
    }
  });

  bot.command("status", async (ctx) => {
    try {
      await replyStatus(ctx, config);
    } catch (e) {
      console.error("/status failed", e);
      await ctx.reply("Could not check status. Try again.");
    }
  });

  bot.command("chatid", async (ctx) => {
    const chat = ctx.chat;
    if (!chat) return;
    await ctx.reply(
      `Chat title: ${"title" in chat ? chat.title : "private"}\nChat ID: ${chat.id}\nType: ${chat.type}`
    );
  });

  bot.command("rejoin", async (ctx) => {
    if (ctx.chat?.type !== "private" || !ctx.from) {
      await ctx.reply("Message me in a private chat and send /rejoin.");
      return;
    }
    if (!config.paidGroupId) {
      await ctx.reply("Paid group is not configured yet.");
      return;
    }
    const member = await isActiveMember(ctx.from.id);
    if (!member) {
      await ctx.reply(
        "You are not an approved member yet. Pay, send a screenshot, and wait for admin approval."
      );
      return;
    }
    try {
      const inviteLink = await issuePaidGroupInvite(
        ctx.telegram,
        config.paidGroupId,
        ctx.from.id
      );
      await ctx.reply(
        `Here is a new one-time invite (valid 7 days). If you were removed before, this should work now:\n${inviteLink}`
      );
    } catch (e) {
      console.error("/rejoin failed", e);
      await ctx.reply(
        "Could not create a new invite. Ask an admin to unban you in the paid group, then try /rejoin again."
      );
    }
  });

  // Flexible menu matching (emoji differences used to break exact hears)
  bot.hears(/how to pay/i, async (ctx) => {
    try {
      await sendPaymentInfo(ctx, config);
    } catch (e) {
      console.error("how to pay failed", e);
    }
  });

  bot.hears(/i already paid/i, async (ctx) => {
    const settings = await getBotSettings();
    const vars = baseVars(config, ctx.from?.first_name);
    await safeReply(ctx, renderBotText(settings.ask_screenshot_text, vars));
  });

  bot.hears(/my status/i, async (ctx) => {
    await replyStatus(ctx, config);
  });

  bot.hears(/^(ℹ️\s*)?help$/i, async (ctx) => {
    await sendHelp(ctx, config);
  });

  bot.on("photo", async (ctx) => {
    try {
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
          "Admin proof group is not configured yet. Set TELEGRAM_ADMIN_GROUP_ID on Vercel and redeploy."
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
          "Could not save your proof. Make sure supabase/payments.sql was run."
        );
        return;
      }

      const adminCaption = [
        "New payment proof",
        `Request: ${request.id}`,
        `From: ${displayName(ctx)}`,
        `User ID: ${ctx.from.id}`,
        caption ? `Note: ${caption}` : null,
      ]
        .filter(Boolean)
        .join("\n");

      const sent = await ctx.telegram.sendPhoto(
        config.adminGroupId,
        best.file_id,
        {
          caption: adminCaption,
          protect_content: true,
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

      await safeReply(
        ctx,
        renderBotText(settings.proof_received_text, vars),
        mainMenu()
      );
    } catch (e) {
      console.error("photo handler failed", e);
      await ctx.reply("Could not process that screenshot. Please try again.");
    }
  });

  bot.action(/^pay:(approve|reject):(.+)$/, async (ctx) => {
    try {
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
            ),
            { protect_content: true }
          );
        } catch (e) {
          console.error("Failed to notify student", e);
        }

        const oldCaption =
          ctx.callbackQuery.message && "caption" in ctx.callbackQuery.message
            ? ctx.callbackQuery.message.caption || ""
            : "";
        await ctx.editMessageCaption(
          `${oldCaption}\n\nRejected by admin ${adminId}`,
          { reply_markup: { inline_keyboard: [] } }
        );
        await ctx.answerCbQuery("Rejected");
        return;
      }

      if (!config.paidGroupId) {
        await ctx.answerCbQuery("TELEGRAM_PAID_GROUP_ID is not set");
        await ctx.reply(
          "Set TELEGRAM_PAID_GROUP_ID on Vercel, make the bot admin of the paid group, then Approve again."
        );
        return;
      }

      let inviteLink = "";
      try {
        inviteLink = await issuePaidGroupInvite(
          ctx.telegram,
          config.paidGroupId,
          request.telegram_user_id
        );
      } catch (e) {
        console.error(e);
        await ctx.answerCbQuery("Could not create invite link");
        await ctx.reply(
          "Failed to create invite link. Make the bot admin with Invite users AND Ban users (needed to unban people who were removed)."
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

      const approveMsg = renderBotText(settings.approved_text, {
        ...baseVars(config, request.first_name || undefined),
        invite_link: inviteLink,
      });

      try {
        await ctx.telegram.sendMessage(request.telegram_user_id, approveMsg);
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
        `${oldCaption}\n\nApproved by admin ${adminId}\nInvite sent.`,
        { reply_markup: { inline_keyboard: [] } }
      );
      await ctx.answerCbQuery("Approved");
    } catch (e) {
      console.error("approve/reject failed", e);
      try {
        await ctx.answerCbQuery("Error — check logs");
      } catch {
        /* ignore */
      }
    }
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

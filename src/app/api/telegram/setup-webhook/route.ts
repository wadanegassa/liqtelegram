import { NextRequest, NextResponse } from "next/server";
import { createBot } from "@/bot/createBot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * One-time setup: registers Telegram webhook + bot menu commands.
 * Call:
 *   POST /api/telegram/setup-webhook
 *   Header: x-setup-secret: <ADMIN_PASSWORD or TELEGRAM_SETUP_SECRET>
 */
export async function POST(request: NextRequest) {
  try {
    const setupSecret =
      process.env.TELEGRAM_SETUP_SECRET || process.env.ADMIN_PASSWORD || "";
    const provided = request.headers.get("x-setup-secret") || "";
    if (!setupSecret || provided !== setupSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { bot, config, launchCommands } = createBot();
    const base =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");

    if (!base) {
      return NextResponse.json(
        {
          error:
            "Set NEXT_PUBLIC_APP_URL to your https site (e.g. https://liqtelegram.vercel.app)",
        },
        { status: 400 }
      );
    }

    const webhookUrl = `${base.replace(/\/$/, "")}/api/telegram/webhook`;
    await launchCommands();
    await bot.telegram.setWebhook(webhookUrl, {
      secret_token: config.webhookSecret,
      drop_pending_updates: true,
      allowed_updates: ["message", "callback_query"],
    });

    const info = await bot.telegram.getWebhookInfo();
    return NextResponse.json({
      ok: true,
      webhookUrl,
      webhookInfo: info,
      adminGroupConfigured: Boolean(config.adminGroupId),
      paidGroupConfigured: Boolean(config.paidGroupId),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Setup failed",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const setupSecret =
      process.env.TELEGRAM_SETUP_SECRET || process.env.ADMIN_PASSWORD || "";
    const provided =
      request.headers.get("x-setup-secret") ||
      request.nextUrl.searchParams.get("secret") ||
      "";
    if (!setupSecret || provided !== setupSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { bot, config } = createBot();
    const info = await bot.telegram.getWebhookInfo();
    return NextResponse.json({
      webhookInfo: info,
      adminGroupConfigured: Boolean(config.adminGroupId),
      paidGroupConfigured: Boolean(config.paidGroupId),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed",
      },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createBot } from "@/bot/createBot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

let botInstance: ReturnType<typeof createBot> | null = null;

function getBot() {
  if (!botInstance) botInstance = createBot();
  return botInstance;
}

export async function POST(request: NextRequest) {
  try {
    const { bot, config } = getBot();
    const expected = (config.webhookSecret || "").trim();
    const provided = (
      request.headers.get("x-telegram-bot-api-secret-token") || ""
    ).trim();

    // Only enforce when a secret is configured. If Telegram sends one and we
    // have one, they must match.
    if (expected && provided && provided !== expected) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (expected && !provided) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const update = await request.json();
    await bot.handleUpdate(update);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Webhook error", error);
    // Always 200 to Telegram after accept so it does not retry forever on app bugs
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Webhook failed",
    });
  }
}

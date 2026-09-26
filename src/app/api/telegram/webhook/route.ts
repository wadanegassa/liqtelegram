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
    const expected = config.webhookSecret;
    if (expected && /^[A-Za-z0-9_-]{1,256}$/.test(expected)) {
      const got = request.headers.get("x-telegram-bot-api-secret-token") || "";
      if (got !== expected) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const update = await request.json();
    await bot.handleUpdate(update);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Webhook error", error);
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Webhook failed",
    });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, service: "telegram-webhook" });
}

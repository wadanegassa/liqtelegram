import { NextRequest, NextResponse } from "next/server";
import { createBot } from "@/bot/createBot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let botPromise: ReturnType<typeof createBot> | null = null;

function getBot() {
  if (!botPromise) botPromise = createBot();
  return botPromise;
}

export async function POST(request: NextRequest) {
  try {
    const { bot, config } = getBot();
    const secret = request.headers.get("x-telegram-bot-api-secret-token");
    if (config.webhookSecret && secret !== config.webhookSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const update = await request.json();
    await bot.handleUpdate(update);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Webhook error", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Webhook failed",
      },
      { status: 500 }
    );
  }
}

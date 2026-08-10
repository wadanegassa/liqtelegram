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
    const { bot } = getBot();
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

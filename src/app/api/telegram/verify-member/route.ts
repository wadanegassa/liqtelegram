import { NextRequest, NextResponse } from "next/server";
import {
  isPaidGroupMember,
  validateWebAppInitData,
} from "@/lib/telegram-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const initData = String(body.initData || "");

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const paidGroupId = Number(process.env.TELEGRAM_PAID_GROUP_ID || "");

    if (!botToken) {
      return NextResponse.json(
        { allowed: false, error: "Bot token not configured." },
        { status: 500 }
      );
    }
    if (!paidGroupId) {
      return NextResponse.json(
        {
          allowed: false,
          error: "TELEGRAM_PAID_GROUP_ID is not set on the server.",
        },
        { status: 500 }
      );
    }

    const validated = validateWebAppInitData(initData, botToken);
    if (!validated.ok) {
      return NextResponse.json(
        { allowed: false, error: validated.error },
        { status: 401 }
      );
    }

    const membership = await isPaidGroupMember(
      botToken,
      paidGroupId,
      validated.user.id
    );

    if (!membership.member) {
      return NextResponse.json({
        allowed: false,
        error:
          membership.error ||
          "Only members of the paid Telegram group can open this content.",
        status: membership.status || null,
      });
    }

    return NextResponse.json({
      allowed: true,
      userId: validated.user.id,
      status: membership.status,
    });
  } catch (e) {
    return NextResponse.json(
      {
        allowed: false,
        error: e instanceof Error ? e.message : "Verification failed",
      },
      { status: 500 }
    );
  }
}

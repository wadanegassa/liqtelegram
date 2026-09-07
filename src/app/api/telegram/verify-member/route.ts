import { NextRequest, NextResponse } from "next/server";
import {
  isPaidGroupMember,
  validateWebAppInitData,
} from "@/lib/telegram-auth";
import {
  MEMBER_COOKIE_NAME,
  attachMemberSessionCookie,
  createMemberSessionToken,
  verifyMemberSessionToken,
} from "@/lib/member-session";

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

    const userId = validated.user.id;
    const existing = request.cookies.get(MEMBER_COOKIE_NAME)?.value;
    if (await verifyMemberSessionToken(existing, userId)) {
      return NextResponse.json({
        allowed: true,
        userId,
        status: "cached",
        cached: true,
      });
    }

    const membership = await isPaidGroupMember(botToken, paidGroupId, userId);

    if (!membership.member) {
      return NextResponse.json({
        allowed: false,
        error:
          membership.error ||
          "Only members of the paid Telegram group can open this content.",
        status: membership.status || null,
      });
    }

    const res = NextResponse.json({
      allowed: true,
      userId,
      status: membership.status,
      cached: false,
    });
    try {
      const token = await createMemberSessionToken(userId);
      attachMemberSessionCookie(res, token);
    } catch (e) {
      console.error("Could not set member session cookie", e);
    }
    return res;
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

import { SignJWT, jwtVerify } from "jose";
import type { NextResponse } from "next/server";

const COOKIE = "liq_member_session";
/** How long a successful Telegram membership check stays trusted. */
export const MEMBER_SESSION_SECONDS = 60 * 15;

function secretKey() {
  const secret =
    process.env.ADMIN_SESSION_SECRET || process.env.TELEGRAM_BOT_TOKEN;
  if (!secret) throw new Error("ADMIN_SESSION_SECRET is not set");
  return new TextEncoder().encode(secret);
}

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure:
      process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL),
    path: "/",
    maxAge,
  };
}

export async function createMemberSessionToken(
  userId: number
): Promise<string> {
  return new SignJWT({ role: "member", uid: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MEMBER_SESSION_SECONDS}s`)
    .sign(secretKey());
}

export async function verifyMemberSessionToken(
  token: string | undefined | null,
  userId: number
): Promise<boolean> {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return payload.role === "member" && payload.uid === userId;
  } catch {
    return false;
  }
}

export function attachMemberSessionCookie(res: NextResponse, token: string) {
  res.cookies.set(COOKIE, token, cookieOptions(MEMBER_SESSION_SECONDS));
}

export { COOKIE as MEMBER_COOKIE_NAME };

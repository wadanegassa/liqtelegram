import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

const COOKIE = "liq_admin_session";

function secretKey() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error("ADMIN_SESSION_SECRET is not set");
  return new TextEncoder().encode(secret);
}

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    // Always secure on Vercel/HTTPS so the browser keeps the session cookie.
    secure: process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL),
    path: "/",
    maxAge,
  };
}

export async function createAdminSessionToken(): Promise<string> {
  return new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey());
}

export async function verifyAdminSessionToken(
  token?: string | null
): Promise<boolean> {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return payload.role === "admin";
  } catch {
    return false;
  }
}

/** Prefer attaching the cookie to the Route Handler response (reliable on Vercel). */
export function attachAdminSessionCookie(res: NextResponse, token: string) {
  res.cookies.set(COOKIE, token, cookieOptions(60 * 60 * 24 * 7));
}

export function clearAdminSessionCookieOnResponse(res: NextResponse) {
  res.cookies.set(COOKIE, "", cookieOptions(0));
}

export async function setAdminSessionCookie(token: string) {
  cookies().set(COOKIE, token, cookieOptions(60 * 60 * 24 * 7));
}

export async function clearAdminSessionCookie() {
  cookies().set(COOKIE, "", cookieOptions(0));
}

export async function requireAdmin(): Promise<boolean> {
  try {
    const token = cookies().get(COOKIE)?.value;
    return verifyAdminSessionToken(token);
  } catch {
    // Missing ADMIN_SESSION_SECRET (or cookie read failure) → treat as logged out
    return false;
  }
}

export function checkAdminPassword(password: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  return password === expected;
}

export { COOKIE as ADMIN_COOKIE_NAME };

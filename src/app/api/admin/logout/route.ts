import { NextResponse } from "next/server";
import { clearAdminSessionCookieOnResponse } from "@/lib/admin-auth";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  clearAdminSessionCookieOnResponse(res);
  return res;
}

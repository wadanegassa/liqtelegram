import { NextResponse } from "next/server";
import {
  checkAdminPassword,
  createAdminSessionToken,
  setAdminSessionCookie,
} from "@/lib/admin-auth";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const password = String(body.password || "");

  if (!checkAdminPassword(password)) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const token = await createAdminSessionToken();
  await setAdminSessionCookie(token);
  return NextResponse.json({ ok: true });
}

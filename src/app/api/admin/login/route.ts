import { NextResponse } from "next/server";
import {
  attachAdminSessionCookie,
  checkAdminPassword,
  createAdminSessionToken,
} from "@/lib/admin-auth";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const password = String(body.password || "");

    if (!checkAdminPassword(password)) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    if (!process.env.ADMIN_SESSION_SECRET) {
      return NextResponse.json(
        {
          error:
            "ADMIN_SESSION_SECRET is missing on the server. Add it in Vercel → Settings → Environment Variables, then redeploy.",
        },
        { status: 500 }
      );
    }

    const token = await createAdminSessionToken();
    const res = NextResponse.json({ ok: true });
    attachAdminSessionCookie(res, token);
    return res;
  } catch (e) {
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "Login failed",
      },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET() {
  const ok = await requireAdmin();
  return NextResponse.json({ authenticated: ok });
}

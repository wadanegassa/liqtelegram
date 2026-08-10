import crypto from "crypto";

export type TelegramWebAppUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
};

export function validateWebAppInitData(
  initData: string,
  botToken: string,
  maxAgeSeconds = 60 * 60 * 24
): { ok: true; user: TelegramWebAppUser } | { ok: false; error: string } {
  if (!initData?.trim()) {
    return { ok: false, error: "Missing Telegram login data. Open the link inside Telegram." };
  }

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return { ok: false, error: "Invalid Telegram login data." };

  const pairs: string[] = [];
  params.forEach((value, key) => {
    if (key !== "hash") pairs.push(`${key}=${value}`);
  });
  pairs.sort();
  const dataCheckString = pairs.join("\n");

  const secretKey = crypto
    .createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();
  const calculated = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  const a = Buffer.from(calculated, "hex");
  const b = Buffer.from(hash, "hex");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, error: "Telegram login check failed." };
  }

  const authDate = Number(params.get("auth_date") || 0);
  if (!authDate || Date.now() / 1000 - authDate > maxAgeSeconds) {
    return { ok: false, error: "Telegram session expired. Close and reopen the Mini App." };
  }

  const userRaw = params.get("user");
  if (!userRaw) return { ok: false, error: "No Telegram user in login data." };

  try {
    const user = JSON.parse(userRaw) as TelegramWebAppUser;
    if (!user?.id) return { ok: false, error: "Invalid Telegram user." };
    return { ok: true, user };
  } catch {
    return { ok: false, error: "Invalid Telegram user payload." };
  }
}

export async function isPaidGroupMember(
  botToken: string,
  paidGroupId: number,
  userId: number
): Promise<{ member: boolean; status?: string; error?: string }> {
  try {
    const url = `https://api.telegram.org/bot${botToken}/getChatMember`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: paidGroupId, user_id: userId }),
      cache: "no-store",
    });
    const json = (await res.json()) as {
      ok: boolean;
      description?: string;
      result?: { status: string };
    };
    if (!json.ok || !json.result) {
      return {
        member: false,
        error: json.description || "Could not check group membership.",
      };
    }
    const status = json.result.status;
    const allowed = ["creator", "administrator", "member", "restricted"].includes(
      status
    );
    return { member: allowed, status };
  } catch (e) {
    return {
      member: false,
      error: e instanceof Error ? e.message : "Membership check failed",
    };
  }
}

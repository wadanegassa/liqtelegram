/**
 * Accounts that should never count as real paying users in analytics.
 * Usernames are matched case-insensitively (with or without leading @).
 */
const TEST_USERNAMES = new Set(["pro_hispeace"]);

const TEST_TELEGRAM_USER_IDS = new Set<number>([
  856980344, // @Pro_hispeace
]);

export function normalizeTelegramUsername(
  username: string | null | undefined
): string {
  return (username || "").trim().replace(/^@/, "").toLowerCase();
}

export function isTestAccount(input: {
  telegram_user_id?: number | null;
  username?: string | null;
}): boolean {
  if (
    input.telegram_user_id != null &&
    TEST_TELEGRAM_USER_IDS.has(Number(input.telegram_user_id))
  ) {
    return true;
  }
  const u = normalizeTelegramUsername(input.username);
  return Boolean(u && TEST_USERNAMES.has(u));
}

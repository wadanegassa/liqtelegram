import { config as loadEnv } from "dotenv";
import path from "path";

loadEnv({ path: path.resolve(process.cwd(), ".env.local") });
loadEnv();

async function main() {
  const { createBot } = await import("../src/bot/createBot");
  const { bot, launchCommands, config } = createBot();

  // Long polling conflicts with webhooks — clear webhook first for local dev.
  await bot.telegram.deleteWebhook({ drop_pending_updates: false });
  await launchCommands();

  console.log("Bot polling started as @%s-ready", "Liq_Academy_bot");
  console.log(
    "Admin group:",
    config.adminGroupId || "(not set — use /chatid in the proof group)"
  );
  console.log(
    "Paid group:",
    config.paidGroupId || "(not set — use /chatid in the paid group)"
  );

  await bot.launch();
  console.log("Listening for updates…");

  process.once("SIGINT", () => bot.stop("SIGINT"));
  process.once("SIGTERM", () => bot.stop("SIGTERM"));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

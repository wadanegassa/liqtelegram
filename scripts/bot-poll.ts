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
    config.adminGroupId ||
      "(not set — add bot to proof group, forward a group message to @RawDataBot for chat id)"
  );
  console.log(
    "Paid group:",
    config.paidGroupId ||
      "(not set — add bot to paid group, forward a group message to @RawDataBot for chat id)"
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

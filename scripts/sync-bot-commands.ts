import { config as loadEnv } from "dotenv";
import path from "path";

loadEnv({ path: path.resolve(process.cwd(), ".env.local") });
loadEnv();

async function main() {
  const { createBot } = await import("../src/bot/createBot");
  const { bot, launchCommands } = createBot();

  const scopes = [
    { type: "default" as const },
    { type: "all_private_chats" as const },
    { type: "all_group_chats" as const },
    { type: "all_chat_administrators" as const },
  ];

  console.log("Before sync:");
  for (const scope of scopes) {
    const commands = await bot.telegram.getMyCommands({ scope });
    if (commands.length) {
      console.log(`  ${scope.type}:`, commands.map((c) => c.command).join(", "));
    }
  }

  await launchCommands();

  console.log("\nAfter sync:");
  for (const scope of scopes) {
    const commands = await bot.telegram.getMyCommands({ scope });
    console.log(`  ${scope.type}:`, commands.map((c) => c.command).join(", ") || "(empty)");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

// Reads only bot configuration; never prints tokens or API URLs.
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token || !/^\d+:[A-Za-z0-9_-]+$/.test(token)) {
  console.error("Set TELEGRAM_BOT_TOKEN in .env.local first.");
  process.exitCode = 1;
} else {
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${token}/getUpdates`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          allowed_updates: ["message"],
          limit: 100,
          timeout: 0,
        }),
        signal: AbortSignal.timeout(10000),
      },
    );
    const data = await response.json();
    if (!response.ok || data.ok !== true || !Array.isArray(data.result))
      throw new Error();
    const chats = new Map();
    for (const update of data.result) {
      const chat = update.message?.chat;
      if (chat && ["private", "group", "supergroup"].includes(chat.type))
        chats.set(String(chat.id), {
          id: String(chat.id),
          type: chat.type,
          name: chat.title || chat.first_name || "",
          username: chat.username || "",
        });
    }
    if (chats.size) console.table([...chats.values()]);
    else
      console.info(
        "No recent messages. Open your bot in Telegram, press Start (or send /start), then run this command again.",
      );
  } catch {
    console.error(
      "Could not read bot messages. Check the token, connection, and that this new bot has no webhook or other polling application. No messages were sent.",
    );
    process.exitCode = 1;
  }
}

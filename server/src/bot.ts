import { db, botSubscriptions, tokens } from "./db";
import { pumpEvents } from "./events";
import type { Token } from "./db/schema";
import { eq, count } from "drizzle-orm";

const TELEGRAM_API = "https://api.telegram.org";

function botToken(): string {
  const t = process.env.PUMP_ALPHA_BOT_TOKEN;
  if (!t) throw new Error("PUMP_ALPHA_BOT_TOKEN is not set");
  return t;
}

async function sendMessage(
  chatId: number,
  text: string,
  parseMode: "HTML" | "Markdown" = "HTML"
) {
  const url = `${TELEGRAM_API}/bot${botToken()}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: parseMode,
      disable_web_page_preview: true,
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error(`[bot] sendMessage failed: ${res.status} ${body}`);
  }
}

function passesFilter(token: Token, filter: string): boolean {
  if (filter === "all") return true;
  if (filter === "social") {
    return !!(token.twitter || token.telegram || token.website);
  }
  if (filter === "mcap") {
    const mcap = parseFloat(token.marketCapUsd ?? "0");
    return mcap > 0;
  }
  return true;
}

function formatTokenMessage(token: Token): string {
  const lines: string[] = [];

  const name = token.name || "Unknown";
  const symbol = token.symbol ? `$${token.symbol}` : "";
  lines.push(`🚀 <b>${name}</b> ${symbol}`);

  if (token.description) {
    const desc =
      token.description.length > 200
        ? token.description.slice(0, 200) + "…"
        : token.description;
    lines.push(`📝 ${desc}`);
  }

  if (token.marketCapUsd && parseFloat(token.marketCapUsd) > 0) {
    const mcap = parseFloat(token.marketCapUsd);
    const formatted =
      mcap >= 1000
        ? `$${(mcap / 1000).toFixed(1)}K`
        : `$${mcap.toFixed(2)}`;
    lines.push(`💰 MCap: ${formatted}`);
  }

  const socials: string[] = [];
  if (token.twitter) socials.push(`<a href="${token.twitter}">🐦 Twitter</a>`);
  if (token.telegram) socials.push(`<a href="${token.telegram}">📱 Telegram</a>`);
  if (token.website) socials.push(`<a href="${token.website}">🌐 Website</a>`);
  if (socials.length > 0) lines.push(socials.join("  "));

  lines.push(`🪙 <code>${token.mint}</code>`);
  lines.push(`🔗 <a href="https://pump.fun/${token.mint}">View on pump.fun</a>`);

  return lines.join("\n");
}

const subscriptions = new Map<
  number,
  { chatId: number; filter: string; active: boolean }
>();

async function loadSubscriptions() {
  const rows = await db
    .select()
    .from(botSubscriptions)
    .where(eq(botSubscriptions.active, true));

  for (const row of rows) {
    subscriptions.set(row.chatId, {
      chatId: row.chatId,
      filter: row.filter,
      active: row.active,
    });
  }
  console.log(`[bot] Loaded ${subscriptions.size} active subscriptions`);
}

async function upsertSubscription(chatId: number, filter: string) {
  await db
    .insert(botSubscriptions)
    .values({ chatId, filter, active: true })
    .onConflictDoUpdate({
      target: botSubscriptions.chatId,
      set: { filter, active: true },
    });
  subscriptions.set(chatId, { chatId, filter, active: true });
}

async function deactivateSubscription(chatId: number) {
  await db
    .update(botSubscriptions)
    .set({ active: false })
    .where(eq(botSubscriptions.chatId, chatId));
  subscriptions.delete(chatId);
}

async function updateFilter(chatId: number, filter: string) {
  const existing = subscriptions.get(chatId);
  if (!existing) {
    await upsertSubscription(chatId, filter);
  } else {
    await db
      .update(botSubscriptions)
      .set({ filter })
      .where(eq(botSubscriptions.chatId, chatId));
    existing.filter = filter;
  }
}

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from?: { id: number; username?: string };
    chat: { id: number; type: string };
    text?: string;
    date: number;
  };
}

export async function handleWebhookUpdate(update: TelegramUpdate) {
  const msg = update.message;
  if (!msg || !msg.text) return;

  const chatId = msg.chat.id;
  const text = msg.text.trim();

  if (text.startsWith("/start")) {
    await upsertSubscription(chatId, "all");
    await sendMessage(
      chatId,
      `✅ <b>Subscribed!</b> You'll receive all new token launches from pump.fun.\n\nUse /filter to narrow down:\n• <code>/filter all</code> — everything\n• <code>/filter social</code> — tokens with social links\n• <code>/filter mcap</code> — tokens with market cap\n\nUse /stop to unsubscribe.`
    );
  } else if (text.startsWith("/stop")) {
    await deactivateSubscription(chatId);
    await sendMessage(chatId, "🛑 <b>Unsubscribed.</b> Use /start to resubscribe.");
  } else if (text.startsWith("/filter")) {
    const parts = text.split(/\s+/);
    const filterVal = parts[1]?.toLowerCase();
    if (!filterVal || !["all", "social", "mcap"].includes(filterVal)) {
      await sendMessage(
        chatId,
        "❓ Valid filters: <code>all</code>, <code>social</code>, <code>mcap</code>\n\nExample: <code>/filter social</code>"
      );
      return;
    }
    await updateFilter(chatId, filterVal);
    const labels: Record<string, string> = {
      all: "All tokens",
      social: "Tokens with social links",
      mcap: "Tokens with market cap",
    };
    await sendMessage(chatId, `✅ Filter set to: <b>${labels[filterVal]}</b>`);
  } else if (text.startsWith("/status")) {
    const sub = subscriptions.get(chatId);
    const [{ value: tokenCount }] = await db
      .select({ value: count() })
      .from(tokens);
    if (sub) {
      await sendMessage(
        chatId,
        `📊 <b>Status</b>\n• Filter: <b>${sub.filter}</b>\n• Total tokens tracked: <b>${tokenCount}</b>\n• Active subscribers: <b>${subscriptions.size}</b>`
      );
    } else {
      await sendMessage(
        chatId,
        `📊 Not subscribed. Use /start to subscribe.\n• Total tokens tracked: <b>${tokenCount}</b>`
      );
    }
  } else if (text.startsWith("/help")) {
    await sendMessage(
      chatId,
      `🤖 <b>Xtreme Pump Bot</b>\n\nCommands:\n• /start — subscribe to token launches\n• /stop — unsubscribe\n• /filter [all|social|mcap] — set filter\n• /status — show current settings\n• /help — show this message`
    );
  }
}

export async function startBot() {
  await loadSubscriptions();

  pumpEvents.onToken(async (token: Token) => {
    const promises: Promise<void>[] = [];

    for (const sub of subscriptions.values()) {
      if (!sub.active) continue;
      if (!passesFilter(token, sub.filter)) continue;

      const message = formatTokenMessage(token);
      promises.push(
        sendMessage(sub.chatId, message).catch((err) => {
          console.error(`[bot] Failed to send to ${sub.chatId}:`, err);
        })
      );
    }

    await Promise.allSettled(promises);
  });

  console.log("[bot] Bot started and listening for token events");
}

export function getSubscriberCount(): number {
  return subscriptions.size;
}

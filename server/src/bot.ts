import { db, botSubscriptions, tokens } from "./db";
import { pumpEvents } from "./events";
import type { Token } from "./db/schema";
import { eq, count, gte } from "drizzle-orm";
import { scoreToken, starsDisplay, scoreLabel, type ScoreBreakdown } from "./scorer";
import { generateBoostCard } from "./lib/cardGen";
import fs from "fs";
import path from "path";

const TELEGRAM_API = "https://api.telegram.org";
const BANNER_PATH = path.join(__dirname, "banner.png");

function botToken(): string {
  const t = process.env.XTREME_PUMP_BOT_TOKEN;
  if (!t) throw new Error("XTREME_PUMP_BOT_TOKEN is not set");
  return t;
}

const MINI_APP_URL = "https://pump.xtremerippleprotocol.online/pump-alpha/";

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
    if (res.status === 429) {
      markRateLimited(chatId, (JSON.parse(body) as { parameters?: { retry_after?: number } }).parameters?.retry_after ?? 30);
      return;
    }
    console.error(`[bot] sendMessage failed: ${res.status} ${body.slice(0, 200)}`);
  }
}

async function sendWebAppButton(chatId: number, text: string) {
  const url = `${TELEGRAM_API}/bot${botToken()}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
      reply_markup: {
        inline_keyboard: [[
          { text: "🚀 Open Alpha Feed", web_app: { url: MINI_APP_URL } },
        ]],
      },
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error(`[bot] sendWebAppButton failed: ${res.status} ${body.slice(0, 200)}`);
  }
}

// Banner file_id cache — upload once, reuse forever
let bannerFileId: string | null = null;

// ── Per-chat send queue (1 msg/sec drip — avoids all 429s) ───────────────────
const MAX_QUEUE = 120; // cap per chat; oldest dropped when exceeded
const SEND_INTERVAL_MS = 300; // 300ms between sends — channels allow 30 msg/sec

type SendFn = () => Promise<void>;
const chatQueues   = new Map<number, SendFn[]>();
const chatSending  = new Set<number>();

function sleep(ms: number) { return new Promise<void>(r => setTimeout(r, ms)); }

function enqueueAlert(chatId: number, fn: SendFn) {
  if (!chatQueues.has(chatId)) chatQueues.set(chatId, []);
  const q = chatQueues.get(chatId)!;
  q.push(fn);
  // Keep only newest MAX_QUEUE items so memory stays bounded
  if (q.length > MAX_QUEUE) q.splice(0, q.length - MAX_QUEUE);
  if (!chatSending.has(chatId)) drainQueue(chatId);
}

async function drainQueue(chatId: number) {
  chatSending.add(chatId);
  const q = chatQueues.get(chatId) ?? [];
  while (q.length > 0) {
    const fn = q.shift()!;
    try { await fn(); } catch (err) { console.error("[bot] queue send error:", err); }
    if (q.length > 0) await sleep(SEND_INTERVAL_MS);
  }
  chatSending.delete(chatId);
}

// ── Kept for backward compat (used by sendMessage 429 handler) ────────────────
const blockedUntil = new Map<number, number>();

function isChatReady(_chatId: number): boolean { return true; } // queue handles pacing now

function markRateLimited(chatId: number, retryAfterSec: number) {
  // On a real 429, pause this chat's drainQueue by re-queueing a sleep fn
  const q = chatQueues.get(chatId);
  if (q) q.unshift(() => sleep(retryAfterSec * 1000));
  blockedUntil.set(chatId, Date.now() + retryAfterSec * 1000);
  console.warn(`[bot] chat ${chatId} rate-limited — pausing ${retryAfterSec}s`);
}

async function sendPhotoAlert(chatId: number, caption: string): Promise<void> {
  const token = botToken();

  // Fast path: reuse cached file_id
  const openAppButton = {
    inline_keyboard: [[
      { text: "🚀 Open Alpha Feed", web_app: { url: MINI_APP_URL } },
      { text: "📢 Join Channel", url: "https://t.me/XtremePumpAlpha" },
    ]],
  };

  if (bannerFileId) {
    const res = await fetch(`${TELEGRAM_API}/bot${token}/sendPhoto`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        photo: bannerFileId,
        caption,
        parse_mode: "HTML",
        reply_markup: openAppButton,
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) return;
    const body = await res.text();
    if (res.status === 429) {
      const retryAfter = (JSON.parse(body) as { parameters?: { retry_after?: number } }).parameters?.retry_after ?? 30;
      markRateLimited(chatId, retryAfter);
      return;
    }
    // Any other error (403, 400, etc.) — log and give up for this token
    console.error(`[bot] sendPhoto failed: ${res.status} ${body.slice(0, 200)}`);
    return;
  }

  // Upload the banner file
  const form = new FormData();
  form.append("chat_id", String(chatId));
  form.append("parse_mode", "HTML");
  form.append("caption", caption);
  form.append("reply_markup", JSON.stringify(openAppButton));

  try {
    const fileBuffer = fs.readFileSync(BANNER_PATH);
    const blob = new Blob([fileBuffer], { type: "image/png" });
    form.append("photo", blob, "banner.png");
  } catch {
    // Banner file missing — fall back to text-only
    await sendMessageWithButton(chatId, caption);
    return;
  }

  const res = await fetch(`${TELEGRAM_API}/bot${token}/sendPhoto`, {
    method: "POST",
    body: form,
    signal: AbortSignal.timeout(15000),
  });

  if (res.ok) {
    const data = await res.json() as { result?: { photo?: { file_id: string }[] } };
    const photos = data.result?.photo;
    if (photos && photos.length > 0) {
      bannerFileId = photos[photos.length - 1].file_id;
      console.log("[bot] Banner file_id cached");
    }
  } else {
    const body = await res.text();
    if (res.status === 429) {
      const retryAfter = (JSON.parse(body) as { parameters?: { retry_after?: number } }).parameters?.retry_after ?? 30;
      markRateLimited(chatId, retryAfter);
      return;
    }
    console.error(`[bot] sendPhoto failed: ${res.status} ${body.slice(0, 200)}`);
    // Fall back to text message with button
    await sendMessageWithButton(chatId, caption);
  }
}

async function sendMessageWithButton(chatId: number, text: string): Promise<void> {
  const url = `${TELEGRAM_API}/bot${botToken()}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
      reply_markup: {
        inline_keyboard: [[
          { text: "🚀 Open Alpha Feed", web_app: { url: MINI_APP_URL } },
          { text: "📢 Join Channel", url: "https://t.me/XtremePumpAlpha" },
        ]],
      },
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) {
    const body = await res.text();
    if (res.status === 429) {
      markRateLimited(chatId, (JSON.parse(body) as { parameters?: { retry_after?: number } }).parameters?.retry_after ?? 30);
      return;
    }
    console.error(`[bot] sendMessageWithButton failed: ${res.status} ${body.slice(0, 200)}`);
  }
}

// ── Subscription map (in-memory, seeded from DB on startup) ─────────────────

interface Sub {
  chatId: number;
  filter: string;
  minScore: number;
  active: boolean;
}

const subscriptions = new Map<number, Sub>();

async function loadSubscriptions() {
  const rows = await db
    .select()
    .from(botSubscriptions)
    .where(eq(botSubscriptions.active, true));
  for (const row of rows) {
    subscriptions.set(row.chatId, {
      chatId: row.chatId,
      filter: row.filter,
      minScore: row.minScore ?? 1,
      active: row.active,
    });
  }
  console.log(`[bot] Loaded ${subscriptions.size} active subscriptions`);
}

async function upsertSubscription(chatId: number, filter = "all", minScore = 1) {
  await db
    .insert(botSubscriptions)
    .values({ chatId, filter, minScore, active: true })
    .onConflictDoUpdate({
      target: botSubscriptions.chatId,
      set: { filter, minScore, active: true },
    });
  subscriptions.set(chatId, { chatId, filter, minScore, active: true });
}

async function deactivateSubscription(chatId: number) {
  await db.update(botSubscriptions).set({ active: false }).where(eq(botSubscriptions.chatId, chatId));
  subscriptions.delete(chatId);
}

async function setSub(chatId: number, patch: Partial<Pick<Sub, "filter" | "minScore">>) {
  const existing = subscriptions.get(chatId) ?? { chatId, filter: "all", minScore: 1, active: true };
  const updated = { ...existing, ...patch };
  await db
    .insert(botSubscriptions)
    .values({ chatId: updated.chatId, filter: updated.filter, minScore: updated.minScore, active: true })
    .onConflictDoUpdate({
      target: botSubscriptions.chatId,
      set: { filter: updated.filter, minScore: updated.minScore, active: true },
    });
  subscriptions.set(chatId, updated);
}

// ── Token message formatter ──────────────────────────────────────────────────

function formatMcap(usd: string | null): string {
  const n = parseFloat(usd ?? "0");
  if (n === 0) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

function formatSol(val: string | null): string {
  const n = parseFloat(val ?? "0");
  return n > 0 ? `${n.toFixed(2)} SOL` : "—";
}

function formatTokenMessage(token: Token, breakdown?: ScoreBreakdown): string {
  // Recompute if not attached by poller
  if (!breakdown) {
    breakdown = scoreToken({
      initialBuySol: parseFloat(token.initialBuySol ?? "0"),
      vSolInBondingCurve: parseFloat(token.vSolInBondingCurve ?? "0"),
      marketCapSol: parseFloat(token.marketCapSol ?? "0"),
      name: token.name,
      symbol: token.symbol,
      description: token.description,
      imageUri: token.imageUri,
      twitter: token.twitter,
      telegram: token.telegram,
      website: token.website,
    });
  }

  const name   = token.name   || "Unknown Token";
  const symbol = token.symbol ? ` $${token.symbol}` : "";

  const lines: string[] = [];

  // ── Header ────────────────────────────────────────────────────────────────
  lines.push(`🚨 <b>${name}</b>${symbol}`);
  lines.push(`${starsDisplay(breakdown.stars)}  <b>${scoreLabel(breakdown.stars)}</b>  <code>${breakdown.stars}/5</code>`);
  if (breakdown.rugRisk) {
    lines.push(`🚨 <b>HIGH RUG RISK</b> — dev holds an oversized bag, likely dump`);
  }
  lines.push("");

  // ── Score breakdown ───────────────────────────────────────────────────────
  const row1 = [
    token.twitter  ? "✅ Twitter"  : "❌ Twitter",
    token.telegram ? "✅ Telegram" : "❌ Telegram",
    token.website  ? "✅ Website"  : "❌ Website",
  ].join("  ");
  const row2 = [
    token.description ? "✅ Desc" : "❌ Desc",
    token.imageUri    ? "✅ Image" : "❌ Image",
  ].join("  ");
  lines.push(row1);
  lines.push(row2);
  lines.push("");

  // ── Metrics ───────────────────────────────────────────────────────────────
  lines.push(`💰 MCap: <b>${formatMcap(token.marketCapUsd)}</b>`);
  lines.push(`🏊 LP: <b>${formatSol(token.vSolInBondingCurve)}</b> in curve`);
  lines.push(`💎 Dev buy: <b>${formatSol(token.initialBuySol)}</b>`);

  // ── Description ───────────────────────────────────────────────────────────
  if (token.description) {
    const desc = token.description.length > 160
      ? token.description.slice(0, 160) + "…"
      : token.description;
    lines.push("");
    lines.push(`📝 <i>${desc}</i>`);
  }

  // ── Warnings ─────────────────────────────────────────────────────────────
  if (breakdown.warnings.length > 0) {
    lines.push("");
    lines.push(`⚠️ <b>Red flags:</b> ${breakdown.warnings.join(" · ")}`);
  }

  // ── Links ─────────────────────────────────────────────────────────────────
  lines.push("");
  const socialLinks: string[] = [];
  if (token.twitter) socialLinks.push(`<a href="${token.twitter}">🐦</a>`);
  if (token.telegram) socialLinks.push(`<a href="${token.telegram}">📱</a>`);
  if (token.website) socialLinks.push(`<a href="${token.website}">🌐</a>`);
  const tradeLinks = [
    `<a href="https://pump.fun/${token.mint}">🚀 pump.fun</a>`,
    `<a href="https://dexscreener.com/solana/${token.mint}">📊 DexScreen</a>`,
    `<a href="https://birdeye.so/token/${token.mint}?chain=solana">👁 Birdeye</a>`,
  ];
  if (socialLinks.length) lines.push(socialLinks.join("  ") + "  " + tradeLinks.join("  "));
  else lines.push(tradeLinks.join("  "));

  // ── Contract ──────────────────────────────────────────────────────────────
  lines.push(`\n🪙 <code>${token.mint}</code>`);

  return lines.join("\n");
}

// ── Filter logic ─────────────────────────────────────────────────────────────

function passesFilter(token: Token, sub: Sub): boolean {
  // Score gate — always applied
  const score = token.score ?? 1;
  if (score < sub.minScore) return false;

  // Named filter
  if (sub.filter === "social") {
    return !!(token.twitter || token.telegram || token.website);
  }
  if (sub.filter === "mcap") {
    return parseFloat(token.marketCapUsd ?? "0") > 0;
  }
  return true; // "all"
}

// ── Webhook / command handler ────────────────────────────────────────────────

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
  const text   = msg.text.trim();
  const sub    = subscriptions.get(chatId);

  // /start
  if (text.startsWith("/start")) {
    await upsertSubscription(chatId);
    await sendMessage(chatId,
      `✅ <b>Subscribed to Xtreme Pump Bot!</b>\n\nYou'll receive every new pump.fun token with its <b>alpha score (1–5 ⭐)</b>.\n\n` +
      `<b>Commands:</b>\n` +
      `• /minscore 3 — only show tokens scoring ≥ 3 ⭐\n` +
      `• /filter social — only tokens with socials\n` +
      `• /filter mcap — only tokens with market cap\n` +
      `• /filter all — everything (default)\n` +
      `• /status — your current settings\n` +
      `• /stop — unsubscribe\n\n` +
      `<b>Score breakdown:</b>\n` +
      `⭐ = Low Alpha   ⭐⭐ = Weak   ⭐⭐⭐ = Mid\n` +
      `⭐⭐⭐⭐ = Strong   ⭐⭐⭐⭐⭐ = 🔥 GEM`
    );

  // /stop
  } else if (text.startsWith("/stop")) {
    await deactivateSubscription(chatId);
    await sendMessage(chatId, "🛑 <b>Unsubscribed.</b> Use /start to resubscribe.");

  // /minscore [1-5]
  } else if (text.startsWith("/minscore")) {
    const parts = text.split(/\s+/);
    const n = parseInt(parts[1] ?? "", 10);
    if (isNaN(n) || n < 1 || n > 5) {
      await sendMessage(chatId, "❓ Usage: <code>/minscore 1</code> to <code>/minscore 5</code>\n\nExample: <code>/minscore 3</code> — only show ⭐⭐⭐ and above.");
      return;
    }
    await setSub(chatId, { minScore: n });
    const stars = starsDisplay(n);
    await sendMessage(chatId, `✅ Minimum score set to <b>${n} ⭐</b> (${stars})\n\nYou'll only see tokens scoring ${n}+ stars.`);

  // /filter [all|social|mcap]
  } else if (text.startsWith("/filter")) {
    const parts = text.split(/\s+/);
    const val = parts[1]?.toLowerCase();
    if (!val || !["all", "social", "mcap"].includes(val)) {
      await sendMessage(chatId,
        "❓ Valid filters:\n• <code>/filter all</code> — everything\n• <code>/filter social</code> — tokens with socials\n• <code>/filter mcap</code> — tokens with market cap"
      );
      return;
    }
    await setSub(chatId, { filter: val });
    const labels: Record<string, string> = { all: "All tokens", social: "Has socials", mcap: "Has market cap" };
    await sendMessage(chatId, `✅ Filter: <b>${labels[val]}</b>`);

  // /status
  } else if (text.startsWith("/status")) {
    const [{ value: tokenCount }] = await db.select({ value: count() }).from(tokens);
    const [{ value: highScore }] = await db.select({ value: count() }).from(tokens).where(gte(tokens.score, 4));
    if (sub) {
      await sendMessage(chatId,
        `📊 <b>Your Settings</b>\n` +
        `• Filter: <b>${sub.filter}</b>\n` +
        `• Min score: <b>${sub.minScore} ⭐</b>\n\n` +
        `📈 <b>Bot Stats</b>\n` +
        `• Tokens tracked: <b>${tokenCount}</b>\n` +
        `• High-alpha (4–5⭐): <b>${highScore}</b>\n` +
        `• Active subscribers: <b>${subscriptions.size}</b>`
      );
    } else {
      await sendMessage(chatId,
        `📊 Not subscribed. Use /start.\n• Tokens tracked: <b>${tokenCount}</b>`
      );
    }

  // /alpha — open the mini app
  } else if (text.startsWith("/alpha")) {
    await sendWebAppButton(chatId,
      `⚡ <b>XTREME PUMP ALPHA FEED</b>\n\nReal-time pump.fun token launches scored 1–5 ⭐\n\nTap below to open the live terminal 👇`
    );

  // /help
  } else if (text.startsWith("/help")) {
    await sendMessage(chatId,
      `🤖 <b>Xtreme Pump Bot — Alpha Scoring</b>\n\n` +
      `Every new pump.fun token is scored <b>1–5 ⭐</b>:\n` +
      `• Socials (Twitter/TG/website)\n` +
      `• Description + image quality\n` +
      `• Dev initial buy-in (SOL)\n` +
      `• Bonding curve liquidity\n` +
      `• Name quality\n\n` +
      `<b>Commands:</b>\n` +
      `• /start — subscribe\n` +
      `• /stop — unsubscribe\n` +
      `• /alpha — open the live alpha terminal\n` +
      `• /minscore [1-5] — score threshold\n` +
      `• /filter [all|social|mcap] — extra filter\n` +
      `• /status — your settings + bot stats\n` +
      `• /help — this message`
    );
  }
}

// ── Bot startup ──────────────────────────────────────────────────────────────

export async function startBot() {
  await loadSubscriptions();

  // Auto-subscribe configured chat IDs from env
  const envChatIds = (process.env.PUMP_ALPHA_CHAT_IDS ?? "")
    .split(",")
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => Number.isFinite(n) && n !== 0);

  for (const chatId of envChatIds) {
    if (!subscriptions.has(chatId)) {
      await upsertSubscription(chatId).catch(() => {});
      console.log(`[bot] Auto-subscribed chat ${chatId}`);
    }
  }

  pumpEvents.onToken((token: Token) => {
    const breakdown = (token as Record<string, unknown>)._breakdown as ScoreBreakdown | undefined;
    const message   = formatTokenMessage(token, breakdown);

    for (const sub of subscriptions.values()) {
      if (!sub.active) continue;
      if (!passesFilter(token, sub)) continue;
      const chatId = sub.chatId;
      enqueueAlert(chatId, () =>
        sendPhotoAlert(chatId, message).catch((err) => {
          console.error(`[bot] Failed to send to ${chatId}:`, err);
        })
      );
    }
  });

  console.log("[bot] Ready — listening for pump.fun token events");
}

export function getSubscriberCount(): number {
  return subscriptions.size;
}

export interface BoostCardData {
  username: string;
  tokenName: string;
  symbol?: string;
  mint?: string;
  invested: number;
  sold: number;
  gainPct: number;
  gainX: string;
  callCount: number;
  avgGainX: string;
  bestGainX: string;
}

export async function postBoostCard(data: BoostCardData): Promise<void> {
  const mintLink = data.mint ? `\nhttps://pump.fun/${data.mint}` : "";
  const sym = data.symbol ? ` · <code>$${data.symbol}</code>` : "";
  const caption = [
    `⚡ <b>${data.username}</b> just posted a boost!`,
    ``,
    `🪙 <b>${data.tokenName}</b>${sym}${mintLink}`,
    `📥 <b>${data.invested.toFixed(2)} ◎</b> → 📤 <b>${data.sold.toFixed(2)} ◎</b>`,
    `📊 Return: <b>+${data.gainPct}%  ·  ${data.gainX}x</b>`,
  ].join("\n");

  const button = {
    inline_keyboard: [[
      { text: "🚀 Open Alpha Feed", web_app: { url: MINI_APP_URL } },
      { text: "📢 Join Channel", url: "https://t.me/XtremePumpAlpha" },
    ]],
  };

  let cardBuffer: Buffer | null = null;
  try {
    cardBuffer = generateBoostCard(data);
  } catch (err) {
    console.error("[bot] card generation failed, falling back to text:", err);
  }

  for (const sub of subscriptions.values()) {
    if (!sub.active) continue;
    const chatId = sub.chatId;
    try {
      if (cardBuffer) {
        const form = new FormData();
        form.append("chat_id", String(chatId));
        form.append("photo", new Blob([cardBuffer], { type: "image/png" }), "boost-card.png");
        form.append("caption", caption);
        form.append("parse_mode", "HTML");
        form.append("reply_markup", JSON.stringify(button));
        await fetch(`${TELEGRAM_API}/bot${botToken()}/sendPhoto`, {
          method: "POST",
          body: form,
          signal: AbortSignal.timeout(15000),
        });
      } else {
        await fetch(`${TELEGRAM_API}/bot${botToken()}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, text: caption, parse_mode: "HTML", disable_web_page_preview: true, reply_markup: button }),
          signal: AbortSignal.timeout(10000),
        });
      }
    } catch (err) {
      console.error(`[bot] postBoostCard error for ${chatId}:`, err);
    }
  }
}

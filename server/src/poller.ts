import WebSocket from "ws";
import { db, tokens } from "./db";
import { pumpEvents } from "./events";
import { scoreToken } from "./scorer";

const PUMP_FUN_WS = "wss://pumpportal.fun/api/data";
const RECONNECT_DELAY_MS = 5000;
const MAX_RECONNECT_DELAY_MS = 60000;
const PUMP_FUN_TOTAL_SUPPLY = 1_000_000_000; // every pump.fun token mints 1B supply

interface PumpNewTokenMessage {
  signature: string;
  mint: string;
  traderPublicKey: string;
  txType: "create" | "buy" | "sell";
  initialBuy: number;   // token amount bought by dev
  solAmount: number;    // SOL spent by dev on initial buy
  tokenAmount: number;
  bondingCurveKey: string;
  vTokensInBondingCurve: number;
  vSolInBondingCurve: number;
  marketCapSol: number;
  name: string;
  symbol: string;
  uri: string;
  pool: string;
}

interface TokenMetadata {
  name?: string;
  symbol?: string;
  description?: string;
  image?: string;
  twitter?: string;
  telegram?: string;
  website?: string;
}

let reconnectDelay = RECONNECT_DELAY_MS;
let ws: WebSocket | null = null;

// Live SOL price — refreshed every 5 min from CoinGecko free tier
let solPriceUsd = 170;
async function refreshSolPrice() {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd",
      { signal: AbortSignal.timeout(5000) }
    );
    if (res.ok) {
      const data = (await res.json()) as { solana?: { usd?: number } };
      if (data.solana?.usd) solPriceUsd = data.solana.usd;
    }
  } catch { /* keep last known price */ }
}
refreshSolPrice();
setInterval(refreshSolPrice, 5 * 60 * 1000);

async function fetchMetadata(uri: string): Promise<TokenMetadata> {
  try {
    const res = await fetch(uri, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return {};
    return (await res.json()) as TokenMetadata;
  } catch {
    return {};
  }
}

async function handleNewToken(data: PumpNewTokenMessage) {
  let meta: TokenMetadata = {};
  if (data.uri) {
    meta = await fetchMetadata(data.uri);
  }

  const mcapSol = data.marketCapSol ?? 0;
  const marketCapUsd = (mcapSol * solPriceUsd).toFixed(2);
  const initialBuySol = data.solAmount ?? 0;
  const vSolInBondingCurve = data.vSolInBondingCurve ?? 0;

  // Dev's slice of supply sniped at launch — the core anti-rug signal.
  // pumpportal usually reports `initialBuy` in whole tokens; if it ever arrives
  // raw (6-decimal) it would exceed total supply, so normalize defensively.
  let devTokens = data.initialBuy ?? 0;
  if (devTokens > PUMP_FUN_TOTAL_SUPPLY) devTokens = devTokens / 1e6;
  const devHoldingPct = Math.min(100, (devTokens / PUMP_FUN_TOTAL_SUPPLY) * 100);

  const name = data.name || meta.name || null;
  const symbol = data.symbol || meta.symbol || null;
  const description = meta.description || null;
  const imageUri = meta.image || null;
  const twitter = meta.twitter || null;
  const telegram = meta.telegram || null;
  const website = meta.website || null;

  // Score the token
  const breakdown = scoreToken({
    initialBuySol,
    vSolInBondingCurve,
    marketCapSol: mcapSol,
    devHoldingPct,
    name,
    symbol,
    description,
    imageUri,
    twitter,
    telegram,
    website,
  });

  const newToken = {
    mint: data.mint,
    symbol,
    name,
    description,
    imageUri,
    twitter,
    telegram,
    website,
    marketCapUsd,
    marketCapSol: mcapSol.toFixed(4),
    initialBuySol: initialBuySol.toFixed(4),
    vSolInBondingCurve: vSolInBondingCurve.toFixed(4),
    devHoldingPct: devHoldingPct.toFixed(2),
    score: breakdown.stars,
    scoreTotal: breakdown.total,
  };

  try {
    const [inserted] = await db
      .insert(tokens)
      .values(newToken)
      .onConflictDoUpdate({
        target: tokens.mint,
        set: {
          symbol: newToken.symbol,
          name: newToken.name,
          description: newToken.description,
          imageUri: newToken.imageUri,
          twitter: newToken.twitter,
          telegram: newToken.telegram,
          website: newToken.website,
          marketCapUsd: newToken.marketCapUsd,
          marketCapSol: newToken.marketCapSol,
          initialBuySol: newToken.initialBuySol,
          vSolInBondingCurve: newToken.vSolInBondingCurve,
          devHoldingPct: newToken.devHoldingPct,
          score: newToken.score,
          scoreTotal: newToken.scoreTotal,
        },
      })
      .returning();

    if (inserted) {
      // Attach breakdown for rich Telegram formatting (not stored in DB)
      (inserted as Record<string, unknown>)._breakdown = breakdown;
      pumpEvents.emitToken(inserted);
    }
  } catch (err) {
    console.error("[poller] DB upsert error:", err);
  }
}

function connect() {
  console.log(`[poller] Connecting to ${PUMP_FUN_WS}...`);
  ws = new WebSocket(PUMP_FUN_WS);

  ws.on("open", () => {
    console.log("[poller] Connected to pump.fun WebSocket");
    reconnectDelay = RECONNECT_DELAY_MS;
    ws!.send(JSON.stringify({ method: "subscribeNewToken" }));
  });

  ws.on("message", (raw: Buffer) => {
    try {
      const msg = JSON.parse(raw.toString()) as Partial<PumpNewTokenMessage>;
      if (msg.txType === "create" && msg.mint) {
        handleNewToken(msg as PumpNewTokenMessage).catch((err) => {
          console.error("[poller] handleNewToken error:", err);
        });
      }
    } catch { /* ignore non-JSON / ping frames */ }
  });

  ws.on("close", (code, reason) => {
    console.warn(`[poller] WS closed ${code} ${reason?.toString()}. Reconnecting in ${reconnectDelay}ms...`);
    scheduleReconnect();
  });

  ws.on("error", (err) => {
    console.error("[poller] WS error:", err.message);
    ws?.terminate();
  });
}

function scheduleReconnect() {
  setTimeout(() => {
    reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY_MS);
    connect();
  }, reconnectDelay);
}

export function startPoller() {
  connect();
}

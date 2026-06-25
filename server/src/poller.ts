import WebSocket from "ws";
import { db, tokens } from "./db";
import { pumpEvents } from "./events";
import { eq } from "drizzle-orm";

const PUMP_FUN_WS = "wss://client.pump.fun";
const RECONNECT_DELAY_MS = 5000;
const MAX_RECONNECT_DELAY_MS = 60000;

interface PumpTokenCreate {
  signature: string;
  mint: string;
  traderPublicKey: string;
  txType: string;
  initialBuy: number;
  solAmount: number;
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

async function fetchMetadata(uri: string): Promise<TokenMetadata> {
  try {
    const res = await fetch(uri, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return {};
    return (await res.json()) as TokenMetadata;
  } catch {
    return {};
  }
}

async function handleTokenCreate(data: PumpTokenCreate) {
  let meta: TokenMetadata = {};
  if (data.uri) {
    meta = await fetchMetadata(data.uri);
  }

  const mcapSol = data.marketCapSol ?? 0;
  const solPrice = 170;
  const marketCapUsd = (mcapSol * solPrice).toFixed(2);

  const newToken = {
    mint: data.mint,
    symbol: data.symbol || meta.symbol || null,
    name: data.name || meta.name || null,
    description: meta.description || null,
    imageUri: meta.image || null,
    twitter: meta.twitter || null,
    telegram: meta.telegram || null,
    website: meta.website || null,
    marketCapUsd: marketCapUsd,
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
        },
      })
      .returning();

    if (inserted) {
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

    ws!.send(
      JSON.stringify({
        method: "subscribeNewToken",
      })
    );
  });

  ws.on("message", (raw: Buffer) => {
    try {
      const msg = JSON.parse(raw.toString());

      if (msg.txType === "create" || (msg.mint && msg.signature)) {
        handleTokenCreate(msg as PumpTokenCreate).catch((err) => {
          console.error("[poller] handleTokenCreate error:", err);
        });
      }
    } catch {
    }
  });

  ws.on("close", (code, reason) => {
    console.warn(
      `[poller] WebSocket closed: ${code} ${reason}. Reconnecting in ${reconnectDelay}ms...`
    );
    scheduleReconnect();
  });

  ws.on("error", (err) => {
    console.error("[poller] WebSocket error:", err.message);
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

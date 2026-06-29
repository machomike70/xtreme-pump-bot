import { Router, Request, Response } from "express";
import { createHmac } from "crypto";
import { db, tokens, memberStats } from "../db";
import { pumpEvents } from "../events";
import { desc, lt, count, gte, sql } from "drizzle-orm";
import { postBoostCard } from "../bot";

const router = Router();

router.get("/tokens", async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit ?? "100"), 10), 200);
    const beforeId = req.query.before ? parseInt(String(req.query.before), 10) : undefined;
    const rows = beforeId
      ? await db.select().from(tokens).where(lt(tokens.id, beforeId)).orderBy(desc(tokens.id)).limit(limit)
      : await db.select().from(tokens).orderBy(desc(tokens.id)).limit(limit);
    res.json({ tokens: rows });
  } catch (err) {
    console.error("[feed] GET /tokens error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/stats", async (_req: Request, res: Response) => {
  try {
    const [{ totalAll }] = await db.select({ totalAll: count() }).from(tokens);
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [{ total24h }] = await db.select({ total24h: count() }).from(tokens).where(gte(tokens.createdAt, cutoff));
    res.json({ totalAll: Number(totalAll), total24h: Number(total24h) });
  } catch (err) {
    console.error("[feed] GET /stats error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/stream", (req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();
  res.write(": connected\n\n");

  const keepAlive = setInterval(() => res.write(": ping\n\n"), 30000);
  const onToken = (token: unknown) => res.write(`data: ${JSON.stringify(token)}\n\n`);
  pumpEvents.onToken(onToken);

  req.on("close", () => {
    clearInterval(keepAlive);
    pumpEvents.removeListener("token", onToken);
  });
});

// ── Boost card endpoint ───────────────────────────────────────────────────────

function verifyTelegramInitData(initData: string, botToken: string): { ok: boolean; userId?: number; username?: string } {
  try {
    const params = new URLSearchParams(initData);
    const hash   = params.get("hash");
    if (!hash) return { ok: false };
    params.delete("hash");

    const dataCheckString = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join("\n");

    const secretKey = createHmac("sha256", botToken).update("WebAppData").digest();
    const expected  = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

    if (expected !== hash) return { ok: false };

    const userRaw = params.get("user");
    if (!userRaw) return { ok: true };
    const user = JSON.parse(userRaw) as { id?: number; username?: string; first_name?: string };
    return { ok: true, userId: user.id, username: user.username ?? user.first_name };
  } catch {
    return { ok: false };
  }
}

const boostCooldown = new Map<number, number>(); // userId → last boost timestamp
const BOOST_COOLDOWN_MS = 24 * 60 * 60 * 1000;

router.post("/boost", async (req: Request, res: Response) => {
  const { initData, tokenName, symbol, mint, invested, sold } = req.body as {
    initData?: string;
    tokenName?: string;
    symbol?: string;
    mint?: string;
    invested?: number;
    sold?: number;
  };

  if (!tokenName || typeof invested !== "number" || typeof sold !== "number" || invested <= 0 || sold <= invested) {
    res.status(400).json({ error: "Invalid boost data — sold must be greater than invested" });
    return;
  }

  const botToken = process.env.XTREME_PUMP_BOT_TOKEN ?? "";
  const verified = initData ? verifyTelegramInitData(initData, botToken) : { ok: false };

  if (!verified.ok) {
    res.status(401).json({ error: "Open this in Telegram to post a boost" });
    return;
  }

  const userId = verified.userId ?? 0;
  const lastBoost = boostCooldown.get(userId) ?? 0;
  if (Date.now() - lastBoost < BOOST_COOLDOWN_MS) {
    const waitMins = Math.ceil((BOOST_COOLDOWN_MS - (Date.now() - lastBoost)) / 60_000);
    res.status(429).json({ error: `1 boost per 24h — try again in ${waitMins} min` });
    return;
  }

  const gainPct = Math.round(((sold - invested) / invested) * 100);
  const gainXNum = sold / invested;
  const gainX = gainXNum.toFixed(1);
  const username = verified.username ? `@${verified.username}` : "Alpha Member";

  boostCooldown.set(userId, Date.now());

  // Upsert member stats
  let callCount = 1;
  let avgGainX = gainX;
  let bestGainX = gainX;
  try {
    await db.insert(memberStats).values({
      userId,
      username,
      callCount: 1,
      totalInvested: String(invested),
      totalSold: String(sold),
      bestGainX: String(gainXNum),
      sumGainX: String(gainXNum),
    }).onConflictDoUpdate({
      target: memberStats.userId,
      set: {
        username,
        callCount: sql`${memberStats.callCount} + 1`,
        totalInvested: sql`${memberStats.totalInvested} + ${invested}`,
        totalSold: sql`${memberStats.totalSold} + ${sold}`,
        bestGainX: sql`GREATEST(${memberStats.bestGainX}::numeric, ${gainXNum})`,
        sumGainX: sql`${memberStats.sumGainX} + ${gainXNum}`,
        lastCallAt: new Date(),
      },
    });
    const [stats] = await db.select().from(memberStats).where(sql`${memberStats.userId} = ${userId}`);
    if (stats) {
      callCount = stats.callCount;
      avgGainX = (Number(stats.sumGainX) / stats.callCount).toFixed(1);
      bestGainX = Number(stats.bestGainX).toFixed(1);
    }
  } catch (err) {
    console.error("[feed] member stats upsert error:", err);
  }

  try {
    await postBoostCard({ username, tokenName, symbol, mint, invested, sold, gainPct, gainX, callCount, avgGainX, bestGainX });
    res.json({ ok: true });
  } catch (err) {
    console.error("[feed] boost post error:", err);
    res.status(500).json({ error: "Failed to post boost card" });
  }
});

export default router;

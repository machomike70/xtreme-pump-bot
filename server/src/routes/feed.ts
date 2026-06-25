import { Router, Request, Response } from "express";
import { db, tokens } from "../db";
import { pumpEvents } from "../events";
import { desc, lt, count } from "drizzle-orm";

const router = Router();

router.get("/tokens", async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit ?? "100"), 10), 200);
    const beforeId = req.query.before
      ? parseInt(String(req.query.before), 10)
      : undefined;

    let rows;
    if (beforeId) {
      rows = await db
        .select()
        .from(tokens)
        .where(lt(tokens.id, beforeId))
        .orderBy(desc(tokens.id))
        .limit(limit);
    } else {
      rows = await db
        .select()
        .from(tokens)
        .orderBy(desc(tokens.id))
        .limit(limit);
    }

    res.json({ tokens: rows });
  } catch (err) {
    console.error("[feed] GET /tokens error:", err);
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

  const keepAlive = setInterval(() => {
    res.write(": ping\n\n");
  }, 30000);

  const onToken = (token: unknown) => {
    res.write(`data: ${JSON.stringify(token)}\n\n`);
  };

  pumpEvents.onToken(onToken);

  req.on("close", () => {
    clearInterval(keepAlive);
    pumpEvents.removeListener("token", onToken);
  });
});

export default router;

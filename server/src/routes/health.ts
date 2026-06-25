import { Router, Request, Response } from "express";
import { db, tokens } from "../db";
import { count } from "drizzle-orm";
import { getSubscriberCount } from "../bot";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
  try {
    const [{ value: tokenCount }] = await db
      .select({ value: count() })
      .from(tokens);

    res.json({
      ok: true,
      tokens: Number(tokenCount),
      subscribers: getSubscriberCount(),
    });
  } catch (err) {
    console.error("[health] error:", err);
    res.status(500).json({ ok: false, error: "DB unavailable" });
  }
});

export default router;

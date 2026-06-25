import { Router, Request, Response } from "express";
import { handleWebhookUpdate } from "../bot";

const router = Router();

router.post("/webhook", async (req: Request, res: Response) => {
  const secret = process.env.PUMP_ALPHA_WEBHOOK_SECRET;
  if (secret) {
    const header = req.headers["x-telegram-bot-api-secret-token"];
    if (header !== secret) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
  }

  try {
    await handleWebhookUpdate(req.body);
    res.json({ ok: true });
  } catch (err) {
    console.error("[webhook] error:", err);
    res.status(500).json({ ok: false });
  }
});

export default router;

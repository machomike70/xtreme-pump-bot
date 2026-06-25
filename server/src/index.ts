import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../scripts/infra/.env") });
dotenv.config();

import express from "express";
import cors from "cors";
import feedRouter from "./routes/feed";
import healthRouter from "./routes/health";
import webhookRouter from "./routes/webhook";
import { startPoller } from "./poller";
import { startBot } from "./bot";

const PORT = parseInt(process.env.PORT ?? "8080", 10);

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.use("/health", healthRouter);
app.use("/feed", feedRouter);
app.use("/bot", webhookRouter);

async function main() {
  console.log("[server] Starting Xtreme Pump Bot server...");

  await startBot();
  startPoller();

  app.listen(PORT, () => {
    console.log(`[server] Listening on port ${PORT}`);
  });
}

main().catch((err) => {
  console.error("[server] Fatal startup error:", err);
  process.exit(1);
});

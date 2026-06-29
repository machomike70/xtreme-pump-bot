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

const PORT = parseInt(process.env.PORT ?? "8000", 10);

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.use("/health", healthRouter);
app.use("/feed", feedRouter);
app.use("/bot", webhookRouter);

// Serve the mini-app client
const CLIENT_DIST = path.join(__dirname, "../../client/dist");
app.use(express.static(CLIENT_DIST));
app.get(/^(?!\/feed|\/health|\/bot).*$/, (_req, res) => {
  res.sendFile(path.join(CLIENT_DIST, "index.html"));
});

async function main() {
  console.log("[server] Starting Xtreme Pump Bot server...");

  // Open the HTTP port immediately so the workflow runner sees it
  await new Promise<void>((resolve) => {
    app.listen(PORT, () => {
      console.log(`[server] Listening on port ${PORT}`);
      resolve();
    });
  });

  // Initialize bot and poller in the background
  startBot().catch((err) => console.error("[server] Bot init error:", err));
  startPoller();
}

main().catch((err) => {
  console.error("[server] Fatal startup error:", err);
  process.exit(1);
});

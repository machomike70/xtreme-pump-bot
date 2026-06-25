# Xtreme Pump Bot

Live pump.fun token feed with Telegram broadcasting.

- **Frontend**: React + Vite — real-time token card wall with SSE
- **Backend**: Node.js + Express + Drizzle ORM — pump.fun WebSocket poller + PostgreSQL persistence
- **Bot**: Xtreme_Pump_Bot posts every new launch to configured Telegram channel(s)

## Quick start (dev)

```bash
pnpm install
# Set DATABASE_URL in scripts/infra/.env or a local .env
pnpm db:push
pnpm dev
```

Open http://localhost:5173

## Deploy to Hetzner

See [SETUP.md](SETUP.md) for the full step-by-step.

## Bot commands

| Command | Description |
|---|---|
| `/start` | Subscribe this chat to token launches |
| `/stop` | Unsubscribe |
| `/filter all\|social\|mcap` | Filter which tokens are sent |
| `/status` | Show current filter + token count |
| `/help` | Show help |

## API endpoints

| Route | Description |
|---|---|
| `GET /health` | `{ ok, tokens, subscribers }` |
| `GET /feed/tokens?limit=100&before=<id>` | Paginated token history |
| `GET /feed/stream` | SSE stream of new tokens |
| `POST /bot/webhook` | Telegram webhook receiver |

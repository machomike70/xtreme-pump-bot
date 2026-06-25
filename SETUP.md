# SETUP — Xtreme Pump Bot on Hetzner

> Tested on Ubuntu 22.04 LTS. Takes ~15 minutes from a fresh server.

## Prerequisites

- Fresh Hetzner server at **91.98.121.41**
- DNS: `pump.xtremerippleprotocol.online` → `91.98.121.41` (A record, TTL 300)
- PostgreSQL running on the server (or remote Hetzner managed DB)
- GitHub repo `machomike70/xtreme-pump-bot` cloned (or fork of it)

---

## Step 1 — Install Node 24 + pnpm

```bash
# Node 24 via nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc
nvm install 24
nvm use 24
node -v   # v24.x.x

# pnpm
npm install -g pnpm
pnpm -v   # 9.x.x
```

---

## Step 2 — Create the app user + clone repo

```bash
useradd -m -s /bin/bash goml
su - goml
git clone https://github.com/machomike70/xtreme-pump-bot.git
cd xtreme-pump-bot
```

---

## Step 3 — Create the PostgreSQL database

```bash
sudo -u postgres psql
```

```sql
CREATE USER pumpbot WITH PASSWORD 'your-secure-password';
CREATE DATABASE pumpbot OWNER pumpbot;
\q
```

---

## Step 4 — Fill in the .env file

```bash
cp scripts/infra/.env.example scripts/infra/.env
nano scripts/infra/.env
```

Change these three values:

| Variable | What to put |
|---|---|
| `DATABASE_URL` | `postgres://pumpbot:your-secure-password@localhost:5432/pumpbot` |
| `PUMP_ALPHA_BOT_TOKEN` | Full BotFather token, e.g. `7818413149:AAH...` |
| `PUMP_ALPHA_CHAT_IDS` | Channel ID(s), e.g. `-1001234567890` |

Also replace the `PUMP_ALPHA_WEBHOOK_SECRET` placeholder with a real random string:

```bash
openssl rand -hex 32
```

---

## Step 5 — Install dependencies + build

```bash
pnpm install
pnpm db:push      # creates tokens + bot_subscriptions tables
pnpm build        # compiles server TypeScript + Vite client build
```

---

## Step 6 — Install + start the systemd service

```bash
# As root:
cp /home/goml/xtreme-pump-bot/systemd/xtreme-pump-bot.service \
   /etc/systemd/system/xtreme-pump-bot.service

systemctl daemon-reload
systemctl enable xtreme-pump-bot
systemctl start xtreme-pump-bot
systemctl status xtreme-pump-bot
```

Check logs:

```bash
journalctl -u xtreme-pump-bot -f
```

---

## Step 7 — Install nginx + certbot

```bash
apt update && apt install -y nginx certbot python3-certbot-nginx

# Copy nginx config
cp /home/goml/xtreme-pump-bot/scripts/infra/nginx.conf \
   /etc/nginx/sites-available/pump.xtremerippleprotocol.online

ln -s /etc/nginx/sites-available/pump.xtremerippleprotocol.online \
      /etc/nginx/sites-enabled/

nginx -t && systemctl reload nginx
```

---

## Step 8 — TLS certificate with certbot

```bash
certbot --nginx -d pump.xtremerippleprotocol.online
```

Follow the prompts. Certbot will auto-update the nginx config with SSL paths.

```bash
nginx -t && systemctl reload nginx
```

---

## Step 9 — Register the Telegram webhook (optional)

If you want Telegram to push commands to your server (rather than the bot polling):

```bash
curl "https://api.telegram.org/bot${PUMP_ALPHA_BOT_TOKEN}/setWebhook" \
  -d "url=https://pump.xtremerippleprotocol.online/bot/webhook" \
  -d "secret_token=${PUMP_ALPHA_WEBHOOK_SECRET}"
```

---

## Step 10 — Verify everything

```bash
# Health check
curl https://pump.xtremerippleprotocol.online/health
# Expected: {"ok":true,"tokens":0,"subscribers":0}

# Live feed (SSE — Ctrl+C to stop)
curl -N https://pump.xtremerippleprotocol.online/feed/stream

# Token history
curl https://pump.xtremerippleprotocol.online/feed/tokens?limit=10
```

Open **https://pump.xtremerippleprotocol.online** in your browser. You should see the live token feed appear within seconds of the first pump.fun launch.

---

## Ongoing deploys

```bash
cd /home/goml/xtreme-pump-bot
bash scripts/infra/deploy.sh
```

That's it — one command pulls, builds, migrates, and restarts.

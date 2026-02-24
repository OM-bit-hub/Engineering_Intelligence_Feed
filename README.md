# ⚡ Engineering Intelligence Feed

> *The internet is full of noise. This system finds the signal.*

A self-hosted pipeline that monitors the best engineering minds on the internet — automatically ingesting their RSS feeds, scoring content with LLMs, and surfacing the week's most important insights to your Slack channel. No algorithm. No ads. Just knowledge.

---

## 🏗️ How It Works

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ENGINEERING INTELLIGENCE FEED                    │
└─────────────────────────────────────────────────────────────────────┘

  👤 Builders (RSS Feeds)          Every Day @ 6 AM UTC
  ┌────────────────────┐           ┌──────────────────────┐
  │ Andrej Karpathy    │──────────▶│   Ingestion Engine   │
  │ Jay Alammar        │           │  (fetch + dedupe)    │
  │ Julia Evans        │           └──────────┬───────────┘
  │ Simon Willison     │                      │
  │ + 18 more...       │                      ▼
  └────────────────────┘           ┌──────────────────────┐
                                   │    LLM Scoring       │
                                   │  (depth, novelty,    │
                                   │   actionability)     │
                                   └──────────┬───────────┘
                                              │
                        Every Friday @ 9 AM   ▼
                                   ┌──────────────────────┐
                                   │   Digest Builder     │
                                   │  (top 10 of week)    │
                                   └──────────┬───────────┘
                                              │
                                              ▼
                                   ┌──────────────────────┐
                                   │  📨 Slack Delivery   │
                                   │  "Week 3 of February"│
                                   └──────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ (20 recommended)
- PostgreSQL (Supabase, Railway, or local Postgres)

### 1. Install & Configure

```bash
npm install
cp .env.example .env
# Edit .env — minimum required: DATABASE_URL + DIRECT_URL
```

### 2. Set Up Database

```bash
npx prisma migrate deploy
```

### 3. Boot the App

```bash
npm run dev
```

- **Frontend UI:** `http://localhost:5173`
- **Backend API:** `http://localhost:3001`

### 4. Add Your First Builder

Open the app → **Builders** → Add a builder and paste any RSS/Atom feed URL.

---

## ⚙️ Environment Variables

| Variable | Required | What It's For |
|----------|----------|---------------|
| `DATABASE_URL` | ✅ | Prisma connection string (pooled) |
| `DIRECT_URL` | ✅ | Direct Postgres URL (for migrations) |
| `LLM_PROVIDER` | Recommended | `openrouter` / `groq` / `openai` / `anthropic` |
| `LLM_API_KEY` | Recommended | Your LLM API key |
| `SLACK_BOT_TOKEN` | Optional | Slack Bot token for digest delivery |
| `SLACK_CHANNEL_ID` | Optional | Channel to post digests to |

> Without an LLM key, the system still works — items will be mock-scored with placeholder values.

---

## 📅 Automated Schedule (UTC)

| Job | When | What It Does |
|-----|------|-------------|
| Daily Ingestion | Every day at **6:00 AM** | Fetches all active RSS feeds |
| Weekly Digest | Every **Friday at 9:00 AM** | Compiles top items → posts to Slack |

Disable automated Slack posts anytime via **Settings → Manual Override**.

---

## 🔌 Key API Endpoints

```bash
# Trigger ingestion manually
POST /api/ingest/trigger

# Generate a digest now
POST /api/digest/generate

# Send latest digest to Slack
POST /api/digest/send-latest

# System health check
GET  /api/settings/health

# Aggregate stats
GET  /api/settings/stats
```

---

## 🛠️ Developer Guide

For full details on project structure, data flow, database models, and every API endpoint:

**→ See [Docs/DEVELOPER.md](./Docs/DEVELOPER.md)**

---

## 🔒 Security Notes

- Never commit `.env` to version control — use `.env.example` as the template only.
- If a secret is accidentally exposed, **rotate it immediately**.
- Rate limiting is applied on sensitive mutation endpoints.

---

## 📦 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL via Prisma ORM |
| Scheduling | `node-cron` |
| RSS Parsing | `rss-parser` |
| LLM Scoring | OpenRouter / Groq / OpenAI / Anthropic |
| Notifications | Slack Block Kit API |

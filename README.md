# Esperia Trello

A modern Kanban board with AI-powered workflows, built on React + Vite + Supabase.

**Live:** https://esperia-trello.pages.dev

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 19, Vite 8, Tailwind CSS v4, Radix UI, Framer Motion |
| Backend | Node.js + Express (`server.mjs`) — Slack bot integration |
| Database & Auth | Supabase (Postgres + Row Level Security) |
| AI | Anthropic Claude — chat copilot + mind map generation |
| Error Logging | Axiom |
| Deployment | Cloudflare Pages (frontend), Railway (backend) |

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `ANTHROPIC_API_KEY` | Anthropic API key (required if `AI_ENABLED=true`) |
| `AI_ENABLED` | Set to `true` to enable AI chat + mind map features |
| `VITE_AXIOM_TOKEN` | Axiom token for frontend error logging |
| `AXIOM_TOKEN` | Axiom token for server error logging |
| `SLACK_BOT_TOKEN` | Slack bot token (optional) |
| `SLACK_APP_TOKEN` | Slack app-level token for Socket Mode (optional) |
| `SLACK_SIGNING_SECRET` | Slack signing secret (optional) |

### 3. Run locally

```bash
# Frontend (http://localhost:5173)
npm run dev

# Backend AI/Slack server (http://localhost:3001)
npm run server
```

## Deployment

### Frontend → Cloudflare Pages

```bash
npm run build
npx wrangler pages deploy dist --project-name esperia-trello --branch main --commit-dirty=true
```

> First-time: run `npx wrangler login` before deploying.

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the Cloudflare Pages project environment variables.

### Backend → Railway

Push to the connected Railway service. The `PORT` env var is injected automatically.

## Features

- **Kanban boards** — drag-and-drop cards across lists
- **Multi-board** — create and switch between multiple boards
- **AI Copilot** — chat interface to manage cards hands-free (requires `AI_ENABLED=true`)
- **Mind Map** — AI-generated mind maps from a topic
- **Slack integration** — `/taskflow` slash command + @mention + DMs
- **Error boundary** — frontend errors reported to Axiom with a user-facing report form
- **Supabase Realtime** — live board updates across sessions

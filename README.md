# Esperia Trello

A modern Kanban board with AI-powered workflows, built on React + Vite + Supabase.

**Live:** https://esperia-trello.pages.dev

## Stack

| Layer           | Tech                                                       |
| --------------- | ---------------------------------------------------------- |
| Frontend        | React 19, Vite 8, Tailwind CSS v4, Radix UI, Framer Motion |
| Backend         | Node.js + Express (`server.mjs`) — Slack bot integration   |
| Database & Auth | Supabase (Postgres + Row Level Security)                   |
| AI              | Anthropic Claude — chat copilot + mind map generation      |
| Error Logging   | Axiom (frontend + server, with user-facing report form)    |
| Deployment      | Cloudflare Pages (frontend), Railway (backend)             |

## Features

- **Kanban boards** — drag-and-drop cards across lists
- **Multi-board** — create and switch between multiple boards, isolated per user via Supabase RLS
- **Auth** — restricted to `@esperiastudio.com` domain accounts only
- **AI Copilot** — chat interface to manage cards hands-free (requires `AI_ENABLED=true`)
- **Mind Map** — AI-generated mind maps from a topic
- **Slack integration** — `/taskflow` slash command + @mention + DMs
- **Error boundary** — frontend crashes reported to Axiom with a user-facing report form
- **Supabase Realtime** — live board updates across sessions

## API Architecture & State Management

This project uses a domain-driven API structure paired with TanStack React Query:

- **Domain Modules**: API logic is organized into domains under `src/api/` (e.g., `src/api/members/`, `src/api/cards/`).
- **File Separation**: Each domain splits logic into pure `api.ts` functions, `queries.ts` (React Query `useQuery` hooks), and `mutations.ts` (mutations and optimistic updates).
- **Unified Imports**: All API hooks and functions are exported from a single barrel `@/api`.
- **Deduplicated Fetching**: We strictly use React Query to avoid manual `useEffect` fetching, preventing race conditions and duplicated network calls across the application.

## Folder Structure & Component Architecture

To maintain a scalable and decoupled frontend, we follow these directory rules:

- **`src/pages/`**: Contains ONLY top-level route integration components (e.g., `BoardViewPage.tsx`). These pages act as orchestrators and do not contain reusable domain logic.
- **`src/features/`**: Contains strictly domain-driven folders (e.g., `auth/`, `boards/`, `cards/`). Each folder encapsulates its own UI components, local hooks, and utilities, completely agnostic of the URL routing layer.
- **`src/types/`**: Contains centralized, shared TypeScript interfaces (e.g., `board.ts`). We keep shared models here to prevent circular dependencies between the `api` and `features` layers.

## Getting Started

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

| Variable                 | Description                                         |
| ------------------------ | --------------------------------------------------- |
| `VITE_SUPABASE_URL`      | Supabase project URL                                |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key                            |
| `ANTHROPIC_API_KEY`      | Anthropic API key (required if `AI_ENABLED=true`)   |
| `AI_ENABLED`             | Set to `true` to enable AI chat + mind map features |
| `VITE_AXIOM_TOKEN`       | Axiom token for frontend error logging              |
| `AXIOM_TOKEN`            | Axiom token for server error logging                |
| `SLACK_BOT_TOKEN`        | Slack bot token (optional)                          |
| `SLACK_APP_TOKEN`        | Slack app-level token for Socket Mode (optional)    |
| `SLACK_SIGNING_SECRET`   | Slack signing secret (optional)                     |

### 3. Run locally

```bash
# Frontend (http://localhost:5173)
pnpm dev

# Backend AI/Slack server (http://localhost:3001)
pnpm server
```

## Deployment

### Frontend → Cloudflare Pages

```bash
pnpm build
pnpm dlx wrangler pages deploy dist --project-name esperia-trello --branch main --commit-dirty=true
```

> First-time: run `pnpm dlx wrangler login` before deploying.

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the Cloudflare Pages project environment variables.

### Backend → Railway

Push to the connected Railway service. The `PORT` env var is injected automatically.

## Recent Changelog

### May 14, 2026

- Refactored API layer to a strict **Domain-Driven Architecture** under `src/api/`.
- Integrated **TanStack React Query** across the application to handle caching, fix `useEffect` strict-mode duplicate fetches, and simplify real-time subscription state management.
- Added `.cursorrules` and updated `CLAUDE.md` to enforce the new API structure for AI assistants.

### May 12, 2026

- Rebranded from **TaskFlow → Esperia Trello** across all UI, AI prompts, and meta tags
- Deployed frontend to **Cloudflare Pages** (https://esperia-trello.pages.dev)
- Added `CLAUDE.md` and rewrote `README.md` with full project docs

### May 11, 2026

- Added **Axiom error logging** on both frontend and server with structured `logError` helper
- Built **error boundary report form** — users can submit a report when the app crashes; sent to Axiom
- Fixed auth to restrict signups to `@esperiastudio.com` domain only
- Isolated boards per user with **Supabase RLS** (row-level security keyed on `user.id`)
- Added `.env.example` covering all required and optional environment variables
- Added Cloudflare and Axiom MCP servers to `.mcp.json` for AI-assisted ops

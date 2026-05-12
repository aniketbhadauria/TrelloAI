# Esperia Trello — Claude Code Context

## Project
React + Vite SPA (Kanban board). Brand name: **Esperia Trello** (not "TaskFlow" — that's the old name).
Internal tool names (`taskflow_*`), localStorage key (`taskflow_mindmap`), and Slack command `/taskflow` were intentionally left unchanged.
Auth is restricted to `@esperiastudio.com` accounts only (enforced in `AuthContext` + Supabase RLS).

## Architecture
- **Frontend**: Vite + React, Tailwind v4, Supabase client-side auth/data, deployed to Cloudflare Pages
- **Backend**: `server.mjs` (Express) — Slack bot + AI routes. Runs separately (Railway or local). AI routes (`/api/chat`, `/api/mindmap/generate`) are currently commented out.
- **Database**: Supabase (Postgres + RLS) — boards isolated per `user.id`
- **Error logging**: Axiom — frontend via `src/lib/logger.js` (`logError`), server via `@axiomhq/logging`. ErrorBoundary in `src/components/ErrorBoundary.jsx` shows a user-facing report form and sends crash details to Axiom.

## Cloudflare Pages Deployment
- Project: `esperia-trello` → https://esperia-trello.pages.dev
- Build: `npm run build` → `dist/`
- Deploy: `npx wrangler pages deploy dist --project-name esperia-trello --branch main --commit-dirty=true`
- Wrangler auth is separate from Cloudflare MCP OAuth — run `npx wrangler login` if not authenticated
- Pages subdomain is fixed at project creation — renaming via PATCH API keeps old subdomain; must delete + recreate to get the correct `*.pages.dev`
- Required Pages env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

## MCP Servers (`.mcp.json`)
- **Supabase** — schema changes, migrations, SQL execution
- **Axiom** — query logs, debug errors in production
- **Cloudflare** — Pages deployments, project management via `mcp__cloudflare__execute`

## Key Commands
- `npm run dev` — frontend dev server
- `npm run server` — Express backend (port 3001)
- `npm run build` — Vite production build → `dist/`
- `npm run lint` — ESLint

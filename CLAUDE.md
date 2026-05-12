# Esperia Trello — Claude Code Context

## Project
React + Vite SPA (Kanban board). Brand name: **Esperia Trello** (not "TaskFlow" — that's the old name).
Internal tool names (`taskflow_*`), localStorage key (`taskflow_mindmap`), and Slack command `/taskflow` were intentionally left unchanged.

## Architecture
- **Frontend**: Vite + React, Tailwind v4, Supabase client-side auth/data, deployed to Cloudflare Pages
- **Backend**: `server.mjs` (Express) — Slack bot + AI routes. Runs separately (Railway or local). AI routes (`/api/chat`, `/api/mindmap/generate`) are currently commented out.
- **Database**: Supabase (Postgres + RLS)
- **Error logging**: Axiom (frontend + server)

## Cloudflare Pages Deployment
- Project: `esperia-trello` → https://esperia-trello.pages.dev
- Build: `npm run build` → `dist/`
- Deploy: `npx wrangler pages deploy dist --project-name esperia-trello --branch main --commit-dirty=true`
- Wrangler auth is separate from Cloudflare MCP OAuth — run `npx wrangler login` if not authenticated
- Pages subdomain is fixed at project creation — renaming via API keeps old subdomain; delete + recreate to fix
- Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Pages environment variables

## Key Commands
- `npm run dev` — frontend dev server
- `npm run server` — Express backend (port 3001)
- `npm run build` — Vite production build → `dist/`
- `npm run lint` — ESLint

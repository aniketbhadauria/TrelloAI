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

## API Architecture & State Management

- **Domain-Driven**: The `src/api/` folder uses a domain-driven module structure (e.g., `src/api/members/`, `src/api/cards/comments/`).
- **File Structure**: Each domain contains:
  - `api.ts`: Pure, framework-agnostic async functions (Supabase calls, error logging).
  - `queries.ts`: Read-side React Query hooks (`useQuery`).
  - `mutations.ts`: Write-side React Query hooks (`useMutation` or custom hooks for cache invalidation/patching).
  - `index.ts`: A barrel file exporting everything.
- **Imports**: All API functions and hooks must be imported from the top-level barrel `@/api` (which aggregates `src/api/index.ts`).
- **State/Caching**: We strictly use TanStack React Query for fetching and caching to avoid manual `useEffect` chains and duplicated network calls. Mutations should leverage optimistic updates via `queryClient.setQueryData` where possible, or `queryClient.invalidateQueries`.

## Folder Structure & Component Architecture

- **Pages (`src/pages/`)**: Contains ONLY top-level route integration components. No reusable logic.
- **Features (`src/features/`)**: Strictly domain-driven folders (`auth`, `boards`, `cards`) containing domain-specific UI components and local hooks.
- **Types (`src/types/`)**: Centralized shared TypeScript models to avoid circular dependencies between `api` and `features`.

## Cloudflare Pages Deployment

- Project: `esperia-trello` → https://esperia-trello.pages.dev
- Build: `pnpm build` → `dist/`
- Deploy: `pnpm dlx wrangler pages deploy dist --project-name esperia-trello --branch main --commit-dirty=true`
- Wrangler auth is separate from Cloudflare MCP OAuth — run `pnpm dlx wrangler login` if not authenticated
- Pages subdomain is fixed at project creation — renaming via PATCH API keeps old subdomain; must delete + recreate to get the correct `*.pages.dev`
- Required Pages env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

## MCP Servers (`.mcp.json`)

- **Supabase** — schema changes, migrations, SQL execution
- **Axiom** — query logs, debug errors in production
- **Cloudflare** — Pages deployments, project management via `mcp__cloudflare__execute`

## Key Commands

- `pnpm install` — install dependencies (strictly use pnpm, DO NOT use npm or yarn)
- `pnpm dev` — frontend dev server
- `pnpm server` — Express backend (port 3001)
- `pnpm build` — Vite production build → `dist/`
- `pnpm lint` — ESLint

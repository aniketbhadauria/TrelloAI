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
- **Utils (`src/utils/`)**: All pure, framework-agnostic helper functions, constants, and zod schemas that are shared across features (e.g. `sprint.ts`, `cardMeta.ts`, `date.ts`). Never put utility logic inside a feature folder — if it could be useful in more than one place, it belongs in `src/utils/`.
- **Contexts (`src/context/`)**: All React contexts live here. Each file exports the context object + a `useXxxContext()` guard hook that throws if used outside its provider. Feature sub-components consume context instead of receiving deep prop chains.
- **Feature hooks**: Feature-scoped hooks live as flat files directly in their feature folder (e.g., `src/features/board-view/useSelectedCardRoute.ts`) — no nested `hooks/` subdirectory.
- **Modal decomposition**: Large modals are split into focused sub-components that read shared state via `useXxxContext()`. Sub-components live in the same `src/features/<domain>/` folder as the modal.

## File Size & Decomposition

- **Hard limit: 250 lines per file.** If a file exceeds this, it must be split before adding new code.
- Extract sub-components as soon as a section of JSX has a clear, self-contained purpose (e.g., a form, a list item, a panel header).
- Extract custom hooks (`useXxx`) as soon as a component needs more than 2–3 related state values or side effects.
- Shared display-only pieces (labels, badges, icon rows) belong in small focused components, not inlined repeatedly.
- When splitting a modal, each sub-component reads shared state via context — never pass 5+ props down just to avoid a context.

## State Management Principles

- **Forms — always use `react-hook-form` + `zod`**: Every form in the app uses `useForm` with `zodResolver`. Never manage form field state with multiple `useState` calls. Validation logic lives in the zod schema (including cross-field checks via `superRefine`).
- **Prefer derived values over state**: If a value can be computed from props, context, or other state, compute it inline or in a `useMemo` — don't store it in `useState`.
- **Minimize `useEffect`**: Only use `useEffect` for genuine side effects (subscriptions, imperative DOM, one-time initialization). Never use it to sync state-to-state — use event handlers or derived values instead. If you find yourself writing `useEffect` + `setState` to react to a prop/state change, stop and find the derived-value or event-handler approach.
- **Server state via React Query**: All data fetching and mutation lives in `@/api`. Never fetch data inside `useEffect` — use `useQuery` / `useMutation` hooks.

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

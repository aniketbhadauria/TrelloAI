# TypeScript Refactor & Restructure — Design Spec

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate Esperia Trello from JavaScript to strict TypeScript, reorganise into a feature-folder structure, consolidate theming, and improve Axiom error logging — without changing any visible behaviour.

**Architecture:** Feature-folder layout groups all files related to a domain (components, types, hooks) together. Shared primitives (UI, context, hooks, lib) stay at the top level. A dedicated `routes/` folder owns all route definitions so `App.tsx` is a pure provider tree. CSS tokens live in a single `styles/theme.css` file.

**Tech stack:** React 19, Vite, TypeScript 5 (strict), Tailwind CSS v4 (CSS-first), Supabase, Axiom, Cloudflare Pages.

---

## 1. Dead Code Removal

Delete these files before any TypeScript work — they are commented-out and unreachable:

- `src/pages/Analytics.jsx`
- `src/pages/MindMapView.jsx`
- `src/pages/Collaborators.jsx`
- `src/components/AICopilot.jsx`
- `src/lib/composio.js`
- `jsconfig.json` (superseded by tsconfig)

Migrate (not delete):
- `src/data/initialData.js` → `src/data/initialData.ts` — exports `GRADIENTS` still used by `CreateBoardModal`

Remove their imports and commented-out `<Route>` blocks from `App.jsx`.

---

## 2. TypeScript Configuration

**`tsconfig.json`** (replaces `jsconfig.json`):
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] },
    "skipLibCheck": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

`vite.config.js` → `vite.config.ts`. All `.jsx` → `.tsx`, `.js` → `.ts`.

Add packages:
```
npm install -D typescript @types/react @types/react-dom @types/node
```

---

## 3. Shared Types

**`src/types/board.ts`** — domain model:
```ts
export type BoardRole = 'owner' | 'admin' | 'member' | 'observer';
// 'owner' is set by the frontend when the user owns the board (not stored in board_members)

export interface Label {
  id: string;
  text: string;
  color: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface Card {
  id: string;
  title: string;
  description: string;
  labels: Label[];
  checklist: ChecklistItem[];
  dueDate: string | null;
  archived: boolean;
  archivedAt: string | null;
  createdAt: string;
}

export interface List {
  id: string;
  title: string;
  cards: Card[];
}

export interface Board {
  id: string;
  title: string;
  gradient: string;
  backgroundImage: string | null;
  starred: boolean;
  archived: boolean;
  archivedAt: string | null;
  createdAt: string;
  lists: List[];
  // context-only fields (not persisted to DB)
  ownerId?: string;
  memberRole?: BoardRole;
  ownerName?: string | null;
}
```

**`src/types/auth.ts`**:
```ts
export interface AppUser {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
}
```

---

## 4. Folder Structure

```
src/
  features/
    auth/
      LoginPage.tsx
      SignupPage.tsx
    boards/
      HomePage.tsx             ← was Home.jsx
      BoardCard.tsx
      CreateBoardModal.tsx
    board-view/
      BoardViewPage.tsx        ← orchestrator only (~150 lines after split)
      BoardHeader.tsx          ← title, star, background btn, members btn, ⋯ menu
      BoardSettingsMenu.tsx    ← archive, background options dropdown
      KanbanList.tsx
      KanbanCard.tsx
      AddCardForm.tsx
      AddListForm.tsx
    cards/
      CardDetailModal.tsx      ← modal shell + state only (~150 lines)
      CardDescription.tsx
      CardLabels.tsx
      CardChecklist.tsx
      CardDueDate.tsx
      CardAttachments.tsx
    members/
      BoardMembersPanel.tsx
      InviteMemberModal.tsx
  routes/
    index.tsx                  ← all <Route> definitions + ProtectedRoute
  components/
    ui/                        ← shadcn components converted to .tsx
    ErrorBoundary.tsx
  context/
    BoardContext.tsx
    AuthContext.tsx
    NotificationContext.tsx
  hooks/
    useDebouncedCallback.ts
    useLocalStorage.ts
    useTheme.ts
  lib/
    supabase.ts
    logger.ts
    utils.ts
  types/
    board.ts
    auth.ts
  styles/
    theme.css                  ← all CSS custom properties + @theme inline
    globals.css                ← gradient-orbs, modal-overlay, animations
  index.css                    ← @import "tailwindcss" + @import styles
  App.tsx                      ← providers only, no logic
  main.tsx
```

`App.tsx` final shape — pure provider tree:
```tsx
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <BoardProvider>
          <NotificationProvider>
            <AppRoutes />
          </NotificationProvider>
        </BoardProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
```

---

## 5. Routes

**`src/routes/index.tsx`** owns all routing logic:

```tsx
function ProtectedRoute({ children }: { children: React.ReactNode }) { ... }

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/boards" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
      <Route path="/boards/:boardId" element={<ProtectedRoute><BoardViewPage /></ProtectedRoute>} />
      <Route path="/archive" element={<ProtectedRoute><ArchivePage /></ProtectedRoute>} />
    </Routes>
  );
}
```

Adding a new page = add one `<Route>` here. `App.tsx` never changes for routing.

---

## 6. Theming

**`App.css` is deleted.** Theme tokens move to:

**`src/styles/theme.css`** — the user-provided CSS block verbatim:
- `:root { }` — light mode oklch tokens + typography + shadows + spacing
- `.dark { }` — dark mode overrides
- `@theme inline { }` — maps CSS vars to Tailwind utility classes
- `@layer base { }` — border and body defaults

**`src/styles/globals.css`** — app-specific non-token styles:
- `.gradient-orb` animations
- `.modal-overlay` / `.modal-content`
- `.page-enter` transition
- Custom scrollbar styles
- Any board-specific gradient classes

**`src/index.css`**:
```css
@import "tailwindcss";
@import "./styles/theme.css";
@import "./styles/globals.css";
```

**`src/hooks/useTheme.ts`**:
```ts
export function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    (localStorage.getItem('theme') as 'light' | 'dark') ?? 'light'
  );

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggle = useCallback(() => setTheme(t => t === 'dark' ? 'light' : 'dark'), []);

  return { theme, toggle };
}
```

---

## 7. Axiom Logging

**`src/lib/logger.ts`**:

```ts
import Axiom from '@axiomhq/axiom-node';

const axiom = import.meta.env.VITE_AXIOM_TOKEN
  ? new Axiom({ token: import.meta.env.VITE_AXIOM_TOKEN })
  : null;

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  message?: string;
  stack?: string;
  userId?: string;
  boardId?: string;
  cardId?: string;
  [key: string]: unknown;
}

function log(level: LogLevel, event: string, context: LogContext = {}): void {
  const payload = {
    level,
    event,
    timestamp: new Date().toISOString(),
    env: import.meta.env.MODE,
    ...context,
  };

  // Dev: console only, no Axiom traffic
  if (import.meta.env.DEV) {
    const fn = level === 'error' ? console.error
      : level === 'warn' ? console.warn
      : console.log;
    fn(`[${level.toUpperCase()}] ${event}`, context);
    return;
  }

  // Prod: fire-and-forget, never throw
  axiom?.ingest('esperia-trello-logs', [payload]).catch(() => {});
}

export const logDebug = (event: string, ctx?: LogContext) => log('debug', event, ctx);
export const logInfo  = (event: string, ctx?: LogContext) => log('info',  event, ctx);
export const logWarn  = (event: string, ctx?: LogContext) => log('warn',  event, ctx);
export const logError = (event: string, ctx?: LogContext) => log('error', event, ctx);
```

**`ErrorBoundary.tsx`** updated to pass typed `LogContext`:
```ts
logError('react.error_boundary', {
  message: error.message,
  stack: error.stack,
  componentStack: info.componentStack ?? undefined,
});
```

All existing `logError()` call sites audited to remove loose string spreading and use named `LogContext` fields.

---

## 8. File Splitting

### `BoardViewPage.tsx` (target: ~150 lines)
Extract into:
- **`BoardHeader.tsx`** — board title (editable), star button, background picker button, Members button, ⋯ dropdown trigger
- **`BoardSettingsMenu.tsx`** — the ⋯ dropdown: archive board, change background, copy link

### `CardDetailModal.tsx` (target: ~150 lines)
Extract into:
- **`CardDescription.tsx`** — textarea editor for card description
- **`CardLabels.tsx`** — label colour picker and tag display
- **`CardChecklist.tsx`** — checklist items with add/toggle/delete
- **`CardDueDate.tsx`** — date picker and overdue indicator
- **`CardAttachments.tsx`** — attachment list and upload trigger

Each sub-component receives only the props it needs. The modal orchestrator holds shared state and passes down slices.

---

## 9. Migration Order

Migrate bottom-up (leaves before consumers):

1. TypeScript config + install types
2. Delete dead code
3. `src/types/` — no dependencies
4. `src/lib/` — logger, supabase, utils
5. `src/hooks/` — useDebouncedCallback, useLocalStorage, useTheme
6. `src/styles/` — theme.css, globals.css, index.css
7. `src/components/ui/` — shadcn components (bulk rename + fix prop types)
8. `src/components/` — ErrorBoundary, Navbar
9. `src/context/` — AuthContext, NotificationContext, BoardContext
10. `src/features/auth/` — LoginPage, SignupPage
11. `src/features/boards/` — HomePage, BoardCard, CreateBoardModal
12. `src/features/members/` — BoardMembersPanel, InviteMemberModal
13. `src/features/cards/` — split CardDetailModal + sub-components
14. `src/features/board-view/` — split BoardViewPage + sub-components
15. `src/routes/index.tsx` — route definitions
16. `src/App.tsx` + `src/main.tsx` — thin shell
17. `vite.config.ts` — rename + TypeScript config

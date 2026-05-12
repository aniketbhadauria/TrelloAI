# TypeScript Refactor & Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate Esperia Trello from JavaScript to strict TypeScript, reorganise into a feature-folder structure, consolidate theming, and improve Axiom error logging — without changing any visible behaviour.

**Architecture:** Bottom-up migration: types and utilities first, then contexts, then features. Each task leaves the app in a working state. Feature folders group all related files together. Layout routes handle auth and shared UI. A single `styles/theme.css` owns all CSS tokens.

**Tech Stack:** React 19, Vite, TypeScript 5 (strict), Tailwind CSS v4, Supabase, Axiom, Cloudflare Pages.

---

## Task 1: TypeScript Setup

**Files:**
- Create: `tsconfig.json`
- Modify: `package.json`
- Delete: `jsconfig.json`

- [ ] **Step 1: Install TypeScript and type packages**

```bash
npm install -D typescript @types/react @types/react-dom @types/node
```

Expected: packages added to `devDependencies` in `package.json`.

- [ ] **Step 2: Create `tsconfig.json`**

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

- [ ] **Step 3: Delete `jsconfig.json`**

```bash
rm jsconfig.json
```

- [ ] **Step 4: Verify TypeScript is found**

```bash
npx tsc --version
```

Expected: `Version 5.x.x`

- [ ] **Step 5: Commit**

```bash
git add tsconfig.json package.json package-lock.json
git commit -m "chore: add TypeScript 5 with strict mode"
```

---

## Task 2: Dead Code Removal

**Files:**
- Delete: `src/pages/Analytics.jsx`, `src/pages/MindMapView.jsx`, `src/pages/Collaborators.jsx`
- Delete: `src/components/AICopilot.jsx`, `src/lib/composio.js`
- Modify: `src/App.jsx` — remove dead imports and commented routes

- [ ] **Step 1: Delete dead files**

```bash
rm src/pages/Analytics.jsx src/pages/MindMapView.jsx src/pages/Collaborators.jsx
rm src/components/AICopilot.jsx src/lib/composio.js
```

- [ ] **Step 2: Clean `src/App.jsx` — remove dead imports and commented blocks**

Remove these import lines from `src/App.jsx`:
- `import MindMapView from './pages/MindMapView';`
- `import Analytics from './pages/Analytics';`
- `import Collaborators from './pages/Collaborators';`
- `import AICopilot from './components/AICopilot';`

Remove the commented-out `<Route>` blocks for mindmap, analytics, collaborators and the commented `<AICopilot />` line. The `AppContent` function already has those routes commented — delete the comment blocks entirely.

- [ ] **Step 3: Verify app still builds**

```bash
npm run build
```

Expected: build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove dead code (Analytics, MindMap, Collaborators, AICopilot)"
```

---

## Task 3: Shared Types

**Files:**
- Create: `src/types/board.ts`
- Create: `src/types/auth.ts`

- [ ] **Step 1: Create `src/types/board.ts`**

```ts
export type BoardRole = 'owner' | 'admin' | 'member' | 'observer';

export interface Label {
  id: string;
  text: string;
  color: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface CardMember {
  id: string;
  name: string;
}

export interface Comment {
  id: string;
  text: string;
  author: string;
  createdAt: string;
}

export interface Attachment {
  id: string;
  name: string;
  url?: string;
  fileData?: string;
  fileName?: string;
  addedAt: string;
}

export interface Card {
  id: string;
  title: string;
  description: string;
  labels: Label[];
  checklist: ChecklistItem[];
  members: CardMember[];
  comments: Comment[];
  attachments: Attachment[];
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
  ownerId?: string;
  memberRole?: BoardRole;
  ownerName?: string | null;
}

export interface ArchivedCard extends Card {
  boardId: string;
  boardTitle: string;
  listId: string;
  listTitle: string;
}
```

- [ ] **Step 2: Create `src/types/auth.ts`**

```ts
export interface AppUser {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/types/
git commit -m "feat: add shared TypeScript types for board and auth"
```

---

## Task 4: Convert `src/lib/` and create `src/utils/`

**Files:**
- Rename+convert: `src/lib/supabase.js` → `src/lib/supabase.ts`
- Rename+convert: `src/lib/utils.js` → `src/lib/utils.ts`
- Rewrite: `src/lib/logger.js` → `src/lib/logger.ts`
- Create: `src/utils/date.ts`
- Create: `src/utils/gradients.ts`
- Create: `src/utils/board.ts`
- Convert: `src/data/initialData.js` → `src/data/initialData.ts`

- [ ] **Step 1: Convert `src/lib/supabase.ts`**

```bash
mv src/lib/supabase.js src/lib/supabase.ts
```

File content (same logic, typed):
```ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase env. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env',
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    flowType: 'pkce',
    detectSessionInUrl: true,
    persistSession: true,
  },
});
```

- [ ] **Step 2: Convert `src/lib/utils.ts`**

```bash
mv src/lib/utils.js src/lib/utils.ts
```

Content is identical — clsx + tailwind-merge already typed via `@types`.

- [ ] **Step 3: Rewrite `src/lib/logger.ts`**

```bash
mv src/lib/logger.js src/lib/logger.ts
```

Full content:
```ts
import Axiom from '@axiomhq/axiom-node';

const axiom = import.meta.env.VITE_AXIOM_TOKEN
  ? new Axiom({ token: import.meta.env.VITE_AXIOM_TOKEN as string })
  : null;

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  message?: string;
  stack?: string;
  componentStack?: string;
  userId?: string;
  boardId?: string;
  cardId?: string;
  description?: string;
  url?: string;
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

  if (import.meta.env.DEV) {
    const fn = level === 'error' ? console.error
      : level === 'warn' ? console.warn
      : console.log;
    fn(`[${level.toUpperCase()}] ${event}`, context);
    return;
  }

  axiom?.ingest('esperia-trello-logs', [payload]).catch(() => {});
}

export const logDebug = (event: string, ctx?: LogContext): void => log('debug', event, ctx);
export const logInfo  = (event: string, ctx?: LogContext): void => log('info',  event, ctx);
export const logWarn  = (event: string, ctx?: LogContext): void => log('warn',  event, ctx);
export const logError = (event: string, ctx?: LogContext): void => log('error', event, ctx);
```

- [ ] **Step 4: Create `src/utils/date.ts`**

```ts
export function timeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}
```

- [ ] **Step 5: Create `src/utils/gradients.ts`**

```ts
export const GRADIENTS = [
  'gradient-1', 'gradient-2', 'gradient-3', 'gradient-4',
  'gradient-5', 'gradient-6', 'gradient-7', 'gradient-8',
] as const;

export type GradientKey = typeof GRADIENTS[number];

export const GRADIENT_STYLES: Record<GradientKey, string> = {
  'gradient-1': 'linear-gradient(135deg, #f97316 0%, #ec4899 50%, #a855f7 100%)',
  'gradient-2': 'linear-gradient(135deg, #f472b6 0%, #c084fc 100%)',
  'gradient-3': 'linear-gradient(135deg, #fb923c 0%, #f472b6 100%)',
  'gradient-4': 'linear-gradient(135deg, #e879f9 0%, #818cf8 100%)',
  'gradient-5': 'linear-gradient(135deg, #f43f5e 0%, #fb923c 100%)',
  'gradient-6': 'linear-gradient(135deg, #c084fc 0%, #f9a8d4 100%)',
  'gradient-7': 'linear-gradient(135deg, #fbbf24 0%, #f472b6 100%)',
  'gradient-8': 'linear-gradient(135deg, #f9a8d4 0%, #c4b5fd 100%)',
};
```

- [ ] **Step 6: Create `src/utils/board.ts`**

```ts
export function resolveBoardImageUrl(imageUrl: string | null | undefined): string | null {
  if (!imageUrl) return null;
  if (imageUrl.startsWith('file:///')) {
    if (imageUrl.toLowerCase().includes('emerson')) return '/emerson.jpg';
    if (imageUrl.toLowerCase().includes('chatgpt') || imageUrl.toLowerCase().includes('esperia')) return '/esperia.png';
    return null;
  }
  return imageUrl;
}

export function getMemberColor(name: string, palette: string[]): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}

export function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}
```

- [ ] **Step 7: Convert `src/data/initialData.ts`**

```bash
mv src/data/initialData.js src/data/initialData.ts
```

Update imports at top of file — `GRADIENTS` is now imported from `src/utils/gradients.ts`. Keep `LABEL_COLORS` and `createInitialData` in this file. Add types:

```ts
import { v4 as uuidv4 } from 'uuid';

export interface LabelColor {
  name: string;
  value: string;
}

export const LABEL_COLORS: LabelColor[] = [
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Cyan', value: '#06b6d4' },
  { name: 'Green', value: '#10b981' },
  { name: 'Yellow', value: '#f59e0b' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Pink', value: '#ec4899' },
];

// createInitialData remains as-is — used only for seeding, not in prod
export const createInitialData = () => ({ boards: [] });
```

- [ ] **Step 8: Commit**

```bash
git add src/lib/ src/utils/ src/data/
git commit -m "feat: convert lib/ to TypeScript, add utils/ folder with typed helpers"
```

---

## Task 5: Convert `src/hooks/`

**Files:**
- Rename: `src/hooks/useDebouncedCallback.js` → `.ts`
- Rename: `src/hooks/useLocalStorage.js` → `.ts`
- Create: `src/hooks/useTheme.ts`

- [ ] **Step 1: Convert `useDebouncedCallback.ts`**

```bash
mv src/hooks/useDebouncedCallback.js src/hooks/useDebouncedCallback.ts
```

Full typed content:
```ts
import { useRef, useCallback, useEffect } from 'react';

interface DebouncedCallback {
  run: (...args: unknown[]) => void;
  cancel: () => void;
  flush: () => void;
}

export function useDebouncedCallback(
  callback: (...args: unknown[]) => unknown,
  delay: number,
): DebouncedCallback {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = useRef(callback);
  const argsRef = useRef<unknown[] | null>(null);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const run = useCallback((...args: unknown[]) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    argsRef.current = args;
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      const latestArgs = argsRef.current ?? [];
      argsRef.current = null;
      callbackRef.current(...latestArgs);
    }, delay);
  }, [delay]);

  const cancel = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
    argsRef.current = null;
  }, []);

  const flush = useCallback(() => {
    if (!timeoutRef.current) return;
    clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
    const latestArgs = argsRef.current ?? [];
    argsRef.current = null;
    callbackRef.current(...latestArgs);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return { run, cancel, flush };
}
```

- [ ] **Step 2: Convert `useLocalStorage.ts`**

```bash
mv src/hooks/useLocalStorage.js src/hooks/useLocalStorage.ts
```

Full typed content:
```ts
import { useState, useCallback } from 'react';

export function useLocalStorage<T>(
  key: string,
  initialValue: T | (() => T),
): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item
        ? (JSON.parse(item) as T)
        : (typeof initialValue === 'function' ? (initialValue as () => T)() : initialValue);
    } catch {
      return typeof initialValue === 'function' ? (initialValue as () => T)() : initialValue;
    }
  });

  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch {
      // ignore write errors
    }
  }, [key, storedValue]);

  return [storedValue, setValue];
}
```

- [ ] **Step 3: Create `src/hooks/useTheme.ts`**

```ts
import { useState, useEffect, useCallback } from 'react';

type Theme = 'light' | 'dark';

export function useTheme(): { theme: Theme; toggle: () => void } {
  const [theme, setTheme] = useState<Theme>(() =>
    (localStorage.getItem('theme') as Theme | null) ?? 'light',
  );

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggle = useCallback(() => setTheme(t => t === 'dark' ? 'light' : 'dark'), []);

  return { theme, toggle };
}
```

- [ ] **Step 4: Commit**

```bash
git add src/hooks/
git commit -m "feat: convert hooks to TypeScript, add useTheme"
```

---

## Task 6: Consolidate Styles

**Files:**
- Create: `src/styles/theme.css`
- Create: `src/styles/globals.css`
- Rewrite: `src/index.css`
- Delete: `src/App.css`

- [ ] **Step 1: Create `src/styles/` directory**

```bash
mkdir -p src/styles
```

- [ ] **Step 2: Create `src/styles/theme.css`**

Paste the full user-provided CSS block verbatim (`:root`, `.dark`, `@theme inline`, `@layer base`). This is the canonical design token file. Full content:

```css
@custom-variant dark (&:is(.dark *));

:root {
  --background: oklch(1.0000 0 0);
  --foreground: oklch(0.2917 0.0676 260.3713);
  --card: oklch(1.0000 0 0);
  --card-foreground: oklch(0.2917 0.0676 260.3713);
  --popover: oklch(1.0000 0 0);
  --popover-foreground: oklch(0.2917 0.0676 260.3713);
  --primary: oklch(0.6227 0.2322 15.6075);
  --primary-foreground: oklch(1.0000 0 0);
  --secondary: oklch(0.9454 0.0046 258.3250);
  --secondary-foreground: oklch(0.2917 0.0676 260.3713);
  --muted: oklch(0.9700 0.0029 264.5420);
  --muted-foreground: oklch(0.5287 0.0416 261.1638);
  --accent: oklch(0.6227 0.2322 15.6075);
  --accent-foreground: oklch(0.6227 0.2322 15.6075);
  --destructive: oklch(0.6368 0.2078 25.3313);
  --destructive-foreground: oklch(1.0000 0 0);
  --border: oklch(0.9096 0.0071 268.5436);
  --input: oklch(0.9096 0.0071 268.5436);
  --ring: oklch(0.6227 0.2322 15.6075);
  --chart-1: oklch(0.6227 0.2322 15.6075);
  --chart-2: oklch(0.5566 0.1400 244.9518);
  --chart-3: oklch(0.8316 0.1710 156.1266);
  --chart-4: oklch(0.8034 0.1704 73.7877);
  --chart-5: oklch(0.5197 0.1626 286.5038);
  --sidebar: oklch(0.9700 0.0029 264.5420);
  --sidebar-foreground: oklch(0.2917 0.0676 260.3713);
  --sidebar-primary: oklch(0.6227 0.2322 15.6075);
  --sidebar-primary-foreground: oklch(1.0000 0 0);
  --sidebar-accent: oklch(0.9454 0.0046 258.3250);
  --sidebar-accent-foreground: oklch(0.6227 0.2322 15.6075);
  --sidebar-border: oklch(0.9096 0.0071 268.5436);
  --sidebar-ring: oklch(0.6227 0.2322 15.6075);
  --font-sans: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  --font-serif: Georgia, serif;
  --font-mono: SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  --radius: 0.3rem;
  --shadow-2xs: 0px 1px 4px 0px hsl(0, 0%, 0% / 0.05);
  --shadow-xs: 0px 1px 4px 0px hsl(0, 0%, 0% / 0.05);
  --shadow-sm: 0px 1px 4px 0px hsl(0, 0%, 0% / 0.10), 0px 1px 2px -1px hsl(0, 0%, 0% / 0.10);
  --shadow: 0px 1px 4px 0px hsl(0, 0%, 0% / 0.10), 0px 1px 2px -1px hsl(0, 0%, 0% / 0.10);
  --shadow-md: 0px 1px 4px 0px hsl(0, 0%, 0% / 0.10), 0px 2px 4px -1px hsl(0, 0%, 0% / 0.10);
  --shadow-lg: 0px 1px 4px 0px hsl(0, 0%, 0% / 0.10), 0px 4px 6px -1px hsl(0, 0%, 0% / 0.10);
  --shadow-xl: 0px 1px 4px 0px hsl(0, 0%, 0% / 0.10), 0px 8px 10px -1px hsl(0, 0%, 0% / 0.10);
  --shadow-2xl: 0px 1px 4px 0px hsl(0, 0%, 0% / 0.25);
  --tracking-normal: -0.01em;
  --spacing: 0.25rem;
}

.dark {
  --background: oklch(0.2454 0.0096 248.2205);
  --foreground: oklch(0.8088 0.0226 250.2570);
  --card: oklch(0.2694 0.0104 242.0838);
  --card-foreground: oklch(0.8088 0.0226 250.2570);
  --popover: oklch(0.2974 0.0124 243.2614);
  --popover-foreground: oklch(0.8088 0.0226 250.2570);
  --primary: oklch(0.6227 0.2322 15.6075);
  --primary-foreground: oklch(1.0000 0 0);
  --secondary: oklch(0.3173 0.0158 248.3250);
  --secondary-foreground: oklch(0.8088 0.0226 250.2570);
  --muted: oklch(0.3173 0.0158 248.3250);
  --muted-foreground: oklch(0.6829 0.0292 249.9699);
  --accent: oklch(0.6227 0.2322 15.6075);
  --accent-foreground: oklch(1.0000 0 0);
  --destructive: oklch(0.6782 0.2099 25.5486);
  --destructive-foreground: oklch(1.0000 0 0);
  --border: oklch(0.3706 0.0196 248.3540);
  --input: oklch(0.3706 0.0196 248.3540);
  --ring: oklch(0.6227 0.2322 15.6075);
  --chart-1: oklch(0.6227 0.2322 15.6075);
  --chart-2: oklch(0.6957 0.1612 257.1847);
  --chart-3: oklch(0.7652 0.1403 161.9860);
  --chart-4: oklch(0.8600 0.1524 91.8768);
  --chart-5: oklch(0.7035 0.1382 290.0244);
  --sidebar: oklch(0.2454 0.0096 248.2205);
  --sidebar-foreground: oklch(0.8088 0.0226 250.2570);
  --sidebar-primary: oklch(0.6227 0.2322 15.6075);
  --sidebar-primary-foreground: oklch(1.0000 0 0);
  --sidebar-accent: oklch(0.3173 0.0158 248.3250);
  --sidebar-accent-foreground: oklch(1.0000 0 0);
  --sidebar-border: oklch(0.3706 0.0196 248.3540);
  --sidebar-ring: oklch(0.6227 0.2322 15.6075);
  --font-sans: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  --font-serif: Georgia, serif;
  --font-mono: SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  --radius: 0.3rem;
  --shadow-2xs: 0px 4px 8px 0px hsl(0, 0%, 0% / 0.15);
  --shadow-xs: 0px 4px 8px 0px hsl(0, 0%, 0% / 0.15);
  --shadow-sm: 0px 4px 8px 0px hsl(0, 0%, 0% / 0.30), 0px 1px 2px -1px hsl(0, 0%, 0% / 0.30);
  --shadow: 0px 4px 8px 0px hsl(0, 0%, 0% / 0.30), 0px 1px 2px -1px hsl(0, 0%, 0% / 0.30);
  --shadow-md: 0px 4px 8px 0px hsl(0, 0%, 0% / 0.30), 0px 2px 4px -1px hsl(0, 0%, 0% / 0.30);
  --shadow-lg: 0px 4px 8px 0px hsl(0, 0%, 0% / 0.30), 0px 4px 6px -1px hsl(0, 0%, 0% / 0.30);
  --shadow-xl: 0px 4px 8px 0px hsl(0, 0%, 0% / 0.30), 0px 8px 10px -1px hsl(0, 0%, 0% / 0.30);
  --shadow-2xl: 0px 4px 8px 0px hsl(0, 0%, 0% / 0.75);
  --tracking-normal: -0.01em;
  --spacing: 0.25rem;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);
  --font-sans: var(--font-sans);
  --font-mono: var(--font-mono);
  --font-serif: var(--font-serif);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
  --shadow-2xs: var(--shadow-2xs);
  --shadow-xs: var(--shadow-xs);
  --shadow-sm: var(--shadow-sm);
  --shadow: var(--shadow);
  --shadow-md: var(--shadow-md);
  --shadow-lg: var(--shadow-lg);
  --shadow-xl: var(--shadow-xl);
  --shadow-2xl: var(--shadow-2xl);
  --tracking-tighter: calc(var(--tracking-normal) - 0.05em);
  --tracking-tight: calc(var(--tracking-normal) - 0.025em);
  --tracking-normal: var(--tracking-normal);
  --tracking-wide: calc(var(--tracking-normal) + 0.025em);
  --tracking-wider: calc(var(--tracking-normal) + 0.05em);
  --tracking-widest: calc(var(--tracking-normal) + 0.1em);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
    letter-spacing: var(--tracking-normal);
  }
}
```

- [ ] **Step 3: Create `src/styles/globals.css`**

Move all app-specific styles from `App.css` into this file:

```css
/* Scrollbar */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: oklch(0.82 0.03 350); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: oklch(0.7 0.05 350); }

/* Gradient orbs */
.gradient-orb {
  position: fixed;
  border-radius: 50%;
  pointer-events: none;
  z-index: 0;
}
.gradient-orb-1 {
  width: 650px; height: 650px; top: -120px; left: -80px;
  background: radial-gradient(circle at 40% 40%, #f97316 0%, #ec4899 45%, #a855f7 80%, transparent 100%);
  filter: blur(70px); opacity: 0.28;
}
.gradient-orb-2 {
  width: 400px; height: 400px; bottom: -80px; right: -60px;
  background: radial-gradient(circle at 50% 50%, #c084fc 0%, #f9a8d4 50%, transparent 100%);
  filter: blur(60px); opacity: 0.22;
}
.gradient-orb-3 {
  width: 300px; height: 300px; top: 40%; right: 20%;
  background: radial-gradient(circle, #fb923c 0%, #f472b6 60%, transparent 100%);
  filter: blur(80px); opacity: 0.15;
}

/* Kanban */
.kanban-board {
  display: flex; gap: 1rem; padding: 1rem; padding-bottom: 5rem;
  overflow-x: auto; overflow-y: hidden;
  height: calc(100vh - 120px); align-items: flex-start;
}
.kanban-list {
  min-width: 300px; max-width: 300px; max-height: calc(100vh - 140px);
  display: flex; flex-direction: column; border-radius: 16px;
  background: oklch(0.99 0.005 350 / 75%); backdrop-filter: blur(20px);
  border: 1px solid oklch(0.9 0.02 350 / 70%);
  box-shadow: 0 4px 24px oklch(0.62 0.12 350 / 8%), 0 1px 4px oklch(0 0 0 / 3%);
  flex-shrink: 0;
}
.kanban-list-cards { flex: 1; overflow-y: auto; padding: 0 0.5rem 0.5rem; min-height: 2rem; }
.kanban-card { transition: transform 0.2s ease, box-shadow 0.2s ease; }
.kanban-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 28px oklch(0.62 0.12 350 / 12%), 0 2px 8px oklch(0 0 0 / 5%);
}

/* Board card hover */
.board-card { transition: transform 0.25s ease, box-shadow 0.25s ease; }
.board-card:hover {
  transform: translateY(-6px) scale(1.03);
  box-shadow: 0 16px 48px oklch(0.62 0.15 350 / 18%), 0 4px 12px oklch(0 0 0 / 6%);
}

/* Gradient backgrounds */
.gradient-1 { background: linear-gradient(135deg, #f97316 0%, #ec4899 50%, #a855f7 100%); }
.gradient-2 { background: linear-gradient(135deg, #f472b6 0%, #c084fc 100%); }
.gradient-3 { background: linear-gradient(135deg, #fb923c 0%, #f472b6 100%); }
.gradient-4 { background: linear-gradient(135deg, #e879f9 0%, #818cf8 100%); }
.gradient-5 { background: linear-gradient(135deg, #f43f5e 0%, #fb923c 100%); }
.gradient-6 { background: linear-gradient(135deg, #c084fc 0%, #f9a8d4 100%); }
.gradient-7 { background: linear-gradient(135deg, #fbbf24 0%, #f472b6 100%); }
.gradient-8 { background: linear-gradient(135deg, #f9a8d4 0%, #c4b5fd 100%); }

/* Modal */
.modal-overlay {
  position: fixed; inset: 0; z-index: 50;
  background: oklch(0 0 0 / 50%); backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center;
}

/* Page transition */
.page-enter { animation: fadeUp 0.3s ease; }
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Animations */
@keyframes slide-down {
  from { opacity: 0; transform: translateY(-6px); }
  to   { opacity: 1; transform: translateY(0); }
}
.animate-slide-down { animation: slide-down 0.15s ease; }
```

- [ ] **Step 4: Rewrite `src/index.css`**

Replace the full content with:
```css
@import "tailwindcss";
@import "./styles/theme.css";
@import "./styles/globals.css";
```

- [ ] **Step 5: Delete `src/App.css` and remove its import**

```bash
rm src/App.css
```

Remove `import './App.css';` from `src/App.jsx`.

- [ ] **Step 6: Verify app builds**

```bash
npm run build
```

Expected: build succeeds. Check that gradient orbs and kanban styles still render correctly in `npm run dev`.

- [ ] **Step 7: Commit**

```bash
git add src/styles/ src/index.css
git rm src/App.css
git commit -m "feat: consolidate CSS into styles/theme.css and styles/globals.css"
```

---

## Task 7: Convert `src/components/ui/` to TypeScript

**Files:** All 24 `.jsx` files in `src/components/ui/` → `.tsx`

- [ ] **Step 1: Bulk rename all ui components**

```bash
cd src/components/ui
for f in *.jsx; do mv "$f" "${f%.jsx}.tsx"; done
cd ../../..
```

- [ ] **Step 2: Fix implicit `any` in shadcn components**

The main type issue in shadcn components is `className` props and forwarded refs. The generated shadcn components use `React.ComponentPropsWithoutRef` — these already work with TypeScript. After renaming, run:

```bash
npx tsc --noEmit 2>&1 | grep "src/components/ui" | head -30
```

Fix each reported error. The most common pattern is adding `React.ElementRef` to `forwardRef` calls. Example fix for `button.tsx`:

```tsx
const Button = React.forwardRef<
  React.ElementRef<'button'>,
  React.ComponentPropsWithoutRef<'button'> & VariantProps<typeof buttonVariants> & { asChild?: boolean }
>(({ className, variant, size, asChild = false, ...props }, ref) => {
```

- [ ] **Step 3: Run type check on ui/ only**

```bash
npx tsc --noEmit 2>&1 | grep "ui/"
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/
git commit -m "feat: convert shadcn ui components to TypeScript"
```

---

## Task 8: Convert `src/components/` (ErrorBoundary, Navbar)

**Files:**
- Rewrite: `src/components/ErrorBoundary.jsx` → `src/components/ErrorBoundary.tsx`
- Rename: `src/components/Navbar.jsx` → `src/components/Navbar.tsx`

- [ ] **Step 1: Rewrite `src/components/ErrorBoundary.tsx`**

```bash
mv src/components/ErrorBoundary.jsx src/components/ErrorBoundary.tsx
```

Full typed content:
```tsx
import { Component, ErrorInfo, ReactNode } from 'react';
import { logError } from '../lib/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  submitted: boolean;
  description: string;
  sending: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, submitted: false, description: '', sending: false };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    logError('react.error_boundary', {
      message: error.message,
      stack: error.stack,
      componentStack: info.componentStack ?? undefined,
    });
  }

  private async handleReport(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    this.setState({ sending: true });
    const { error, description } = this.state;
    logError('user.error_report', {
      description,
      message: error?.message,
      stack: error?.stack,
      url: window.location.href,
    });
    this.setState({ submitted: true, sending: false });
  }

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    const { submitted, sending, description } = this.state;

    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#0a0a0a', color: '#e5e5e5', fontFamily: 'sans-serif', padding: '2rem',
      }}>
        <div style={{
          width: '100%', maxWidth: 460, background: '#111', border: '1px solid #222',
          borderRadius: 16, padding: '2rem',
        }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
          <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 700 }}>Something went wrong</h2>
          <p style={{ margin: '0 0 24px', color: '#737373', fontSize: 14 }}>
            An unexpected error occurred. You can try again or send us a quick report.
          </p>
          {submitted ? (
            <div style={{
              background: '#0d1f12', border: '1px solid #166534', borderRadius: 10,
              padding: '1rem', color: '#4ade80', fontSize: 14, marginBottom: 20,
            }}>
              Report sent — thank you!
            </div>
          ) : (
            <form onSubmit={(e) => this.handleReport(e)} style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, color: '#a3a3a3', marginBottom: 6 }}>
                What were you doing? <span style={{ color: '#525252' }}>(optional)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => this.setState({ description: e.target.value })}
                placeholder="e.g. I clicked on a board card and the page crashed…"
                rows={3}
                style={{
                  width: '100%', background: '#0a0a0a', border: '1px solid #333',
                  borderRadius: 8, color: '#e5e5e5', fontSize: 14, padding: '10px 12px',
                  resize: 'vertical', outline: 'none', boxSizing: 'border-box',
                }}
              />
              <button
                type="submit" disabled={sending}
                style={{
                  marginTop: 10, width: '100%', padding: '10px', background: '#ec4899',
                  color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600,
                  fontSize: 14, cursor: sending ? 'not-allowed' : 'pointer', opacity: sending ? 0.7 : 1,
                }}
              >
                {sending ? 'Sending…' : 'Send report'}
              </button>
            </form>
          )}
          <button
            onClick={() => this.setState({ hasError: false, error: null, submitted: false, description: '' })}
            style={{
              width: '100%', padding: '10px', background: 'transparent',
              color: '#a3a3a3', border: '1px solid #333', borderRadius: 8,
              fontWeight: 500, fontSize: 14, cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }
}
```

- [ ] **Step 2: Convert `src/components/Navbar.tsx`**

```bash
mv src/components/Navbar.jsx src/components/Navbar.tsx
```

No logic changes — just the rename. TypeScript will infer all types from React Router and lucide-react which have their own types.

- [ ] **Step 3: Commit**

```bash
git add src/components/ErrorBoundary.tsx src/components/Navbar.tsx
git rm src/components/ErrorBoundary.jsx src/components/Navbar.jsx 2>/dev/null || true
git commit -m "feat: convert ErrorBoundary and Navbar to TypeScript"
```

---

## Task 9: Convert `src/context/`

**Files:**
- Convert: `src/context/AuthContext.jsx` → `.tsx`
- Convert: `src/context/NotificationContext.jsx` → `.tsx`
- Convert: `src/context/BoardContext.jsx` → `.tsx`

- [ ] **Step 1: Convert `AuthContext.tsx`**

```bash
mv src/context/AuthContext.jsx src/context/AuthContext.tsx
```

Add types — the key changes are the context value interface and the typed useState:

```tsx
import { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { logError } from '../lib/logger';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ user: User | null; session: Session | null }>;
  signUp: (email: string, password: string) => Promise<{ user: User | null; session: Session | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data: { session: s } }) => {
        setSession(s);
        setLoading(false);
      })
      .catch(err => logError('getSession failed', { message: String(err) }));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const user = session?.user;
    if (!user?.id || !user?.email) return;

    const displayName =
      user.user_metadata?.['full_name'] as string ||
      user.user_metadata?.['name'] as string ||
      user.email.split('@')[0];

    supabase.from('app_users').upsert(
      { id: user.id, email: user.email, display_name: displayName, avatar_url: user.user_metadata?.['avatar_url'] as string ?? null, updated_at: new Date().toISOString() },
      { onConflict: 'id' },
    ).then(({ error }) => {
      if (error) logError('Failed to sync app_user', { message: error.message });
    });
  }, [session]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    return data;
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  const value = useMemo(() => ({
    session, user: session?.user ?? null, loading, signIn, signUp, signOut,
  }), [session, loading, signIn, signUp, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
```

- [ ] **Step 2: Convert `NotificationContext.tsx`**

```bash
mv src/context/NotificationContext.jsx src/context/NotificationContext.tsx
```

Add interfaces:

```tsx
interface Notification {
  id: string;
  user_email: string;
  title: string;
  body: string;
  board_id: string | null;
  card_id: string | null;
  read: boolean;
  created_at: string;
}

interface NotificationContextValue {
  notifications: Notification[];
  loading: boolean;
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearAll: () => Promise<void>;
}

interface SendNotificationParams {
  userEmail: string;
  title: string;
  body?: string;
  boardId?: string | null;
  cardId?: string | null;
}
```

All the logic stays identical. Apply these interfaces to the `createContext`, `useState`, and function signatures.

- [ ] **Step 3: Convert `BoardContext.tsx`**

```bash
mv src/context/BoardContext.jsx src/context/BoardContext.tsx
```

Import types from `src/types/board.ts` and add the context value interface:

```tsx
import type { Board, List, Card, ArchivedCard, BoardRole } from '../types/board';

interface MembershipMap {
  [boardId: string]: BoardRole;
}

interface BoardContextValue {
  boards: Board[];
  archivedBoards: Board[];
  archivedCards: ArchivedCard[];
  membershipMap: MembershipMap;
  boardsLoading: boolean;
  isSavingBoards: boolean;
  lastSavedAt: Date | null;
  getBoardRole: (boardId: string) => BoardRole | null;
  getBoard: (boardId: string) => Board | null;
  addBoard: (title: string, gradient: string, backgroundImage?: string | null, lists?: List[]) => Promise<void>;
  deleteBoard: (boardId: string) => void;
  updateBoard: (boardId: string, updates: Partial<Board>) => void;
  toggleStarBoard: (boardId: string) => void;
  addList: (boardId: string, title: string) => void;
  deleteList: (boardId: string, listId: string) => void;
  updateListTitle: (boardId: string, listId: string, title: string) => void;
  addCard: (boardId: string, listId: string, title: string) => void;
  archiveCard: (boardId: string, listId: string, cardId: string) => void;
  updateCard: (boardId: string, listId: string, cardId: string, updates: Partial<Card>) => void;
  handleDragEnd: (boardId: string, result: unknown) => void;
  restoreBoard: (boardId: string) => void;
  restoreCard: (boardId: string, listId: string, cardId: string) => void;
  deleteBoardPermanently: (boardId: string) => Promise<void>;
  deleteCardPermanently: (boardId: string, listId: string, cardId: string) => void;
  refreshBoards: () => Promise<void>;
  persistBoardsNow: () => Promise<void>;
}
```

The `handleDragEnd` `result` parameter — import `DropResult` from `@hello-pangea/dnd`:
```bash
npm install -D @types/hello-pangea__dnd 2>/dev/null || true
```

Then type it as:
```tsx
import type { DropResult } from '@hello-pangea/dnd';
handleDragEnd: (boardId: string, result: DropResult) => void;
```

- [ ] **Step 4: Run type check on context/**

```bash
npx tsc --noEmit 2>&1 | grep "context/"
```

Fix any reported errors.

- [ ] **Step 5: Commit**

```bash
git add src/context/
git commit -m "feat: convert all contexts to TypeScript with typed interfaces"
```

---

## Task 10: Create `src/features/` folder structure + migrate auth

**Files:**
- Create: `src/features/auth/LoginPage.tsx`
- Create: `src/features/auth/SignupPage.tsx`
- Delete: `src/pages/Login.jsx`, `src/pages/Signup.jsx`

- [ ] **Step 1: Create features directory**

```bash
mkdir -p src/features/auth src/features/boards src/features/board-view src/features/cards src/features/members
```

- [ ] **Step 2: Create `src/features/auth/LoginPage.tsx`**

This is the existing `Login.jsx` content verbatim, renamed and with TypeScript prop types:

```tsx
import { useState } from 'react';
import { Link, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

const ALLOWED_DOMAIN = 'esperiastudio.com';

function isAllowedEmail(email: string): boolean {
  return email.toLowerCase().endsWith(`@${ALLOWED_DOMAIN}`);
}

function formatLoginError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/email logins are disabled/i.test(msg)) {
    return 'Email/password sign-in is disabled. Enable it in Supabase Dashboard → Authentication → Providers → Email.';
  }
  return msg || 'Could not sign in';
}

export default function LoginPage() {
  const { signIn, session, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/boards';

  if (loading) return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center">
      <div className="w-8 h-8 border-3 border-pink-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (session) return <Navigate to="/boards" replace />;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!isAllowedEmail(email.trim())) {
      setError(`Only @${ALLOWED_DOMAIN} accounts are allowed.`);
      return;
    }
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(formatLoginError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-border/60 bg-card/40 p-8 shadow-lg backdrop-blur-sm">
        <h1 className="text-2xl font-bold tracking-tight mb-1">Sign in</h1>
        <p className="text-sm text-muted-foreground mb-6">Enter your email and password to continue.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="login-email">Email</Label>
            <Input id="login-email" type="email" autoComplete="email" value={email}
              onChange={(e) => setEmail(e.target.value)} required className="h-10" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="login-password">Password</Label>
            <Input id="login-password" type="password" autoComplete="current-password" value={password}
              onChange={(e) => setPassword(e.target.value)} required className="h-10" />
          </div>
          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          <Button type="submit" className="w-full h-10" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Log in'}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          No account?{' '}
          <Link to="/signup" className="font-medium text-primary underline-offset-4 hover:underline">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create `src/features/auth/SignupPage.tsx`**

```tsx
import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

const ALLOWED_DOMAIN = 'esperiastudio.com';

function isAllowedEmail(email: string): boolean {
  return email.toLowerCase().endsWith(`@${ALLOWED_DOMAIN}`);
}

function formatSignupError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/signups not allowed/i.test(msg)) {
    return 'New sign-ups are disabled. Enable them in Supabase Dashboard → Authentication → User Signups.';
  }
  return msg || 'Could not sign up';
}

export default function SignupPage() {
  const { signUp, session, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (loading) return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center">
      <div className="w-8 h-8 border-3 border-pink-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (session) return <Navigate to="/boards" replace />;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setMessage('');
    if (!isAllowedEmail(email.trim())) {
      setError(`Only @${ALLOWED_DOMAIN} accounts are allowed.`);
      return;
    }
    setSubmitting(true);
    try {
      const data = await signUp(email.trim(), password);
      if (data.session) {
        navigate('/boards', { replace: true });
      } else {
        setMessage('Check your email to confirm your account, then sign in.');
      }
    } catch (err) {
      setError(formatSignupError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-border/60 bg-card/40 p-8 shadow-lg backdrop-blur-sm">
        <h1 className="text-2xl font-bold tracking-tight mb-1">Create account</h1>
        <p className="text-sm text-muted-foreground mb-6">Sign up with your email and password.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="signup-email">Email</Label>
            <Input id="signup-email" type="email" autoComplete="email" value={email}
              onChange={(e) => setEmail(e.target.value)} required className="h-10" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="signup-password">Password</Label>
            <Input id="signup-password" type="password" autoComplete="new-password" value={password}
              onChange={(e) => setPassword(e.target.value)} required minLength={6} className="h-10" />
            <p className="text-xs text-muted-foreground">At least 6 characters.</p>
          </div>
          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          {message && <p className="text-sm text-muted-foreground" role="status">{message}</p>}
          <Button type="submit" className="w-full h-10" disabled={submitting}>
            {submitting ? 'Creating account…' : 'Sign up'}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-primary underline-offset-4 hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Delete old pages**

```bash
rm src/pages/Login.jsx src/pages/Signup.jsx
```

- [ ] **Step 5: Commit**

```bash
git add src/features/auth/ src/pages/
git commit -m "feat: migrate auth pages to features/auth/ with TypeScript"
```

---

## Task 11: Migrate `src/features/boards/`

**Files:**
- Create: `src/features/boards/HomePage.tsx` (from `src/pages/Home.jsx`)
- Create: `src/features/boards/BoardCard.tsx` (from `src/components/BoardCard.jsx`)
- Create: `src/features/boards/CreateBoardModal.tsx` (from `src/components/CreateBoardModal.jsx`)
- Delete originals

- [ ] **Step 1: Create `src/features/boards/BoardCard.tsx`**

```tsx
import { Link } from 'react-router-dom';
import { WorkflowBuilderCard } from '@/components/ui/workflow-builder-card';
import { timeAgo } from '@/utils/date';
import { resolveBoardImageUrl } from '@/utils/board';
import type { Board } from '@/types/board';

interface BoardCardProps {
  board: Board;
  sharedBy?: string | null;
}

export default function BoardCard({ board, sharedBy }: BoardCardProps) {
  const totalCards = board.lists.reduce((acc, l) => acc + l.cards.length, 0);
  const listNames = board.lists.map(l => l.title).slice(0, 3);

  return (
    <Link to={`/boards/${board.id}`} className="block relative">
      <WorkflowBuilderCard
        imageUrl={resolveBoardImageUrl(board.backgroundImage)}
        gradientClass={board.gradient}
        status="Active"
        lastUpdated={sharedBy ? `Shared by ${sharedBy}` : timeAgo(board.createdAt)}
        title={board.title}
        description={`${board.lists.length} ${board.lists.length === 1 ? 'list' : 'lists'} · ${totalCards} ${totalCards === 1 ? 'card' : 'cards'}`}
        tags={listNames}
      />
    </Link>
  );
}
```

- [ ] **Step 2: Create `src/features/boards/CreateBoardModal.tsx`**

Move from `src/components/CreateBoardModal.jsx` to this path. Update imports:
- `GRADIENTS`, `GRADIENT_STYLES` now come from `@/utils/gradients`
- `useBoards` from `@/context/BoardContext`
- Add prop types:

```tsx
import { useState } from 'react';
import { X, Check } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useBoards } from '@/context/BoardContext';
import { GRADIENTS, GRADIENT_STYLES } from '@/utils/gradients';
import type { List } from '@/types/board';

interface Template {
  id: string;
  name: string;
  description: string;
  lists: string[];
}

const TEMPLATES: Template[] = [
  { id: 'blank', name: 'Blank board', description: 'Start from scratch', lists: [] },
  { id: 'kanban', name: 'Kanban', description: 'Classic flow board', lists: ['Backlog', 'To Do', 'In Progress', 'Done'] },
  { id: 'project', name: 'Project Management', description: 'Track work end-to-end', lists: ['Planning', 'In Progress', 'In Review', 'Done', 'Blocked'] },
  { id: 'sprint', name: 'Sprint Board', description: 'Agile sprint planning', lists: ['Backlog', 'Sprint', 'In Progress', 'Testing', 'Done'] },
];

function buildLists(listNames: string[]): List[] {
  return listNames.map(name => ({ id: uuidv4(), title: name, cards: [] }));
}

interface CreateBoardModalProps {
  onClose: () => void;
}

export default function CreateBoardModal({ onClose }: CreateBoardModalProps) {
  const { addBoard } = useBoards();
  const [title, setTitle] = useState('');
  const [selectedGradient, setSelectedGradient] = useState(GRADIENTS[0]);
  const [selectedTemplate, setSelectedTemplate] = useState('blank');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const template = TEMPLATES.find(t => t.id === selectedTemplate)!;
    addBoard(title.trim(), selectedGradient, null, buildLists(template.lists));
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content bg-card border border-border rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">Create new board</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="h-28 rounded-xl flex items-end p-4 transition-all duration-300"
            style={{ background: GRADIENT_STYLES[selectedGradient] }}>
            <p className="text-white font-semibold text-lg truncate drop-shadow">
              {title || 'Board title'}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="board-title">Board title</Label>
            <Input id="board-title" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter board title..." autoFocus className="bg-secondary/50" />
          </div>
          <div className="space-y-2">
            <Label>Template</Label>
            <div className="grid grid-cols-2 gap-2">
              {TEMPLATES.map((t) => (
                <button key={t.id} type="button" onClick={() => setSelectedTemplate(t.id)}
                  className={`relative text-left rounded-xl border p-3 transition-all ${
                    selectedTemplate === t.id
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-border/50 hover:border-border hover:bg-secondary/40'
                  }`}>
                  {selectedTemplate === t.id && (
                    <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-primary-foreground" />
                    </span>
                  )}
                  <p className="text-sm font-semibold mb-1 pr-5">{t.name}</p>
                  {t.lists.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {t.lists.map(l => (
                        <span key={l} className="text-[10px] bg-secondary px-1.5 py-0.5 rounded-md text-muted-foreground">{l}</span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-muted-foreground">{t.description}</p>
                  )}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Background</Label>
            <div className="grid grid-cols-4 gap-2">
              {GRADIENTS.map(g => (
                <button key={g} type="button" onClick={() => setSelectedGradient(g)}
                  className={`h-10 rounded-lg transition-all duration-200 ${
                    selectedGradient === g
                      ? 'ring-2 ring-primary ring-offset-2 ring-offset-card scale-[1.06]'
                      : 'hover:scale-[1.04] opacity-80 hover:opacity-100'
                  }`}
                  style={{ background: GRADIENT_STYLES[g] }} aria-label={g} />
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="flex-1" disabled={!title.trim()}>Create Board</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create `src/features/boards/HomePage.tsx`**

Move from `src/pages/Home.jsx`. Update imports to use `@/` aliases and new component paths:
- `BoardCard` from `./BoardCard`
- `CreateBoardModal` from `./CreateBoardModal`
- All other imports updated to `@/` aliases

Add typed props where needed (the component itself takes no props — all data comes from context).

- [ ] **Step 4: Delete old files**

```bash
rm src/pages/Home.jsx src/components/BoardCard.jsx src/components/CreateBoardModal.jsx
```

- [ ] **Step 5: Commit**

```bash
git add src/features/boards/ src/pages/ src/components/
git commit -m "feat: migrate boards feature to features/boards/ with TypeScript"
```

---

## Task 12: Migrate `src/features/members/`

**Files:**
- Create: `src/features/members/BoardMembersPanel.tsx`
- Create: `src/features/members/InviteMemberModal.tsx`
- Delete originals from `src/components/`

- [ ] **Step 1: Move and type `BoardMembersPanel.tsx`**

```bash
mv src/components/BoardMembersPanel.jsx src/features/members/BoardMembersPanel.tsx
```

Add prop interface:
```tsx
interface BoardMembersPanelProps {
  boardId: string;
  onClose: () => void;
  onInvite: () => void;
  canManage: boolean;
}
```

Update all imports to use `@/` aliases.

- [ ] **Step 2: Move and type `InviteMemberModal.tsx`**

```bash
mv src/components/InviteMemberModal.jsx src/features/members/InviteMemberModal.tsx
```

Add prop interface:
```tsx
interface InviteMemberModalProps {
  boardId: string;
  onClose: () => void;
}
```

Update all imports to use `@/` aliases.

- [ ] **Step 3: Commit**

```bash
git add src/features/members/
git commit -m "feat: migrate members feature to features/members/ with TypeScript"
```

---

## Task 13: Migrate `src/features/board-view/` + remaining components

**Files:**
- Create: `src/features/board-view/KanbanList.tsx`
- Create: `src/features/board-view/KanbanCard.tsx`
- Create: `src/features/board-view/AddCardForm.tsx`
- Create: `src/features/board-view/AddListForm.tsx`
- Create: `src/features/board-view/BoardViewPage.tsx` (from `src/pages/BoardView.jsx`)
- Delete originals

- [ ] **Step 1: Move and type `KanbanCard.tsx`**

```bash
mv src/components/KanbanCard.jsx src/features/board-view/KanbanCard.tsx
```

Add prop interface and types:
```tsx
import type { Card } from '@/types/board';

interface KanbanCardProps {
  card: Card;
  onClick: () => void;
  isDragging: boolean;
}
```

Update imports: `Badge` from `@/components/ui/badge`, `getMemberColor`/`getInitials` from `@/utils/board`. For `getMemberColor`, the palette is a constant defined locally in this file:

```tsx
const MEMBER_COLORS = ['#8b5cf6', '#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#f97316', '#ef4444', '#ec4899'];
```

Call it as: `getMemberColor(member.name, MEMBER_COLORS)`.

- [ ] **Step 2: Move and type `KanbanList.tsx`**

```bash
mv src/components/KanbanList.jsx src/features/board-view/KanbanList.tsx
```

Add prop interface:
```tsx
import type { List } from '@/types/board';
import type { DraggableProvidedDragHandleProps } from '@hello-pangea/dnd';

interface KanbanListProps {
  list: List;
  onDeleteList: (listId: string) => void;
  onUpdateListTitle: (listId: string, title: string) => void;
  onAddCard: (listId: string, title: string) => void;
  onCardClick: (listId: string, cardId: string) => void;
  dragHandleProps: DraggableProvidedDragHandleProps | null;
}
```

Update imports: `KanbanCard` and `AddCardForm` from `./KanbanCard` and `./AddCardForm`.

- [ ] **Step 3: Move and type `AddCardForm.tsx`**

```bash
mv src/components/AddCardForm.jsx src/features/board-view/AddCardForm.tsx
```

```tsx
interface AddCardFormProps {
  onAdd: (title: string) => void;
}
```

- [ ] **Step 4: Move and type `AddListForm.tsx`**

```bash
mv src/components/AddListForm.jsx src/features/board-view/AddListForm.tsx
```

```tsx
interface AddListFormProps {
  onAdd: (title: string) => void;
}
```

- [ ] **Step 5: Move `BoardViewPage.tsx`**

```bash
mv src/pages/BoardView.jsx src/features/board-view/BoardViewPage.tsx
```

Update all imports to `@/` aliases and new feature paths. Key type additions:

```tsx
interface SelectedCard {
  listId: string;
  cardId: string;
}
```

Replace `const [selectedCard, setSelectedCard] = useState(null)` with:
```tsx
const [selectedCard, setSelectedCard] = useState<SelectedCard | null>(null);
```

The `getMemberIdentityKey` helper function — add return type:
```tsx
function getMemberIdentityKey(m: { id?: string; name: string }): string {
  return m.id ?? m.name;
}
```

- [ ] **Step 6: Migrate `src/pages/Archive.jsx` → `src/features/boards/ArchivePage.tsx`**

```bash
mv src/pages/Archive.jsx src/features/boards/ArchivePage.tsx
```

Update imports to `@/` aliases. Add types to `ConfirmButton`:
```tsx
interface ConfirmButtonProps {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onConfirm: () => void;
  variant?: 'danger' | 'primary';
}
```

And `timeAgo` is now imported from `@/utils/date` — remove the local definition.

- [ ] **Step 7: Delete old pages**

```bash
rm -f src/pages/BoardView.jsx src/pages/Archive.jsx src/pages/Landing.jsx 2>/dev/null || true
```

Note: `Landing.jsx` should also be moved to `src/features/` or kept in pages — move it to `src/features/boards/LandingPage.tsx` following the same rename pattern.

- [ ] **Step 8: Run type check**

```bash
npx tsc --noEmit 2>&1 | grep "board-view\|features/boards" | head -20
```

Fix any reported errors.

- [ ] **Step 9: Commit**

```bash
git add src/features/ src/pages/ src/components/
git commit -m "feat: migrate board-view components and BoardViewPage to features/"
```

---

## Task 14: Migrate `src/features/cards/`

**Files:**
- Create: `src/features/cards/CardDetailModal.tsx` (orchestrator, ~200 lines)
- Create: `src/features/cards/CardDescription.tsx`
- Create: `src/features/cards/CardLabels.tsx`
- Create: `src/features/cards/CardChecklist.tsx`
- Create: `src/features/cards/CardDueDate.tsx`
- Create: `src/features/cards/CardAttachments.tsx`
- Delete: `src/components/CardDetailModal.jsx`

- [ ] **Step 1: Create `src/features/cards/CardDescription.tsx`**

```tsx
import { useState } from 'react';
import { AlignLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface CardDescriptionProps {
  description: string;
  onSave: (description: string) => void;
}

export default function CardDescription({ description, onSave }: CardDescriptionProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(description);

  const handleSave = () => {
    onSave(draft);
    setEditing(false);
  };

  const handleCancel = () => {
    setDraft(description);
    setEditing(false);
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <AlignLeft className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Description</h3>
      </div>
      {editing ? (
        <div className="space-y-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Add a more detailed description…"
            rows={4}
            autoFocus
            className="text-sm bg-secondary/50 resize-none"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave}>Save</Button>
            <Button size="sm" variant="ghost" onClick={handleCancel}>Cancel</Button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => setEditing(true)}
          className="min-h-[60px] rounded-lg bg-secondary/40 p-3 text-sm cursor-pointer hover:bg-secondary/60 transition-colors"
        >
          {description || <span className="text-muted-foreground">Add a description…</span>}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create `src/features/cards/CardLabels.tsx`**

```tsx
import { useState } from 'react';
import { Tag, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LABEL_COLORS } from '@/data/initialData';
import type { Label } from '@/types/board';

interface CardLabelsProps {
  labels: Label[];
  onAdd: (label: Label) => void;
  onRemove: (labelId: string) => void;
}

export default function CardLabels({ labels, onAdd, onRemove }: CardLabelsProps) {
  const [text, setText] = useState('');
  const [color, setColor] = useState(LABEL_COLORS[0].value);
  const [open, setOpen] = useState(false);

  const handleAdd = () => {
    if (!text.trim()) return;
    onAdd({ id: crypto.randomUUID(), text: text.trim(), color });
    setText('');
    setOpen(false);
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Tag className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Labels</h3>
      </div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {labels.map(label => (
          <span key={label.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white"
            style={{ backgroundColor: label.color }}>
            {label.text}
            <button onClick={() => onRemove(label.id)} className="hover:opacity-70">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
      {open ? (
        <div className="space-y-2">
          <Input value={text} onChange={e => setText(e.target.value)} placeholder="Label name" className="h-8 text-sm" autoFocus />
          <div className="flex flex-wrap gap-1.5">
            {LABEL_COLORS.map(c => (
              <button key={c.value} onClick={() => setColor(c.value)}
                className={`w-6 h-6 rounded-full transition-transform ${color === c.value ? 'ring-2 ring-offset-1 ring-foreground scale-110' : ''}`}
                style={{ backgroundColor: c.value }} title={c.name} />
            ))}
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAdd} disabled={!text.trim()}>Add</Button>
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>Add label</Button>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create `src/features/cards/CardChecklist.tsx`**

```tsx
import { useState } from 'react';
import { CheckSquare, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ChecklistItem } from '@/types/board';

interface CardChecklistProps {
  checklist: ChecklistItem[];
  onToggle: (itemId: string) => void;
  onAdd: (text: string) => void;
  onRemove: (itemId: string) => void;
}

export default function CardChecklist({ checklist, onToggle, onAdd, onRemove }: CardChecklistProps) {
  const [newItem, setNewItem] = useState('');
  const completed = checklist.filter(i => i.completed).length;
  const progress = checklist.length > 0 ? Math.round((completed / checklist.length) * 100) : 0;

  const handleAdd = () => {
    if (!newItem.trim()) return;
    onAdd(newItem.trim());
    setNewItem('');
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <CheckSquare className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Checklist</h3>
        <span className="ml-auto text-xs text-muted-foreground">{completed}/{checklist.length}</span>
      </div>
      {checklist.length > 0 && (
        <div className="w-full h-1.5 bg-secondary rounded-full mb-3">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}
      <div className="space-y-1 mb-2">
        {checklist.map(item => (
          <div key={item.id} className="flex items-center gap-2 group">
            <input type="checkbox" checked={item.completed} onChange={() => onToggle(item.id)}
              className="rounded accent-primary" />
            <span className={`flex-1 text-sm ${item.completed ? 'line-through text-muted-foreground' : ''}`}>
              {item.text}
            </span>
            <button onClick={() => onRemove(item.id)} className="opacity-0 group-hover:opacity-100 transition-opacity">
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Input value={newItem} onChange={e => setNewItem(e.target.value)} placeholder="Add an item…"
          className="h-8 text-sm" onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }} />
        <Button size="sm" onClick={handleAdd} disabled={!newItem.trim()}>
          <Plus className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create `src/features/cards/CardDueDate.tsx`**

```tsx
import { Calendar } from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';

interface CardDueDateProps {
  dueDate: string | null;
  onChange: (date: string | null) => void;
}

export default function CardDueDate({ dueDate, onChange }: CardDueDateProps) {
  const dateObj = dueDate ? new Date(dueDate) : null;
  const isOverdue = dateObj && isPast(dateObj) && !isToday(dateObj);
  const isDueToday = dateObj && isToday(dateObj);

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Calendar className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Due date</h3>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={dueDate ? format(new Date(dueDate), 'yyyy-MM-dd') : ''}
          onChange={e => onChange(e.target.value ? new Date(e.target.value).toISOString() : null)}
          className="text-sm bg-secondary/50 border border-border rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-primary/30"
        />
        {dateObj && (
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            isOverdue ? 'bg-destructive/20 text-destructive' :
            isDueToday ? 'bg-yellow-500/20 text-yellow-600' :
            'bg-secondary text-muted-foreground'
          }`}>
            {isOverdue ? 'Overdue' : isDueToday ? 'Today' : format(dateObj, 'MMM d')}
          </span>
        )}
        {dueDate && (
          <button onClick={() => onChange(null)} className="text-xs text-muted-foreground hover:text-destructive transition-colors">
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create `src/features/cards/CardAttachments.tsx`**

```tsx
import { useState } from 'react';
import { Paperclip, X, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Attachment } from '@/types/board';

interface CardAttachmentsProps {
  attachments: Attachment[];
  onAdd: (attachment: Omit<Attachment, 'id' | 'addedAt'>) => void;
  onRemove: (attachmentId: string) => void;
}

export default function CardAttachments({ attachments, onAdd, onRemove }: CardAttachmentsProps) {
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [open, setOpen] = useState(false);

  const handleAdd = () => {
    if (!url.trim()) return;
    try {
      const parsed = new URL(url.trim());
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return;
      onAdd({ name: name.trim() || url.trim(), url: parsed.toString() });
      setUrl(''); setName(''); setOpen(false);
    } catch {
      // invalid URL
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Paperclip className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Attachments</h3>
      </div>
      <div className="space-y-1.5 mb-2">
        {attachments.map(att => (
          <div key={att.id} className="flex items-center gap-2 p-2 rounded-lg bg-secondary/40 group">
            <Paperclip className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="flex-1 text-sm truncate">{att.name}</span>
            {att.url && (
              <a href={att.url} target="_blank" rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground">
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            <button onClick={() => onRemove(att.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
      {open ? (
        <div className="space-y-2">
          <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://…" className="h-8 text-sm" autoFocus />
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Display name (optional)" className="h-8 text-sm" />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAdd} disabled={!url.trim()}>Add</Button>
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>Add attachment</Button>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Create `src/features/cards/CardDetailModal.tsx` (orchestrator)**

This file holds the modal shell and all state. Members, comments, and title editing stay here. It renders the sub-components above.

```tsx
import { useState, useMemo, useRef, useEffect } from 'react';
import { X, Archive, Users, MessageSquare, Plus, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useBoards } from '@/context/BoardContext';
import { useAuth } from '@/context/AuthContext';
import { sendNotification } from '@/context/NotificationContext';
import { v4 as uuidv4 } from 'uuid';
import CardDescription from './CardDescription';
import CardLabels from './CardLabels';
import CardChecklist from './CardChecklist';
import CardDueDate from './CardDueDate';
import CardAttachments from './CardAttachments';
import type { Label, ChecklistItem, Attachment } from '@/types/board';

const MEMBER_COLORS = ['#8b5cf6', '#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#f97316', '#ef4444', '#ec4899'];
const RECENT_MEMBER_NAMES_KEY = 'recent_member_names';

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}
function getMemberColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return MEMBER_COLORS[Math.abs(hash) % MEMBER_COLORS.length];
}

interface CardDetailModalProps {
  boardId: string;
  listId: string;
  cardId: string;
  onClose: () => void;
}

export default function CardDetailModal({ boardId, listId, cardId, onClose }: CardDetailModalProps) {
  const { getBoard, updateCard, archiveCard, boards } = useBoards();
  const { user } = useAuth();
  const board = getBoard(boardId);
  const list = board?.lists.find(l => l.id === listId);
  const card = list?.cards.find(c => c.id === cardId);

  const [title, setTitle] = useState(card?.title ?? '');
  const [newMemberName, setNewMemberName] = useState('');
  const [newComment, setNewComment] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionIndex, setSuggestionIndex] = useState(-1);
  const [recentMemberNames, setRecentMemberNames] = useState<string[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(RECENT_MEMBER_NAMES_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as unknown[];
        if (Array.isArray(parsed)) setRecentMemberNames(parsed.filter((x): x is string => typeof x === 'string'));
      }
    } catch { /* ignore */ }
  }, []);

  const allBoardMembers = useMemo(() => {
    const nameSet = new Set<string>();
    for (const b of boards) {
      for (const l of b.lists) {
        for (const c of l.cards) {
          for (const m of c.members ?? []) {
            if (m.name) nameSet.add(m.name);
          }
        }
      }
    }
    return [...nameSet].sort((a, b) => a.localeCompare(b));
  }, [boards]);

  if (!card) return null;

  const checklist = card.checklist ?? [];
  const members = card.members ?? [];
  const comments = card.comments ?? [];
  const attachments = card.attachments ?? [];
  const assignedNames = new Set(members.map(m => m.name.toLowerCase()));

  const candidateNames = useMemo(() => {
    const set = new Set([...allBoardMembers, ...recentMemberNames]);
    if (user?.email) set.add(user.email);
    return [...set];
  }, [allBoardMembers, recentMemberNames, user?.email]);

  const filteredSuggestions = newMemberName.trim().length > 0
    ? candidateNames
        .filter(n => n.toLowerCase().includes(newMemberName.trim().toLowerCase()) && !assignedNames.has(n.toLowerCase()))
        .slice(0, 8)
    : [];

  const handleTitleBlur = () => {
    if (title.trim() && title !== card.title) {
      updateCard(boardId, listId, cardId, { title: title.trim() });
    }
  };

  const handleAddMember = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed || members.some(m => m.name === trimmed)) return;
    updateCard(boardId, listId, cardId, { members: [...members, { id: uuidv4(), name: trimmed }] });
    const updated = [trimmed, ...recentMemberNames.filter(n => n !== trimmed)].slice(0, 20);
    setRecentMemberNames(updated);
    localStorage.setItem(RECENT_MEMBER_NAMES_KEY, JSON.stringify(updated));
    setNewMemberName(''); setShowSuggestions(false);
    sendNotification({ userEmail: trimmed, title: `You were added to: ${card.title}`, boardId, cardId }).catch(() => {});
  };

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    const comment = { id: uuidv4(), text: newComment.trim(), author: user?.email ?? 'Unknown', createdAt: new Date().toISOString() };
    updateCard(boardId, listId, cardId, { comments: [...comments, comment] });
    setNewComment('');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start gap-3 p-5 border-b border-border/60">
          <textarea
            value={title}
            onChange={e => setTitle(e.target.value)}
            onBlur={handleTitleBlur}
            className="flex-1 text-lg font-semibold bg-transparent resize-none outline-none focus:ring-2 focus:ring-primary/20 rounded px-1"
            rows={1}
          />
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary transition-colors shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-6">
          {/* Description */}
          <CardDescription
            description={card.description}
            onSave={desc => updateCard(boardId, listId, cardId, { description: desc })}
          />

          {/* Labels */}
          <CardLabels
            labels={card.labels}
            onAdd={label => updateCard(boardId, listId, cardId, { labels: [...card.labels, label] })}
            onRemove={labelId => updateCard(boardId, listId, cardId, { labels: card.labels.filter(l => l.id !== labelId) })}
          />

          {/* Checklist */}
          <CardChecklist
            checklist={checklist}
            onToggle={itemId => updateCard(boardId, listId, cardId, {
              checklist: checklist.map(i => i.id === itemId ? { ...i, completed: !i.completed } : i),
            })}
            onAdd={text => updateCard(boardId, listId, cardId, {
              checklist: [...checklist, { id: uuidv4(), text, completed: false }],
            })}
            onRemove={itemId => updateCard(boardId, listId, cardId, {
              checklist: checklist.filter(i => i.id !== itemId),
            })}
          />

          {/* Due date */}
          <CardDueDate
            dueDate={card.dueDate}
            onChange={date => updateCard(boardId, listId, cardId, { dueDate: date })}
          />

          {/* Attachments */}
          <CardAttachments
            attachments={attachments}
            onAdd={att => updateCard(boardId, listId, cardId, {
              attachments: [...attachments, { ...att, id: uuidv4(), addedAt: new Date().toISOString() }],
            })}
            onRemove={attId => updateCard(boardId, listId, cardId, {
              attachments: attachments.filter(a => a.id !== attId),
            })}
          />

          {/* Members */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Members</h3>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {members.map(m => (
                <div key={m.id} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs text-white"
                  style={{ backgroundColor: getMemberColor(m.name) }}>
                  {getInitials(m.name)}
                  <button onClick={() => updateCard(boardId, listId, cardId, { members: members.filter(x => x.id !== m.id) })}
                    className="hover:opacity-70 ml-0.5"><X className="w-3 h-3" /></button>
                </div>
              ))}
            </div>
            <div className="relative">
              <Input value={newMemberName} onChange={e => { setNewMemberName(e.target.value); setShowSuggestions(true); }}
                onFocus={() => setShowSuggestions(true)}
                onKeyDown={e => {
                  if (e.key === 'Enter') { e.preventDefault(); handleAddMember(filteredSuggestions[suggestionIndex] ?? newMemberName); }
                  if (e.key === 'Escape') setShowSuggestions(false);
                  if (e.key === 'ArrowDown') setSuggestionIndex(i => Math.min(i + 1, filteredSuggestions.length - 1));
                  if (e.key === 'ArrowUp') setSuggestionIndex(i => Math.max(i - 1, -1));
                }}
                placeholder="Add member by name or email…"
                className="h-8 text-sm pr-10" />
              <button onClick={() => handleAddMember(newMemberName)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <Plus className="w-4 h-4" />
              </button>
              {showSuggestions && filteredSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                  {filteredSuggestions.map((name, i) => (
                    <button key={name} onClick={() => handleAddMember(name)}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-secondary/60 transition-colors ${i === suggestionIndex ? 'bg-secondary/60' : ''}`}>
                      {name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Comments */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Comments</h3>
            </div>
            <div className="space-y-2 mb-2">
              {comments.map(c => (
                <div key={c.id} className="flex gap-2">
                  <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-xs text-primary-foreground shrink-0">
                    {getInitials(c.author)}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground mb-0.5">{c.author}</p>
                    <p className="text-sm">{c.text}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Write a comment…"
                onKeyDown={e => { if (e.key === 'Enter') handleAddComment(); }}
                className="h-8 text-sm" />
              <Button size="sm" onClick={handleAddComment} disabled={!newComment.trim()}>
                <Send className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border/60 p-4 flex justify-end">
          <Button variant="ghost" size="sm" onClick={() => { archiveCard(boardId, listId, cardId); onClose(); }}
            className="text-muted-foreground gap-1.5">
            <Archive className="w-3.5 h-3.5" />
            Archive card
          </Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Delete old CardDetailModal**

```bash
rm src/components/CardDetailModal.jsx
```

- [ ] **Step 8: Run type check**

```bash
npx tsc --noEmit 2>&1 | grep "features/cards" | head -20
```

Fix any errors.

- [ ] **Step 9: Commit**

```bash
git add src/features/cards/
git commit -m "feat: split CardDetailModal into typed sub-components in features/cards/"
```

---

## Task 15: Create Layouts

**Files:**
- Create: `src/layouts/AuthenticatedLayout.tsx`
- Create: `src/layouts/PublicLayout.tsx`

- [ ] **Step 1: Create `src/layouts/` directory**

```bash
mkdir -p src/layouts
```

- [ ] **Step 2: Create `src/layouts/AuthenticatedLayout.tsx`**

```tsx
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';

function Spinner() {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="w-8 h-8 border-3 border-pink-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function AuthenticatedLayout() {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Spinner />;
  if (!session) return <Navigate to="/login" state={{ from: location }} replace />;

  return (
    <>
      <Navbar />
      <Outlet />
    </>
  );
}
```

- [ ] **Step 3: Create `src/layouts/PublicLayout.tsx`**

```tsx
import { Outlet } from 'react-router-dom';

export default function PublicLayout() {
  return <Outlet />;
}
```

- [ ] **Step 4: Commit**

```bash
git add src/layouts/
git commit -m "feat: add AuthenticatedLayout and PublicLayout"
```

---

## Task 16: Create `src/routes/index.tsx`

**Files:**
- Create: `src/routes/index.tsx`

- [ ] **Step 1: Create `src/routes/index.tsx`**

```tsx
import { Routes, Route } from 'react-router-dom';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import PublicLayout from '@/layouts/PublicLayout';
import Landing from '@/features/boards/LandingPage';
import LoginPage from '@/features/auth/LoginPage';
import SignupPage from '@/features/auth/SignupPage';
import HomePage from '@/features/boards/HomePage';
import BoardViewPage from '@/features/board-view/BoardViewPage';
import ArchivePage from '@/features/boards/ArchivePage';

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
      </Route>

      <Route element={<AuthenticatedLayout />}>
        <Route path="/boards" element={<HomePage />} />
        <Route path="/boards/:boardId" element={<BoardViewPage />} />
        <Route path="/archive" element={<ArchivePage />} />
      </Route>
    </Routes>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/routes/
git commit -m "feat: add typed route definitions in src/routes/"
```

---

## Task 17: Update `App.tsx` and `main.tsx`

**Files:**
- Rewrite: `src/App.jsx` → `src/App.tsx`
- Rename: `src/main.jsx` → `src/main.tsx`
- Rename: `vite.config.js` → `vite.config.ts`

- [ ] **Step 1: Rewrite `src/App.tsx`**

```bash
mv src/App.jsx src/App.tsx
```

Full content — pure provider tree, no routing logic:

```tsx
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { BoardProvider } from '@/context/BoardContext';
import { NotificationProvider } from '@/context/NotificationContext';
import AppRoutes from '@/routes';
import './index.css';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <BoardProvider>
          <NotificationProvider>
            <div className="min-h-screen bg-background relative overflow-hidden">
              <div className="gradient-orb gradient-orb-1" />
              <div className="gradient-orb gradient-orb-2" />
              <div className="gradient-orb gradient-orb-3" />
              <div className="relative z-10">
                <AppRoutes />
              </div>
            </div>
          </NotificationProvider>
        </BoardProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
```

- [ ] **Step 2: Rename `src/main.tsx`**

```bash
mv src/main.jsx src/main.tsx
```

Add types to the window event handlers:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { logError } from './lib/logger';

window.addEventListener('error', (event) => {
  logError('uncaught.error', {
    message: event.message,
    stack: event.error instanceof Error ? event.error.stack : undefined,
  });
});

window.addEventListener('unhandledrejection', (event) => {
  logError('uncaught.promise_rejection', {
    message: event.reason instanceof Error ? event.reason.message : String(event.reason),
    stack: event.reason instanceof Error ? event.reason.stack : undefined,
  });
});

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

createRoot(root).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
```

- [ ] **Step 3: Rename `vite.config.ts`**

```bash
mv vite.config.js vite.config.ts
```

Add type import:
```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { open: true },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

- [ ] **Step 4: Run full type check**

```bash
npx tsc --noEmit 2>&1 | head -50
```

Fix any remaining errors. Common issues:
- Implicit `any` from event handlers → add `(e: React.ChangeEvent<HTMLInputElement>)`
- Missing return types on utility functions → add `: void` or `: string`
- Unused imports flagged by `noUnusedLocals` → remove them

- [ ] **Step 5: Run build**

```bash
npm run build
```

Expected: zero TypeScript errors, build succeeds.

- [ ] **Step 6: Delete empty `src/pages/` if empty**

```bash
rmdir src/pages 2>/dev/null || echo "pages/ not empty, check remaining files"
ls src/pages/ 2>/dev/null
```

If files remain, move them to the appropriate `src/features/` subfolder.

- [ ] **Step 7: Final commit**

```bash
git add -A
git commit -m "feat: complete TypeScript migration — App.tsx, main.tsx, vite.config.ts, routes"
```

---

## Task 18: Verify and deploy

- [ ] **Step 1: Run lint**

```bash
npm run lint
```

Fix any reported issues.

- [ ] **Step 2: Run full type check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Run dev server and smoke test**

```bash
npm run dev
```

Check:
- Home page loads and shows boards
- Create board modal works with templates
- Board view opens, drag-drop works
- Card detail modal opens with all sub-sections
- Dark mode toggle works
- Login / signup flow works

- [ ] **Step 4: Build for production**

```bash
npm run build
```

- [ ] **Step 5: Deploy**

```bash
npx wrangler pages deploy dist --project-name esperia-trello --branch main --commit-dirty=true
```

- [ ] **Step 6: Final commit if any lint fixes**

```bash
git add -A
git commit -m "chore: final lint fixes and verified TypeScript build"
```

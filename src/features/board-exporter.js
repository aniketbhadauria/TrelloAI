/**
 * Board Exporter — download any board as JSON.
 *
 * Self-contained, vanilla-JS module. Does NOT import from the rest of the app.
 * Mounted directly via a <script type="module"> tag in index.html so it never
 * touches React context, the router, or any existing component.
 */
import { logError } from '../lib/logger';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || import.meta.env.SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.SUPABASE_ANON_KEY;
const ROW_ID =
  import.meta.env.VITE_SUPABASE_BOARD_ROW_ID ||
  import.meta.env.SUPABASE_BOARD_ROW_ID ||
  'shared';

// ── Lifecycle ──────────────────────────────────────────────────
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}

function init() {
  if (!SUPABASE_URL || !SUPABASE_KEY) return;
  if (document.getElementById('tf-board-exporter-fab')) return;
  injectStyles();
  mountFab();
}

// ── Styles ─────────────────────────────────────────────────────
function injectStyles() {
  if (document.getElementById('tf-board-exporter-styles')) return;
  const css = `
    .tf-bex-fab {
      position: fixed; left: 20px; bottom: 24px; z-index: 9998;
      width: 44px; height: 44px; border-radius: 50%;
      background: rgba(24, 24, 27, 0.85); color: #f4f4f5;
      border: 1px solid rgba(255,255,255,0.08);
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; backdrop-filter: blur(10px);
      box-shadow: 0 8px 24px rgba(0,0,0,0.35);
      transition: transform 140ms ease, background 140ms ease;
    }
    .tf-bex-fab:hover { transform: translateY(-1px); background: rgba(39,39,42,0.92); }
    .tf-bex-fab svg { width: 18px; height: 18px; }

    .tf-bex-backdrop {
      position: fixed; inset: 0; z-index: 9998;
      background: rgba(0,0,0,0.3); backdrop-filter: blur(2px);
      opacity: 0; transition: opacity 160ms ease; pointer-events: none;
    }
    .tf-bex-backdrop.open { opacity: 1; pointer-events: auto; }

    .tf-bex-panel {
      position: fixed; left: 20px; bottom: 76px; z-index: 9999;
      width: 320px; max-height: 70vh; overflow: hidden;
      background: #18181b; color: #f4f4f5;
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 14px;
      box-shadow: 0 20px 50px rgba(0,0,0,0.45);
      display: flex; flex-direction: column;
      transform-origin: bottom left;
      transform: translateY(8px) scale(0.98); opacity: 0;
      transition: transform 160ms ease, opacity 160ms ease;
      pointer-events: none;
      font-family: 'Poppins', system-ui, -apple-system, sans-serif;
    }
    .tf-bex-panel.open { transform: translateY(0) scale(1); opacity: 1; pointer-events: auto; }

    .tf-bex-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 12px 14px; border-bottom: 1px solid rgba(255,255,255,0.06);
    }
    .tf-bex-title { font-size: 13px; font-weight: 600; letter-spacing: 0.02em; }
    .tf-bex-subtitle { font-size: 10px; color: #a1a1aa; margin-top: 2px; }
    .tf-bex-close {
      background: transparent; border: none; color: #a1a1aa;
      cursor: pointer; padding: 4px; border-radius: 6px;
      display: inline-flex; align-items: center; justify-content: center;
    }
    .tf-bex-close:hover { background: rgba(255,255,255,0.06); color: #f4f4f5; }

    .tf-bex-toolbar {
      padding: 8px 10px; border-bottom: 1px solid rgba(255,255,255,0.06);
      display: flex; gap: 6px;
    }
    .tf-bex-btn-all {
      flex: 1; padding: 7px 10px; font-size: 11.5px; font-weight: 500;
      background: rgba(139,92,246,0.15); color: #c4b5fd;
      border: 1px solid rgba(139,92,246,0.35); border-radius: 8px;
      cursor: pointer; transition: background 140ms ease;
    }
    .tf-bex-btn-all:hover { background: rgba(139,92,246,0.25); }

    .tf-bex-list {
      overflow-y: auto; padding: 6px; display: flex; flex-direction: column; gap: 2px;
    }
    .tf-bex-item {
      display: flex; align-items: center; gap: 10px;
      padding: 9px 10px; border-radius: 8px;
      transition: background 120ms ease;
    }
    .tf-bex-item:hover { background: rgba(255,255,255,0.04); }
    .tf-bex-item-body { flex: 1; min-width: 0; }
    .tf-bex-item-title {
      font-size: 13px; font-weight: 500; color: #f4f4f5;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .tf-bex-item-meta { font-size: 10.5px; color: #71717a; margin-top: 1px; }
    .tf-bex-download {
      background: rgba(255,255,255,0.04); color: #e4e4e7;
      border: 1px solid rgba(255,255,255,0.08);
      padding: 6px 10px; font-size: 11px; font-weight: 500;
      border-radius: 7px; cursor: pointer;
      display: inline-flex; align-items: center; gap: 5px;
      transition: background 120ms ease;
    }
    .tf-bex-download:hover { background: rgba(255,255,255,0.1); }
    .tf-bex-download svg { width: 12px; height: 12px; }

    .tf-bex-empty, .tf-bex-loading, .tf-bex-error {
      padding: 28px 14px; text-align: center; font-size: 12px;
    }
    .tf-bex-empty { color: #71717a; }
    .tf-bex-loading { color: #a1a1aa; }
    .tf-bex-error { color: #fca5a5; }

    .tf-bex-toast {
      position: fixed; left: 20px; bottom: 92px; z-index: 10000;
      padding: 9px 14px; font-size: 12px; color: #f4f4f5;
      background: rgba(16,185,129,0.15); border: 1px solid rgba(16,185,129,0.4);
      border-radius: 8px; backdrop-filter: blur(8px);
      opacity: 0; transform: translateY(6px);
      transition: opacity 180ms ease, transform 180ms ease;
      pointer-events: none; font-family: 'Poppins', system-ui, sans-serif;
    }
    .tf-bex-toast.show { opacity: 1; transform: translateY(0); }
  `;
  const style = document.createElement('style');
  style.id = 'tf-board-exporter-styles';
  style.textContent = css;
  document.head.appendChild(style);
}

// ── UI mount ───────────────────────────────────────────────────
function mountFab() {
  const fab = document.createElement('button');
  fab.id = 'tf-board-exporter-fab';
  fab.className = 'tf-bex-fab';
  fab.type = 'button';
  fab.setAttribute('aria-label', 'Export boards as JSON');
  fab.title = 'Export boards as JSON';
  fab.innerHTML = icon('download');

  const backdrop = document.createElement('div');
  backdrop.className = 'tf-bex-backdrop';

  const panel = document.createElement('div');
  panel.className = 'tf-bex-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Export boards as JSON');

  document.body.appendChild(fab);
  document.body.appendChild(backdrop);
  document.body.appendChild(panel);

  let open = false;
  const setOpen = (next) => {
    open = next;
    panel.classList.toggle('open', open);
    backdrop.classList.toggle('open', open);
    fab.style.display = open ? 'none' : 'flex';
    if (open) renderPanel(panel);
  };

  fab.addEventListener('click', () => setOpen(true));
  backdrop.addEventListener('click', () => setOpen(false));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && open) setOpen(false);
  });

  panel.addEventListener('click', async (e) => {
    const target = e.target.closest('[data-action]');
    if (!target) return;
    const action = target.dataset.action;
    if (action === 'close') setOpen(false);
    else if (action === 'download-all') await exportAll(panel);
    else if (action === 'download-board') await exportBoard(target.dataset.boardId, panel);
  });

  // Show the FAB only on authenticated app pages, not the landing page / auth pages.
  // We don't know routing state, so we use path heuristics.
  const updateVisibility = () => {
    const path = globalThis.location.pathname;
    const hidden = path === '/' || path === '/login' || path === '/signup';
    fab.style.display = hidden || open ? 'none' : 'flex';
    if (hidden && open) setOpen(false);
  };
  updateVisibility();
  globalThis.addEventListener('popstate', updateVisibility);
  // SPA nav via history.pushState — monkey-patch to fire an event.
  const origPush = history.pushState;
  const origReplace = history.replaceState;
  history.pushState = function (...args) { origPush.apply(this, args); updateVisibility(); };
  history.replaceState = function (...args) { origReplace.apply(this, args); updateVisibility(); };
}

// ── Panel render ───────────────────────────────────────────────
async function renderPanel(panel) {
  panel.innerHTML = `
    <div class="tf-bex-header">
      <div>
        <div class="tf-bex-title">Export boards</div>
        <div class="tf-bex-subtitle">Download boards as JSON</div>
      </div>
      <button class="tf-bex-close" data-action="close" aria-label="Close">${icon('x')}</button>
    </div>
    <div class="tf-bex-loading">Loading boards…</div>
  `;

  try {
    const boards = await loadBoards();
    const active = boards.filter((b) => !b.archived);

    if (!active.length) {
      panel.innerHTML = `
        <div class="tf-bex-header">
          <div>
            <div class="tf-bex-title">Export boards</div>
            <div class="tf-bex-subtitle">Download boards as JSON</div>
          </div>
          <button class="tf-bex-close" data-action="close" aria-label="Close">${icon('x')}</button>
        </div>
        <div class="tf-bex-empty">No boards to export.</div>
      `;
      return;
    }

    const items = active.map((b) => {
      const lists = b.lists?.length || 0;
      const cards = (b.lists || []).reduce((s, l) => s + (l.cards?.length || 0), 0);
      return `
        <div class="tf-bex-item">
          <div class="tf-bex-item-body">
            <div class="tf-bex-item-title">${escapeHtml(b.title || 'Untitled')}</div>
            <div class="tf-bex-item-meta">${lists} list${lists === 1 ? '' : 's'} · ${cards} card${cards === 1 ? '' : 's'}</div>
          </div>
          <button class="tf-bex-download" data-action="download-board" data-board-id="${escapeAttr(b.id)}">
            ${icon('download')} JSON
          </button>
        </div>
      `;
    }).join('');

    panel.innerHTML = `
      <div class="tf-bex-header">
        <div>
          <div class="tf-bex-title">Export boards</div>
          <div class="tf-bex-subtitle">${active.length} board${active.length === 1 ? '' : 's'} available</div>
        </div>
        <button class="tf-bex-close" data-action="close" aria-label="Close">${icon('x')}</button>
      </div>
      <div class="tf-bex-toolbar">
        <button class="tf-bex-btn-all" data-action="download-all">Download all as one file</button>
      </div>
      <div class="tf-bex-list">${items}</div>
    `;
  } catch (err) {
    logError('Board export fetch failed', { message: err.message });
    panel.innerHTML = `
      <div class="tf-bex-header">
        <div>
          <div class="tf-bex-title">Export boards</div>
        </div>
        <button class="tf-bex-close" data-action="close" aria-label="Close">${icon('x')}</button>
      </div>
      <div class="tf-bex-error">Could not load boards: ${escapeHtml(err.message || String(err))}</div>
    `;
  }
}

// ── Export actions ─────────────────────────────────────────────
async function exportBoard(boardId, panel) {
  try {
    const boards = await loadBoards();
    const board = boards.find((b) => b.id === boardId && !b.archived);
    if (!board) throw new Error('Board not found');
    downloadJson(slugify(board.title || 'board') + '.json', board);
    toast(`Downloaded "${board.title}"`);
  } catch (err) {
    panel.insertAdjacentHTML(
      'beforeend',
      `<div class="tf-bex-error">Export failed: ${escapeHtml(err.message || String(err))}</div>`
    );
  }
}

async function exportAll(panel) {
  try {
    const boards = await loadBoards();
    const active = boards.filter((b) => !b.archived);
    const payload = { exportedAt: new Date().toISOString(), boards: active };
    downloadJson(`boards-${todayStamp()}.json`, payload);
    toast(`Downloaded ${active.length} board${active.length === 1 ? '' : 's'}`);
  } catch (err) {
    panel.insertAdjacentHTML(
      'beforeend',
      `<div class="tf-bex-error">Export failed: ${escapeHtml(err.message || String(err))}</div>`
    );
  }
}

// ── Supabase fetch (REST, no auth) ─────────────────────────────
async function loadBoards() {
  const url = `${SUPABASE_URL}/rest/v1/app_boards?id=eq.${encodeURIComponent(ROW_ID)}&select=data`;
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Accept: 'application/json',
    },
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}`);
  const rows = await res.json();
  const data = rows[0]?.data || { boards: [] };
  return data.boards || [];
}

// ── Helpers ────────────────────────────────────────────────────
function downloadJson(filename, obj) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function slugify(str) {
  return String(str)
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-|-$/g, '')
    .slice(0, 60) || 'board';
}

function todayStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

function escapeHtml(s) {
  return String(s).replaceAll(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]);
}
function escapeAttr(s) { return escapeHtml(s); }

function toast(message) {
  let el = document.getElementById('tf-bex-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'tf-bex-toast';
    el.className = 'tf-bex-toast';
    document.body.appendChild(el);
  }
  el.textContent = message;
  requestAnimationFrame(() => el.classList.add('show'));
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove('show'), 1800);
}

function icon(name) {
  switch (name) {
    case 'download':
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`;
    case 'x':
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
    default: return '';
  }
}

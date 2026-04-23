#!/usr/bin/env node
/**
 * Import Trello board exports into the app's Supabase `app_boards` row.
 *
 * Usage:
 *   node scripts/import-trello.mjs <file1.json> <file2.json> [...]
 *
 * Reads each Trello export, converts it to the app's schema, and appends
 * them to the existing `shared` row in `app_boards`. Does NOT overwrite
 * boards that are already there.
 */
import { readFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import 'dotenv/config';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const ROW_ID = process.env.VITE_SUPABASE_BOARD_ROW_ID || 'shared';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/* ── Trello colour → app palette ─────────────────────────────── */
const TRELLO_COLOR_MAP = {
  red: '#ef4444',
  red_dark: '#b91c1c',
  red_light: '#fca5a5',
  orange: '#f97316',
  orange_dark: '#c2410c',
  orange_light: '#fdba74',
  yellow: '#f59e0b',
  yellow_dark: '#b45309',
  yellow_light: '#fcd34d',
  lime: '#84cc16',
  lime_dark: '#4d7c0f',
  lime_light: '#bef264',
  green: '#10b981',
  green_dark: '#059669',
  green_light: '#6ee7b7',
  sky: '#06b6d4',
  sky_dark: '#0e7490',
  sky_light: '#67e8f9',
  blue: '#3b82f6',
  blue_dark: '#1d4ed8',
  blue_light: '#93c5fd',
  purple: '#8b5cf6',
  purple_dark: '#6d28d9',
  purple_light: '#c4b5fd',
  pink: '#ec4899',
  pink_dark: '#be185d',
  pink_light: '#f9a8d4',
  black: '#1f2937',
  black_dark: '#0f172a',
  black_light: '#94a3b8',
};

const GRADIENT_POOL = [
  'gradient-1', 'gradient-2', 'gradient-3', 'gradient-4',
  'gradient-5', 'gradient-6', 'gradient-7', 'gradient-8',
];

function mapLabelColor(color) {
  if (!color) return '#94a3b8';
  return TRELLO_COLOR_MAP[color] || '#94a3b8';
}

function pickGradient(seed) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return GRADIENT_POOL[Math.abs(hash) % GRADIENT_POOL.length];
}

/* ── Convert Trello export → app board ───────────────────────── */
function convertBoard(trello) {
  const labelsById = new Map();
  for (const l of trello.labels || []) {
    labelsById.set(l.id, {
      id: l.id,
      text: l.name || 'Label',
      color: mapLabelColor(l.color),
    });
  }

  const membersById = new Map();
  for (const m of trello.members || []) {
    membersById.set(m.id, {
      id: m.id,
      name: m.fullName || m.username || 'Member',
      username: m.username,
    });
  }

  const checklistsById = new Map();
  for (const c of trello.checklists || []) {
    checklistsById.set(c.id, c);
  }

  const commentsByCardId = new Map();
  for (const a of trello.actions || []) {
    if (a.type !== 'commentCard') continue;
    const cardId = a.data?.card?.id;
    if (!cardId) continue;
    if (!commentsByCardId.has(cardId)) commentsByCardId.set(cardId, []);
    commentsByCardId.get(cardId).push({
      id: a.id,
      text: a.data?.text || '',
      author: a.memberCreator?.fullName || a.memberCreator?.username || 'Unknown',
      createdAt: a.date,
    });
  }

  const cardsByListId = new Map();
  for (const card of trello.cards || []) {
    if (card.closed) continue;

    const labels = (card.idLabels || [])
      .map((id) => labelsById.get(id))
      .filter(Boolean);

    const members = (card.idMembers || [])
      .map((id) => membersById.get(id))
      .filter(Boolean)
      .map((m) => ({ id: m.id, name: m.name }));

    const checklist = [];
    for (const clId of card.idChecklists || []) {
      const cl = checklistsById.get(clId);
      if (!cl) continue;
      const sorted = [...(cl.checkItems || [])].sort((a, b) => (a.pos || 0) - (b.pos || 0));
      for (const item of sorted) {
        checklist.push({
          id: item.id,
          text: item.name,
          completed: item.state === 'complete',
        });
      }
    }

    const mapped = {
      id: card.id,
      title: card.name || 'Untitled',
      description: card.desc || '',
      labels,
      dueDate: card.due || null,
      createdAt: card.dateLastActivity || new Date().toISOString(),
      ...(members.length && { members }),
      ...(checklist.length && { checklist }),
      ...((commentsByCardId.get(card.id) || []).length && {
        comments: commentsByCardId.get(card.id),
      }),
    };

    if (!cardsByListId.has(card.idList)) cardsByListId.set(card.idList, []);
    cardsByListId.get(card.idList).push({ pos: card.pos || 0, card: mapped });
  }

  const lists = (trello.lists || [])
    .filter((l) => !l.closed)
    .sort((a, b) => (a.pos || 0) - (b.pos || 0))
    .map((l) => {
      const entries = cardsByListId.get(l.id) || [];
      entries.sort((a, b) => a.pos - b.pos);
      return {
        id: l.id,
        title: l.name || 'Untitled list',
        cards: entries.map((e) => e.card),
      };
    });

  return {
    id: trello.id || randomUUID(),
    title: trello.name || 'Imported Board',
    gradient: pickGradient(trello.id || trello.name || 'x'),
    starred: !!trello.starred,
    archived: false,
    createdAt: trello.dateLastActivity || new Date().toISOString(),
    lists,
  };
}

/* ── Main ────────────────────────────────────────────────────── */
async function main() {
  const files = process.argv.slice(2);
  if (!files.length) {
    console.error('Usage: node scripts/import-trello.mjs <file.json> [...]');
    process.exit(1);
  }

  const imported = [];
  for (const file of files) {
    console.log(`Reading ${file}…`);
    const raw = await readFile(file, 'utf8');
    const trello = JSON.parse(raw);
    const board = convertBoard(trello);
    console.log(`  → "${board.title}" — ${board.lists.length} lists, ${board.lists.reduce((s, l) => s + l.cards.length, 0)} cards`);
    imported.push(board);
  }

  console.log('\nFetching current shared row…');
  const { data: row, error: loadErr } = await supabase
    .from('app_boards')
    .select('data, updated_at')
    .eq('id', ROW_ID)
    .maybeSingle();
  if (loadErr) throw loadErr;

  const existing = row?.data?.boards || [];
  const existingIds = new Set(existing.map((b) => b.id));

  const toAdd = imported.filter((b) => !existingIds.has(b.id));
  const skipped = imported.length - toAdd.length;
  if (skipped) console.log(`Skipping ${skipped} board(s) already present.`);

  const merged = { boards: [...existing, ...toAdd] };

  console.log(`\nUpserting shared row — ${existing.length} existing + ${toAdd.length} new = ${merged.boards.length} total…`);
  const { error: saveErr } = await supabase
    .from('app_boards')
    .upsert(
      { id: ROW_ID, data: merged, updated_at: new Date().toISOString() },
      { onConflict: 'id' }
    );
  if (saveErr) throw saveErr;

  console.log('\nDone. Reload the app to see the imported boards.');
  for (const b of toAdd) console.log(`  • ${b.title}`);
}

main().catch((err) => {
  console.error('\nImport failed:', err.message);
  process.exit(1);
});

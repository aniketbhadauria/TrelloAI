#!/usr/bin/env node
/**
 * Populate the I-SMS board with the Malaysia Student Portal cards.
 * Safe to re-run — skips lists/cards whose titles already exist.
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const ROW_ID = process.env.SUPABASE_BOARD_ROW_ID || process.env.VITE_SUPABASE_BOARD_ROW_ID || 'shared';

const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

const BOARD_TITLE = 'I-SMS';

// Distinct label per owner to color-code the columns.
const OWNER_LABEL = {
  bhavya: { text: 'Bhavya',  color: '#8b5cf6' }, // purple
  suthi:  { text: 'Suthi',   color: '#06b6d4' }, // cyan
  nisha:  { text: 'Nisha',   color: '#10b981' }, // green
  hari:   { text: 'Hari',    color: '#f97316' }, // orange
};

const SOURCE = {
  columns: [
    {
      ownerKey: 'bhavya',
      name: 'Bhavya — Education & Student Journey',
      cards: [
        { title: 'Map Malaysia education reforms', description: 'Trace major reforms and analyze impact on student learning and assessment.' },
        { title: 'Build education reform timeline (1996–2026)', description: 'Document key milestones and attach student impact notes.' },
        { title: 'Map student journey', description: 'Outline stages: enrollment → learning → assessment → progression.' },
        { title: 'Identify journey pain points', description: 'Highlight friction areas across each stage of the student lifecycle.' },
        { title: 'Summarize student challenges', description: 'Document issues like exam stress, workload, and access gaps.' },
        { title: 'Define guiding research questions', description: 'Explore how reforms shape student experience and where struggles occur.' },
      ],
    },
    {
      ownerKey: 'suthi',
      name: 'Suthi — AI Features & Learning Experience',
      cards: [
        { title: 'Create AI feature wishlist', description: 'Compare student-desired features vs technically feasible ones.' },
        { title: 'Analyze student workload', description: 'Break down homework, assessments, and co-curricular demands.' },
        { title: 'Map learning preferences', description: 'Categorize visual, auditory, and interactive learning styles.' },
        { title: 'Define AI impact questions', description: 'Identify which AI features reduce stress and improve outcomes.' },
        { title: 'Balance AI vs teacher roles', description: 'Explore integration between AI tutoring and teacher guidance.' },
        { title: 'Draft learning preference summary', description: 'Compare teacher-led vs AI-assisted and self-paced vs guided learning.' },
      ],
    },
    {
      ownerKey: 'nisha',
      name: 'Nisha — System & Workflow Analysis',
      cards: [
        { title: 'Define Integrated SMS', description: 'Explain what an Integrated School Management System is.' },
        { title: 'List core SMS modules', description: 'Attendance, grades, communication, fees, etc.' },
        { title: 'Analyze SMS limitations', description: 'Identify gaps in current Malaysian school systems.' },
        { title: 'Document current data workflows', description: 'Compare manual vs digital processes in schools.' },
        { title: 'Map student daily workflow', description: 'Outline responsibilities and daily routines.' },
        { title: 'Map teacher/admin workflows', description: 'Document operational and administrative responsibilities.' },
      ],
    },
    {
      ownerKey: 'hari',
      name: 'Hari — Culture, Access & Demographics',
      cards: [
        { title: 'Analyze cultural influences', description: 'Study how Malaysian culture shapes student digital behavior.' },
        { title: 'Map student diversity factors', description: 'Urban vs rural, income levels, and language differences.' },
        { title: 'Assess connectivity & device access', description: 'Identify regional disparities in internet and device usage.' },
        { title: 'Identify classroom cultural norms', description: 'Examine participation styles and parent involvement.' },
        { title: 'Propose demographic segmentation', description: 'Define personas based on behavior and constraints.' },
        { title: 'List research validation questions', description: 'Identify assumptions to test about users and constraints.' },
      ],
    },
  ],
};

function mkCard({ title, description }, ownerLabel) {
  return {
    id: randomUUID(),
    title,
    description,
    labels: [{ id: randomUUID(), text: ownerLabel.text, color: ownerLabel.color }],
    dueDate: null,
    createdAt: new Date().toISOString(),
  };
}

async function main() {
  console.log('Fetching shared row…');
  const { data: row, error: loadErr } = await sb
    .from('app_boards')
    .select('data, updated_at')
    .eq('id', ROW_ID)
    .maybeSingle();
  if (loadErr) throw loadErr;
  if (!row) throw new Error('No `shared` row found in app_boards.');

  const data = row.data || { boards: [] };
  const board = data.boards.find((b) => b.title === BOARD_TITLE && !b.archived);
  if (!board) throw new Error(`Board "${BOARD_TITLE}" not found.`);

  console.log(`Found "${board.title}" (${board.id}) — ${board.lists.length} lists currently.`);

  let listsAdded = 0;
  let cardsAdded = 0;
  let cardsSkipped = 0;

  for (const col of SOURCE.columns) {
    let list = board.lists.find((l) => l.title === col.name);
    if (!list) {
      list = { id: randomUUID(), title: col.name, cards: [] };
      board.lists.push(list);
      listsAdded += 1;
    }
    const ownerLabel = OWNER_LABEL[col.ownerKey];
    const existingTitles = new Set(list.cards.map((c) => c.title));
    for (const src of col.cards) {
      if (existingTitles.has(src.title)) { cardsSkipped += 1; continue; }
      list.cards.push(mkCard(src, ownerLabel));
      cardsAdded += 1;
    }
  }

  console.log(`Adding ${listsAdded} list(s), ${cardsAdded} card(s); skipping ${cardsSkipped} already present.`);

  if (listsAdded === 0 && cardsAdded === 0) {
    console.log('Nothing to do.');
    return;
  }

  const { error: saveErr } = await sb
    .from('app_boards')
    .upsert(
      { id: ROW_ID, data, updated_at: new Date().toISOString() },
      { onConflict: 'id' },
    );
  if (saveErr) throw saveErr;

  console.log('\nDone. Open I-SMS in the app — realtime sync should reflect the new cards.');
}

main().catch((err) => {
  console.error('\nPopulate failed:', err.message);
  process.exit(1);
});

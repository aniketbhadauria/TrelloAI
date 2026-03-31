import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { randomUUID } from 'node:crypto';

// ─── Express setup ───────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// ─── Supabase client (server-side) ──────────────────────────
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY,
);
const ROW_ID = 'default';

async function loadBoardData() {
  const { data: row, error } = await supabase
    .from('app_boards')
    .select('data')
    .eq('id', ROW_ID)
    .single();
  if (error) throw new Error(`Supabase read failed: ${error.message}`);
  return row?.data || { boards: [] };
}

async function saveBoardData(boardData) {
  const { error } = await supabase
    .from('app_boards')
    .update({ data: boardData, updated_at: new Date().toISOString() })
    .eq('id', ROW_ID);
  if (error) throw new Error(`Supabase write failed: ${error.message}`);
}

// ─── Anthropic client ───────────────────────────────────────
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── TaskFlow tool definitions (Anthropic format) ───────────
const TASKFLOW_TOOLS = [
  {
    name: 'taskflow_list_boards',
    description: 'List all boards with their IDs, titles, list count, and card count.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'taskflow_get_board',
    description: 'Get full details of a specific board by ID, including all lists and cards with their IDs.',
    input_schema: {
      type: 'object',
      properties: { boardId: { type: 'string', description: 'The board ID' } },
      required: ['boardId'],
    },
  },
  {
    name: 'taskflow_add_list',
    description: 'Add a new list to a board. Returns the new list ID.',
    input_schema: {
      type: 'object',
      properties: {
        boardId: { type: 'string', description: 'The board ID' },
        title: { type: 'string', description: 'Title for the new list' },
      },
      required: ['boardId', 'title'],
    },
  },
  {
    name: 'taskflow_delete_list',
    description: 'Delete a list from a board.',
    input_schema: {
      type: 'object',
      properties: {
        boardId: { type: 'string', description: 'The board ID' },
        listId: { type: 'string', description: 'The list ID to delete' },
      },
      required: ['boardId', 'listId'],
    },
  },
  {
    name: 'taskflow_add_card',
    description: 'Add a new card to a list. You can set title, description, labels, dueDate, members, and checklist items.',
    input_schema: {
      type: 'object',
      properties: {
        boardId: { type: 'string', description: 'The board ID' },
        listId: { type: 'string', description: 'The list ID to add the card to' },
        title: { type: 'string', description: 'Card title' },
        description: { type: 'string', description: 'Card description (optional)' },
        labels: {
          type: 'array',
          description: 'Array of label objects [{text, color}]. Colors: #ef4444 red, #f97316 orange, #f59e0b yellow, #10b981 green, #3b82f6 blue, #8b5cf6 purple, #ec4899 pink, #06b6d4 cyan',
          items: { type: 'object', properties: { text: { type: 'string' }, color: { type: 'string' } } },
        },
        dueDate: { type: 'string', description: 'ISO date string for due date (optional)' },
        members: {
          type: 'array',
          description: 'Array of member objects [{name}]',
          items: { type: 'object', properties: { name: { type: 'string' } } },
        },
        checklist: {
          type: 'array',
          description: 'Array of checklist items [{text, completed}]',
          items: { type: 'object', properties: { text: { type: 'string' }, completed: { type: 'boolean' } } },
        },
      },
      required: ['boardId', 'listId', 'title'],
    },
  },
  {
    name: 'taskflow_update_card',
    description: "Update a card's properties. Only provided fields are updated.",
    input_schema: {
      type: 'object',
      properties: {
        boardId: { type: 'string', description: 'The board ID' },
        listId: { type: 'string', description: 'The list ID containing the card' },
        cardId: { type: 'string', description: 'The card ID to update' },
        title: { type: 'string', description: 'New title (optional)' },
        description: { type: 'string', description: 'New description (optional)' },
        labels: { type: 'array', description: 'Replace all labels (optional)', items: { type: 'object' } },
        dueDate: { type: 'string', description: 'New due date ISO string, or empty to clear (optional)' },
        members: { type: 'array', description: 'Replace all members (optional)', items: { type: 'object' } },
        checklist: { type: 'array', description: 'Replace full checklist (optional)', items: { type: 'object' } },
      },
      required: ['boardId', 'listId', 'cardId'],
    },
  },
  {
    name: 'taskflow_delete_card',
    description: 'Delete a card from a list.',
    input_schema: {
      type: 'object',
      properties: {
        boardId: { type: 'string', description: 'The board ID' },
        listId: { type: 'string', description: 'The list ID containing the card' },
        cardId: { type: 'string', description: 'The card ID to delete' },
      },
      required: ['boardId', 'listId', 'cardId'],
    },
  },
  {
    name: 'taskflow_move_card',
    description: 'Move a card from one list to another.',
    input_schema: {
      type: 'object',
      properties: {
        boardId: { type: 'string', description: 'The board ID' },
        sourceListId: { type: 'string', description: 'Current list ID' },
        destinationListId: { type: 'string', description: 'Target list ID' },
        cardId: { type: 'string', description: 'The card ID to move' },
        position: { type: 'number', description: 'Index in destination list (0-based). Omit to append.' },
      },
      required: ['boardId', 'sourceListId', 'destinationListId', 'cardId'],
    },
  },
  {
    name: 'taskflow_add_comment',
    description: 'Add a comment to a card.',
    input_schema: {
      type: 'object',
      properties: {
        boardId: { type: 'string', description: 'The board ID' },
        listId: { type: 'string', description: 'The list ID containing the card' },
        cardId: { type: 'string', description: 'The card ID' },
        text: { type: 'string', description: 'Comment text' },
        author: { type: 'string', description: 'Author name (defaults to "TaskFlow AI")' },
      },
      required: ['boardId', 'listId', 'cardId', 'text'],
    },
  },
  {
    name: 'taskflow_add_checklist_item',
    description: 'Add a checklist item to a card.',
    input_schema: {
      type: 'object',
      properties: {
        boardId: { type: 'string', description: 'The board ID' },
        listId: { type: 'string', description: 'The list ID containing the card' },
        cardId: { type: 'string', description: 'The card ID' },
        text: { type: 'string', description: 'Checklist item text' },
        completed: { type: 'boolean', description: 'Whether the item is completed (default false)' },
      },
      required: ['boardId', 'listId', 'cardId', 'text'],
    },
  },
  {
    name: 'taskflow_add_member',
    description: 'Assign a member to a card.',
    input_schema: {
      type: 'object',
      properties: {
        boardId: { type: 'string', description: 'The board ID' },
        listId: { type: 'string', description: 'The list ID containing the card' },
        cardId: { type: 'string', description: 'The card ID' },
        name: { type: 'string', description: 'Member name' },
      },
      required: ['boardId', 'listId', 'cardId', 'name'],
    },
  },
];

// ─── Tool handlers ──────────────────────────────────────────
const toolHandlers = {
  async taskflow_list_boards() {
    const data = await loadBoardData();
    return data.boards.map(b => ({
      id: b.id,
      title: b.title,
      lists: b.lists.length,
      cards: b.lists.reduce((s, l) => s + (l.cards?.length || 0), 0),
    }));
  },

  async taskflow_get_board({ boardId }) {
    const data = await loadBoardData();
    const board = data.boards.find(b => b.id === boardId);
    if (!board) return { error: 'Board not found' };
    return board;
  },

  async taskflow_add_list({ boardId, title }) {
    const data = await loadBoardData();
    const board = data.boards.find(b => b.id === boardId);
    if (!board) return { error: 'Board not found' };
    const newList = { id: randomUUID(), title, cards: [] };
    board.lists.push(newList);
    await saveBoardData(data);
    return { success: true, listId: newList.id, title };
  },

  async taskflow_delete_list({ boardId, listId }) {
    const data = await loadBoardData();
    const board = data.boards.find(b => b.id === boardId);
    if (!board) return { error: 'Board not found' };
    const before = board.lists.length;
    board.lists = board.lists.filter(l => l.id !== listId);
    if (board.lists.length === before) return { error: 'List not found' };
    await saveBoardData(data);
    return { success: true };
  },

  async taskflow_add_card({ boardId, listId, title, description, labels, dueDate, members, checklist }) {
    const data = await loadBoardData();
    const board = data.boards.find(b => b.id === boardId);
    if (!board) return { error: 'Board not found' };
    const list = board.lists.find(l => l.id === listId);
    if (!list) return { error: 'List not found' };
    const newCard = {
      id: randomUUID(),
      title,
      description: description || '',
      labels: (labels || []).map(l => ({ id: randomUUID(), text: l.text, color: l.color || '#8b5cf6' })),
      dueDate: dueDate || null,
      members: (members || []).map(m => ({ id: randomUUID(), name: m.name })),
      checklist: (checklist || []).map(c => ({ id: randomUUID(), text: c.text, completed: c.completed || false })),
      comments: [],
      createdAt: new Date().toISOString(),
    };
    list.cards.push(newCard);
    await saveBoardData(data);
    return { success: true, cardId: newCard.id, title, listTitle: list.title };
  },

  async taskflow_update_card({ boardId, listId, cardId, ...updates }) {
    const data = await loadBoardData();
    const board = data.boards.find(b => b.id === boardId);
    if (!board) return { error: 'Board not found' };
    const list = board.lists.find(l => l.id === listId);
    if (!list) return { error: 'List not found' };
    const card = list.cards.find(c => c.id === cardId);
    if (!card) return { error: 'Card not found' };

    if (updates.title !== undefined) card.title = updates.title;
    if (updates.description !== undefined) card.description = updates.description;
    if (updates.dueDate !== undefined) card.dueDate = updates.dueDate || null;
    if (updates.labels) card.labels = updates.labels.map(l => ({ id: randomUUID(), text: l.text, color: l.color || '#8b5cf6' }));
    if (updates.members) card.members = updates.members.map(m => ({ id: randomUUID(), name: m.name }));
    if (updates.checklist) card.checklist = updates.checklist.map(c => ({ id: randomUUID(), text: c.text, completed: c.completed || false }));

    await saveBoardData(data);
    return { success: true, cardId, updated: Object.keys(updates) };
  },

  async taskflow_delete_card({ boardId, listId, cardId }) {
    const data = await loadBoardData();
    const board = data.boards.find(b => b.id === boardId);
    if (!board) return { error: 'Board not found' };
    const list = board.lists.find(l => l.id === listId);
    if (!list) return { error: 'List not found' };
    const before = list.cards.length;
    list.cards = list.cards.filter(c => c.id !== cardId);
    if (list.cards.length === before) return { error: 'Card not found' };
    await saveBoardData(data);
    return { success: true };
  },

  async taskflow_move_card({ boardId, sourceListId, destinationListId, cardId, position }) {
    const data = await loadBoardData();
    const board = data.boards.find(b => b.id === boardId);
    if (!board) return { error: 'Board not found' };
    const srcList = board.lists.find(l => l.id === sourceListId);
    const destList = board.lists.find(l => l.id === destinationListId);
    if (!srcList || !destList) return { error: 'List not found' };
    const cardIndex = srcList.cards.findIndex(c => c.id === cardId);
    if (cardIndex === -1) return { error: 'Card not found in source list' };
    const [card] = srcList.cards.splice(cardIndex, 1);
    const insertAt = position !== undefined ? position : destList.cards.length;
    destList.cards.splice(insertAt, 0, card);
    await saveBoardData(data);
    return { success: true, cardTitle: card.title, from: srcList.title, to: destList.title };
  },

  async taskflow_add_comment({ boardId, listId, cardId, text, author }) {
    const data = await loadBoardData();
    const board = data.boards.find(b => b.id === boardId);
    if (!board) return { error: 'Board not found' };
    const list = board.lists.find(l => l.id === listId);
    if (!list) return { error: 'List not found' };
    const card = list.cards.find(c => c.id === cardId);
    if (!card) return { error: 'Card not found' };
    if (!card.comments) card.comments = [];
    const comment = { id: randomUUID(), text, author: author || 'TaskFlow AI', createdAt: new Date().toISOString() };
    card.comments.push(comment);
    await saveBoardData(data);
    return { success: true, commentId: comment.id };
  },

  async taskflow_add_checklist_item({ boardId, listId, cardId, text, completed }) {
    const data = await loadBoardData();
    const board = data.boards.find(b => b.id === boardId);
    if (!board) return { error: 'Board not found' };
    const list = board.lists.find(l => l.id === listId);
    if (!list) return { error: 'List not found' };
    const card = list.cards.find(c => c.id === cardId);
    if (!card) return { error: 'Card not found' };
    if (!card.checklist) card.checklist = [];
    const item = { id: randomUUID(), text, completed: completed || false };
    card.checklist.push(item);
    await saveBoardData(data);
    return { success: true, itemId: item.id };
  },

  async taskflow_add_member({ boardId, listId, cardId, name }) {
    const data = await loadBoardData();
    const board = data.boards.find(b => b.id === boardId);
    if (!board) return { error: 'Board not found' };
    const list = board.lists.find(l => l.id === listId);
    if (!list) return { error: 'List not found' };
    const card = list.cards.find(c => c.id === cardId);
    if (!card) return { error: 'Card not found' };
    if (!card.members) card.members = [];
    if (card.members.some(m => m.name.toLowerCase() === name.toLowerCase())) {
      return { error: 'Member already assigned' };
    }
    const member = { id: randomUUID(), name };
    card.members.push(member);
    await saveBoardData(data);
    return { success: true, memberId: member.id };
  },
};

async function executeTool(name, input) {
  const handler = toolHandlers[name];
  if (!handler) return { error: `Unknown tool: ${name}` };
  try {
    return await handler(input);
  } catch (err) {
    return { error: err.message };
  }
}

// ─── System prompt ──────────────────────────────────────────
const SYSTEM_PROMPT = `You are TaskFlow AI, a smart assistant embedded inside a Kanban board app called TaskFlow.

You can directly modify the user's Kanban board using your tools:
- taskflow_list_boards — List all boards
- taskflow_get_board — Get full board details (lists, cards, members, labels, etc.)
- taskflow_add_list — Create a new list on a board
- taskflow_delete_list — Remove a list
- taskflow_add_card — Create a new card (with optional description, labels, due date, members, checklist)
- taskflow_update_card — Update any card property
- taskflow_delete_card — Remove a card
- taskflow_move_card — Move a card between lists
- taskflow_add_comment — Add a comment to a card
- taskflow_add_checklist_item — Add a checklist item to a card
- taskflow_add_member — Assign a member to a card

IMPORTANT: The board snapshot is provided in the conversation context with IDs inline like [boardId:...], [listId:...], [cardId:...]. Use those IDs directly when calling tools. If you need more details, call taskflow_get_board.

Guidelines:
- Be concise, helpful, and friendly
- Use markdown formatting for readability
- When referring to lists or cards, use their exact names in quotes
- After making board changes, briefly confirm what you did
- If the user asks to create cards with specific details (labels, due dates, members), include all those details
- Available label colors: #ef4444 (red), #f97316 (orange), #f59e0b (yellow), #10b981 (green), #3b82f6 (blue), #8b5cf6 (purple), #ec4899 (pink), #06b6d4 (cyan)`;

// ─── Agentic tool-calling loop ──────────────────────────────
const MAX_TOOL_ROUNDS = 10;

async function runAgentLoop(systemPrompt, userMessage, onText) {
  const messages = [{ role: 'user', content: userMessage }];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: systemPrompt,
      tools: TASKFLOW_TOOLS,
      messages,
    });

    const assistantContent = response.content;
    messages.push({ role: 'assistant', content: assistantContent });

    for (const block of assistantContent) {
      if (block.type === 'text') {
        onText(block.text);
      }
    }

    if (response.stop_reason !== 'tool_use') {
      break;
    }

    const toolResults = [];
    for (const block of assistantContent) {
      if (block.type === 'tool_use') {
        console.log(`[Tool call] ${block.name}(${JSON.stringify(block.input)})`);
        const result = await executeTool(block.name, block.input);
        console.log(`[Tool result] ${JSON.stringify(result).slice(0, 200)}`);
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: JSON.stringify(result),
        });
      }
    }

    messages.push({ role: 'user', content: toolResults });
  }
}

// ─── Chat endpoint ──────────────────────────────────────────
app.post('/api/chat', async (req, res) => {
  const { message, boardContext, history } = req.body;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    const historyContext = (history || [])
      .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`)
      .join('\n');

    const userMessage = [
      boardContext ? `Current board snapshot:\n${boardContext}\n` : '',
      historyContext ? `Conversation so far:\n${historyContext}\n` : '',
      `User request: ${message}`,
    ].join('\n');

    await runAgentLoop(SYSTEM_PROMPT, userMessage, (text) => {
      res.write(`data: ${JSON.stringify({ text })}\n\n`);
    });

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    console.error('Chat error:', err);
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  }
});

// ─── Mind Map generation endpoint ────────────────────────────
app.post('/api/mindmap/generate', async (req, res) => {
  const { topic } = req.body;
  if (!topic) return res.status(400).json({ error: 'Topic required' });

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: `Generate a mind map structure for: "${topic}"

Return ONLY valid JSON (no markdown, no code fences) with this structure:
{
  "text": "Main Topic",
  "children": [
    {
      "text": "Branch Name",
      "children": [
        { "text": "Sub-item", "children": [] }
      ]
    }
  ]
}

Rules:
- 4-6 main branches
- Each branch: 2-4 sub-items
- Sub-items can have 0-2 deeper items
- Keep text concise (2-5 words)
- Make it comprehensive and well-organized
- Return ONLY the JSON object, nothing else`,
      }],
    });

    const text = response.content[0]?.text || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No valid JSON in AI response');
    const mindmap = JSON.parse(jsonMatch[0]);
    res.json(mindmap);
  } catch (err) {
    console.error('Mindmap generation error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Start server ───────────────────────────────────────────
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`TaskFlow AI server running on http://localhost:${PORT}`);
  console.log('Endpoints: /api/chat, /api/mindmap/generate');
});

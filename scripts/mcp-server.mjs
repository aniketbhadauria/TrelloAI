#!/usr/bin/env node
/**
 * TaskFlow MCP Server
 *
 * Exposes all TaskFlow board tools over the Model Context Protocol (stdio).
 * Compatible with Cursor, Claude Desktop, Composio, and any MCP-capable agent.
 *
 * Usage (stdio):
 *   node scripts/mcp-server.mjs
 *
 * Add to .cursor/mcp.json:
 *   {
 *     "mcpServers": {
 *       "taskflow": {
 *         "command": "node",
 *         "args": ["scripts/mcp-server.mjs"],
 *         "cwd": "<absolute-path-to-project>"
 *       }
 *     }
 *   }
 */
import 'dotenv/config';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import {
  makeSupabaseClient,
  makeToolHandlers,
  executeTool,
} from '../src/lib/taskflow-tools.mjs';

// ── Bootstrap ─────────────────────────────────────────────────
const supabase = makeSupabaseClient();
const handlers = makeToolHandlers(supabase);

function ok(result) {
  return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
}

async function run(name, input) {
  const result = await executeTool(handlers, name, input);
  return ok(result);
}

// ── MCP Server ────────────────────────────────────────────────
const server = new McpServer({
  name: 'taskflow',
  version: '1.0.0',
});

// ── 1. List boards ────────────────────────────────────────────
server.tool(
  'taskflow_list_boards',
  'List all active boards with their IDs, titles, list count, and card count.',
  {},
  async () => run('taskflow_list_boards', {}),
);

// ── 2. Get board ──────────────────────────────────────────────
server.tool(
  'taskflow_get_board',
  'Get full details of a specific board by ID, including all lists and cards with their IDs.',
  { boardId: z.string().describe('The board ID') },
  async ({ boardId }) => run('taskflow_get_board', { boardId }),
);

// ── 3. Add list ───────────────────────────────────────────────
server.tool(
  'taskflow_add_list',
  'Add a new list to a board. Returns the new list ID.',
  {
    boardId: z.string().describe('The board ID'),
    title:   z.string().describe('Title for the new list'),
  },
  async ({ boardId, title }) => run('taskflow_add_list', { boardId, title }),
);

// ── 4. Delete list ────────────────────────────────────────────
server.tool(
  'taskflow_delete_list',
  'Delete a list and all its cards from a board.',
  {
    boardId: z.string().describe('The board ID'),
    listId:  z.string().describe('The list ID to delete'),
  },
  async ({ boardId, listId }) => run('taskflow_delete_list', { boardId, listId }),
);

// ── 5. Add card ───────────────────────────────────────────────
server.tool(
  'taskflow_add_card',
  'Add a new card to a list. Supports title, description, labels, dueDate, members, and checklist.',
  {
    boardId:     z.string().describe('The board ID'),
    listId:      z.string().describe('The list ID to add the card to'),
    title:       z.string().describe('Card title'),
    description: z.string().optional().describe('Card description'),
    labels: z.array(z.object({
      text:  z.string(),
      color: z.string().optional().describe('#ef4444 red | #f97316 orange | #f59e0b yellow | #10b981 green | #3b82f6 blue | #8b5cf6 purple | #ec4899 pink | #06b6d4 cyan'),
    })).optional().describe('Label objects'),
    dueDate:  z.string().optional().describe('ISO date string'),
    members:  z.array(z.object({ name: z.string() })).optional().describe('Member objects [{name}]'),
    checklist: z.array(z.object({
      text:      z.string(),
      completed: z.boolean().optional(),
    })).optional().describe('Checklist items'),
  },
  async (input) => run('taskflow_add_card', input),
);

// ── 6. Update card ────────────────────────────────────────────
server.tool(
  'taskflow_update_card',
  "Update a card's properties. Only provided fields are changed.",
  {
    boardId:     z.string().describe('The board ID'),
    listId:      z.string().describe('The list ID containing the card'),
    cardId:      z.string().describe('The card ID to update'),
    title:       z.string().optional().describe('New title'),
    description: z.string().optional().describe('New description'),
    dueDate:     z.string().optional().describe('New due date ISO string, or empty string to clear'),
    labels:    z.array(z.object({ text: z.string(), color: z.string().optional() })).optional(),
    members:   z.array(z.object({ name: z.string() })).optional(),
    checklist: z.array(z.object({ text: z.string(), completed: z.boolean().optional() })).optional(),
  },
  async (input) => run('taskflow_update_card', input),
);

// ── 7. Delete card ────────────────────────────────────────────
server.tool(
  'taskflow_delete_card',
  'Delete a card from a list.',
  {
    boardId: z.string().describe('The board ID'),
    listId:  z.string().describe('The list ID containing the card'),
    cardId:  z.string().describe('The card ID to delete'),
  },
  async ({ boardId, listId, cardId }) => run('taskflow_delete_card', { boardId, listId, cardId }),
);

// ── 8. Move card ──────────────────────────────────────────────
server.tool(
  'taskflow_move_card',
  'Move a card from one list to another, optionally at a specific position.',
  {
    boardId:           z.string().describe('The board ID'),
    sourceListId:      z.string().describe('Current list ID'),
    destinationListId: z.string().describe('Target list ID'),
    cardId:            z.string().describe('The card ID to move'),
    position:          z.number().optional().describe('0-based index in destination list. Omit to append.'),
  },
  async (input) => run('taskflow_move_card', input),
);

// ── 9. Add comment ────────────────────────────────────────────
server.tool(
  'taskflow_add_comment',
  'Add a comment to a card.',
  {
    boardId: z.string().describe('The board ID'),
    listId:  z.string().describe('The list ID containing the card'),
    cardId:  z.string().describe('The card ID'),
    text:    z.string().describe('Comment text'),
    author:  z.string().optional().describe('Author name (defaults to "TaskFlow AI")'),
  },
  async (input) => run('taskflow_add_comment', input),
);

// ── 10. Add checklist item ────────────────────────────────────
server.tool(
  'taskflow_add_checklist_item',
  'Append a checklist item to a card.',
  {
    boardId:   z.string().describe('The board ID'),
    listId:    z.string().describe('The list ID containing the card'),
    cardId:    z.string().describe('The card ID'),
    text:      z.string().describe('Checklist item text'),
    completed: z.boolean().optional().describe('Whether the item is completed (default false)'),
  },
  async (input) => run('taskflow_add_checklist_item', input),
);

// ── 11. Add member ────────────────────────────────────────────
server.tool(
  'taskflow_add_member',
  'Assign a member to a card by name.',
  {
    boardId: z.string().describe('The board ID'),
    listId:  z.string().describe('The list ID containing the card'),
    cardId:  z.string().describe('The card ID'),
    name:    z.string().describe('Member name'),
  },
  async (input) => run('taskflow_add_member', input),
);

// ── Start ─────────────────────────────────────────────────────
const transport = new StdioServerTransport();
await server.connect(transport);

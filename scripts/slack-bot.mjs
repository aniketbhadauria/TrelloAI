/**
 * TaskFlow Slack Bot
 *
 * Connects TaskFlow to Slack using Socket Mode (no public URL required).
 * Handles:
 *   - /taskflow <message>   — slash command from any channel
 *   - @TaskFlow <message>   — mention in any channel the bot is in
 *   - DM to bot             — direct messages
 *
 * Required env vars (add to .env):
 *   SLACK_BOT_TOKEN        xoxb-… (Bot User OAuth Token)
 *   SLACK_APP_TOKEN        xapp-… (App-Level Token with connections:write scope)
 *   SLACK_SIGNING_SECRET   from "Basic Information" in your Slack app settings
 */

import 'dotenv/config';
import { App } from '@slack/bolt';
import Anthropic from '@anthropic-ai/sdk';
import {
  makeSupabaseClient,
  loadBoardData,
  makeToolHandlers,
  runAgentLoop,
} from '../src/lib/taskflow-tools.mjs';

// ── Validate required env vars ────────────────────────────────
const SLACK_BOT_TOKEN      = process.env.SLACK_BOT_TOKEN;
const SLACK_APP_TOKEN      = process.env.SLACK_APP_TOKEN;
const SLACK_SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET;

if (!SLACK_BOT_TOKEN || !SLACK_APP_TOKEN || !SLACK_SIGNING_SECRET) {
  console.error(
    'Missing required Slack env vars.\n' +
    'Set SLACK_BOT_TOKEN, SLACK_APP_TOKEN, and SLACK_SIGNING_SECRET in .env',
  );
  process.exit(1);
}

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('Missing ANTHROPIC_API_KEY in .env');
  process.exit(1);
}

// ── Clients ───────────────────────────────────────────────────
const supabase    = makeSupabaseClient();
const handlers    = makeToolHandlers(supabase);
const anthropic   = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Slack App (Socket Mode) ───────────────────────────────────
const app = new App({
  token:         SLACK_BOT_TOKEN,
  signingSecret: SLACK_SIGNING_SECRET,
  socketMode:    true,
  appToken:      SLACK_APP_TOKEN,
});

// ── Helpers ───────────────────────────────────────────────────

/** Build a compact board snapshot string to give the AI context. */
async function buildBoardSnapshot() {
  try {
    const boardData = await loadBoardData(supabase);
    return boardData.boards
      .filter(b => !b.archived)
      .map(b => {
        const lists = (b.lists || [])
          .map(l => {
            const cards = (l.cards || []).filter(c => !c.archived);
            const cardLines = cards
              .slice(0, 5)
              .map(c => `      • [cardId:${c.id}] ${c.title}`)
              .join('\n');
            return `    [listId:${l.id}] ${l.title} (${cards.length} cards)` +
              (cardLines ? `\n${cardLines}` : '');
          })
          .join('\n');
        return `[boardId:${b.id}] **${b.title}**\n${lists}`;
      })
      .join('\n\n');
  } catch {
    return '';
  }
}

/** Run the AI agent and collect all text output. */
async function askTaskFlowAI(userRequest, slackUsername) {
  const snapshot = await buildBoardSnapshot();
  const fullMessage = [
    snapshot ? `Current boards snapshot:\n${snapshot}\n` : '',
    slackUsername ? `Slack user: @${slackUsername}\n` : '',
    `Request: ${userRequest}`,
  ].filter(Boolean).join('\n');

  const parts = [];
  await runAgentLoop(anthropic, handlers, fullMessage, text => parts.push(text));
  return parts.join('').trim() || '_No response from AI._';
}

/** Convert markdown to Slack mrkdwn and build Block Kit blocks. */
function buildResponseBlocks(responseText, userRequest) {
  // Strip markdown symbols so the response renders as clean plain text
  const mrkdwn = responseText
    .replace(/\*\*(.*?)\*\*/gs, '$1')
    .replace(/__(.*?)__/gs, '$1')
    .replace(/\*(.*?)\*/gs, '$1')
    .replace(/_(.*?)_/gs, '$1')
    .replace(/#{1,3}\s+(.*)/g, '$1');

  // Slack section text max is 3000 chars; split if needed
  const chunks = [];
  let remaining = mrkdwn;
  while (remaining.length > 0) {
    chunks.push(remaining.slice(0, 2900));
    remaining = remaining.slice(2900);
  }

  return [
    ...chunks.map(chunk => ({
      type: 'section',
      text: { type: 'mrkdwn', text: chunk },
    })),
    {
      type: 'divider',
    },
    {
      type: 'context',
      elements: [{
        type: 'mrkdwn',
        text: `:robot_face: *TaskFlow AI* · _"${userRequest.slice(0, 100)}"_`,
      }],
    },
  ];
}

// ── Slash command: /taskflow <message> ────────────────────────
app.command('/taskflow', async ({ command, ack, respond }) => {
  await ack();

  const text = command.text?.trim();
  if (!text) {
    await respond({
      response_type: 'ephemeral',
      text: '`/taskflow <your request>` — e.g. `/taskflow list my boards` or `/taskflow add "Fix login" to the To Do list`',
    });
    return;
  }

  // Acknowledge immediately so Slack doesn't time out (3 s limit)
  await respond({ response_type: 'in_channel', text: ':hourglass_flowing_sand: Working on it…' });

  try {
    const result = await askTaskFlowAI(text, command.user_name);
    await respond({
      replace_original: true,
      response_type: 'in_channel',
      blocks: buildResponseBlocks(result, text),
      text: result,
    });
  } catch (err) {
    console.error('[/taskflow error]', err);
    await respond({ replace_original: true, text: `:warning: Error: ${err.message}` });
  }
});

// ── @mention in a channel ─────────────────────────────────────
app.event('app_mention', async ({ event, say }) => {
  const text = event.text.replace(/<@[A-Z0-9]+>/g, '').trim();
  if (!text) {
    await say('Hi! Ask me to manage your TaskFlow boards. Try: _"list all boards"_ or _"add a card to To Do"_');
    return;
  }

  const thinking = await say(':hourglass_flowing_sand: Working on it…');

  try {
    const result = await askTaskFlowAI(text, event.user);
    await app.client.chat.update({
      channel: thinking.channel,
      ts:      thinking.ts,
      blocks:  buildResponseBlocks(result, text),
      text:    result,
    });
  } catch (err) {
    console.error('[mention error]', err);
    await app.client.chat.update({
      channel: thinking.channel,
      ts:      thinking.ts,
      text:    `:warning: Error: ${err.message}`,
    });
  }
});

// ── Direct message ────────────────────────────────────────────
app.message(async ({ message, say }) => {
  // Only handle DMs; ignore bot messages and non-text events
  if (message.channel_type !== 'im' || message.bot_id || !message.text) return;

  const thinking = await say(':hourglass_flowing_sand: Working on it…');

  try {
    const result = await askTaskFlowAI(message.text, message.user);
    await app.client.chat.update({
      channel: thinking.channel,
      ts:      thinking.ts,
      blocks:  buildResponseBlocks(result, message.text),
      text:    result,
    });
  } catch (err) {
    console.error('[DM error]', err);
    await app.client.chat.update({
      channel: thinking.channel,
      ts:      thinking.ts,
      text:    `:warning: Error: ${err.message}`,
    });
  }
});

// ── Start ─────────────────────────────────────────────────────
(async () => {
  await app.start();
  console.log('✅ TaskFlow Slack bot is running (Socket Mode)');
  console.log('   Commands: /taskflow <message>');
  console.log('   Mention:  @TaskFlow <message>');
  console.log('   DM the bot directly');
})();

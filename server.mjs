import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import {
  makeSupabaseClient,
  loadBoardData,
  makeToolHandlers,
  runAgentLoop,
} from './src/lib/taskflow-tools.mjs';
import { Axiom } from '@axiomhq/js';
import { Logger, AxiomJSTransport, ConsoleTransport } from '@axiomhq/logging';

// ─── Logger ──────────────────────────────────────────────────
const _transports = [new ConsoleTransport({ prettyPrint: process.env.NODE_ENV !== 'production' })];
if (process.env.AXIOM_TOKEN && process.env.AXIOM_DATASET) {
  _transports.unshift(new AxiomJSTransport({
    axiom: new Axiom({ token: process.env.AXIOM_TOKEN }),
    dataset: process.env.AXIOM_DATASET,
  }));
}
const logger = new Logger({ transports: _transports });

// ─── Express setup ───────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.path}`, { ip: req.ip });
  next();
});

// ─── Supabase client (server-side) ──────────────────────────
const supabase = makeSupabaseClient();
const toolHandlers = makeToolHandlers(supabase);

const AI_ENABLED = process.env.AI_ENABLED === 'true';
let anthropic = null;

if (AI_ENABLED) {
  try {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('Missing ANTHROPIC_API_KEY');
    anthropic = new Anthropic({ apiKey });
  } catch (error) {
    logger.error('AI disabled: failed to initialize Anthropic SDK.', { message: error.message });
  }
}

const AI_READY = AI_ENABLED && !!anthropic;

// ─── Chat endpoint (disabled — not needed for Cloudflare Pages deployment) ──
// app.post('/api/chat', async (req, res) => { ... });

// ─── Mind Map generation endpoint (disabled) ─────────────────────────────────
// app.post('/api/mindmap/generate', async (req, res) => { ... });

// ─── Start server ───────────────────────────────────────────
// Railway (and most PaaS) injects PORT; fall back to 3001 for local dev.
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Esperia Trello AI server running on port ${PORT}`);
});

// ─── Slack Bot (Socket Mode) ─────────────────────────────────
// Only starts if all three Slack env vars are present, so the server
// still works fine even without Slack credentials configured.
const SLACK_BOT_TOKEN      = process.env.SLACK_BOT_TOKEN;
const SLACK_APP_TOKEN      = process.env.SLACK_APP_TOKEN;
const SLACK_SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET;

if (SLACK_BOT_TOKEN && SLACK_APP_TOKEN && SLACK_SIGNING_SECRET && AI_READY) {
  try {
    const { App } = await import('@slack/bolt');

    const slackApp = new App({
      token:         SLACK_BOT_TOKEN,
      signingSecret: SLACK_SIGNING_SECRET,
      socketMode:    true,
      appToken:      SLACK_APP_TOKEN,
    });

    async function buildBoardSnapshot() {
      try {
        const boardData = await loadBoardData(supabase);
        return boardData.boards
          .filter(b => !b.archived)
          .map(b => {
            const lists = (b.lists || []).map(l => {
              const cards = (l.cards || []).filter(c => !c.archived);
              const cardLines = cards.slice(0, 5)
                .map(c => `      • [cardId:${c.id}] ${c.title}`)
                .join('\n');
              return `    [listId:${l.id}] ${l.title} (${cards.length} cards)` +
                (cardLines ? `\n${cardLines}` : '');
            }).join('\n');
            return `[boardId:${b.id}] **${b.title}**\n${lists}`;
          })
          .join('\n\n');
      } catch {
        return '';
      }
    }

    async function askTaskFlowAI(userRequest, slackUsername) {
      const snapshot = await buildBoardSnapshot();
      const fullMessage = [
        snapshot ? `Current boards snapshot:\n${snapshot}\n` : '',
        slackUsername ? `Slack user: @${slackUsername}\n` : '',
        `Request: ${userRequest}`,
      ].filter(Boolean).join('\n');
      const parts = [];
      await runAgentLoop(anthropic, toolHandlers, fullMessage, text => parts.push(text));
      return parts.join('').trim() || '_No response from AI._';
    }

    function buildResponseBlocks(responseText, userRequest) {
      const mrkdwn = responseText
        .replace(/\*\*(.*?)\*\*/gs, '$1')
        .replace(/__(.*?)__/gs, '$1')
        .replace(/\*(.*?)\*/gs, '$1')
        .replace(/_(.*?)_/gs, '$1')
        .replace(/#{1,3}\s+(.*)/g, '$1');
      const chunks = [];
      let remaining = mrkdwn;
      while (remaining.length > 0) {
        chunks.push(remaining.slice(0, 2900));
        remaining = remaining.slice(2900);
      }
      return [
        ...chunks.map(chunk => ({ type: 'section', text: { type: 'mrkdwn', text: chunk } })),
        { type: 'divider' },
        { type: 'context', elements: [{ type: 'mrkdwn', text: `:robot_face: *Esperia Trello AI* · _"${userRequest.slice(0, 100)}"_` }] },
      ];
    }

    slackApp.command('/taskflow', async ({ command, ack, respond }) => {
      await ack();
      const text = command.text?.trim();
      if (!text) {
        await respond({ response_type: 'ephemeral', text: '`/taskflow <your request>`' });
        return;
      }
      await respond({ response_type: 'in_channel', text: ':hourglass_flowing_sand: Working on it…' });
      try {
        const result = await askTaskFlowAI(text, command.user_name);
        await respond({ replace_original: true, response_type: 'in_channel', blocks: buildResponseBlocks(result, text), text: result });
      } catch (err) {
        logger.error('Slack /taskflow error', { message: err.message, stack: err.stack });
        await respond({ replace_original: true, text: `:warning: Error: ${err.message}` });
      }
    });

    slackApp.event('app_mention', async ({ event, say }) => {
      const text = event.text.replace(/<@[A-Z0-9]+>/g, '').trim();
      if (!text) { await say('Hi! Try _"list all boards"_ or _"add a card to To Do"_'); return; }
      const thinking = await say(':hourglass_flowing_sand: Working on it…');
      try {
        const result = await askTaskFlowAI(text, event.user);
        await slackApp.client.chat.update({ channel: thinking.channel, ts: thinking.ts, blocks: buildResponseBlocks(result, text), text: result });
      } catch (err) {
        logger.error('Slack mention error', { message: err.message, stack: err.stack });
        await slackApp.client.chat.update({ channel: thinking.channel, ts: thinking.ts, text: `:warning: Error: ${err.message}` });
      }
    });

    slackApp.message(async ({ message, say }) => {
      if (message.channel_type !== 'im' || message.bot_id || !message.text) return;
      const thinking = await say(':hourglass_flowing_sand: Working on it…');
      try {
        const result = await askTaskFlowAI(message.text, message.user);
        await slackApp.client.chat.update({ channel: thinking.channel, ts: thinking.ts, blocks: buildResponseBlocks(result, message.text), text: result });
      } catch (err) {
        logger.error('Slack DM error', { message: err.message, stack: err.stack });
        await slackApp.client.chat.update({ channel: thinking.channel, ts: thinking.ts, text: `:warning: Error: ${err.message}` });
      }
    });

    await slackApp.start();
    console.log('✅ Esperia Trello Slack bot running (Socket Mode) — /taskflow, @mention, DM');
  } catch (err) {
    logger.error('Slack bot failed to start', { message: err.message });
  }
} else if (SLACK_BOT_TOKEN || SLACK_APP_TOKEN || SLACK_SIGNING_SECRET) {
  console.warn('Slack bot skipped: missing one or more SLACK_* env vars, or AI not ready.');
}

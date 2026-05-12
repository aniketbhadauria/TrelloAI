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

// ─── Chat endpoint ──────────────────────────────────────────
app.post('/api/chat', async (req, res) => {
  if (!AI_READY) {
    return res.status(503).json({
      error: AI_ENABLED
        ? 'AI chat is unavailable: Anthropic SDK failed to initialize. Check @anthropic-ai/sdk and ANTHROPIC_API_KEY.'
        : 'AI chat is disabled. Set AI_ENABLED=true and configure Anthropic SDK to enable /api/chat.',
    });
  }

  const { message, boardContext, history, currentBoardId } = req.body;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    const historyContext = (history || [])
      .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`)
      .join('\n');

    const userMessage = [
      currentBoardId ? `Active board: [boardId:${currentBoardId}] — default all card/list operations to this board unless the user clearly targets another one.\n` : '',
      boardContext ? `Current board snapshot:\n${boardContext}\n` : '',
      historyContext ? `Conversation so far:\n${historyContext}\n` : '',
      `User request: ${message}`,
    ].join('\n');

    await runAgentLoop(anthropic, toolHandlers, userMessage, (text) => {
      res.write(`data: ${JSON.stringify({ text })}\n\n`);
    });

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    logger.error('Chat error', { message: err.message, stack: err.stack });

    // Classify known error shapes so the UI can render them nicely.
    const status = err?.status || err?.response?.status;
    const headers = err?.headers || {};
    const isRateLimit =
      status === 429 ||
      err?.name === 'RateLimitError' ||
      err?.error?.error?.type === 'rate_limit_error';

    let payload;
    if (isRateLimit) {
      const retryAfterSec = Number(headers['retry-after']) || null;
      const tokensResetAt = headers['anthropic-ratelimit-input-tokens-reset'] || null;
      const requestsResetAt = headers['anthropic-ratelimit-requests-reset'] || null;
      const limit = headers['anthropic-ratelimit-input-tokens-limit'] || null;
      payload = {
        error: 'Rate limit reached for the AI provider.',
        code: 'rate_limit',
        retryAfter: retryAfterSec,
        resetAt: tokensResetAt || requestsResetAt || null,
        limit,
      };
    } else {
      payload = { error: err.message || 'Unknown AI error.' };
    }

    res.write(`data: ${JSON.stringify(payload)}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  }
});

// ─── Mind Map generation endpoint ────────────────────────────
app.post('/api/mindmap/generate', async (req, res) => {
  if (!AI_READY) {
    return res.status(503).json({
      error: AI_ENABLED
        ? 'AI mindmap is unavailable: Anthropic SDK failed to initialize. Check @anthropic-ai/sdk and ANTHROPIC_API_KEY.'
        : 'AI mindmap is disabled. Set AI_ENABLED=true and configure Anthropic SDK to enable /api/mindmap/generate.',
    });
  }

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
    logger.error('Mindmap generation error', { message: err.message, stack: err.stack });
    res.status(500).json({ error: err.message });
  }
});

// ─── Start server ───────────────────────────────────────────
// Railway (and most PaaS) injects PORT; fall back to 3001 for local dev.
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`TaskFlow AI server running on port ${PORT}`);
  console.log('Endpoints: /api/chat, /api/mindmap/generate');
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
        { type: 'context', elements: [{ type: 'mrkdwn', text: `:robot_face: *TaskFlow AI* · _"${userRequest.slice(0, 100)}"_` }] },
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
    console.log('✅ TaskFlow Slack bot running (Socket Mode) — /taskflow, @mention, DM');
  } catch (err) {
    logger.error('Slack bot failed to start', { message: err.message });
  }
} else if (SLACK_BOT_TOKEN || SLACK_APP_TOKEN || SLACK_SIGNING_SECRET) {
  console.warn('Slack bot skipped: missing one or more SLACK_* env vars, or AI not ready.');
}

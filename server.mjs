import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import {
  makeSupabaseClient,
  makeToolHandlers,
  runAgentLoop,
} from './src/lib/taskflow-tools.mjs';

// ─── Express setup ───────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

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
    console.error('AI disabled: failed to initialize Anthropic SDK.', error.message);
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
    console.error('Chat error:', err);

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
    console.error('Mindmap generation error:', err);
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

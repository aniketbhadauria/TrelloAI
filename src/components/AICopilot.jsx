/* eslint-disable react/prop-types */
import { useState, useRef, useEffect, useCallback, useId, useMemo } from 'react';
import { useLocation, matchPath } from 'react-router-dom';
import { BrainCog, X, Sparkles, RotateCcw, Loader2, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PromptInputBox } from './ui/ai-prompt-box';
import { streamChat } from '../lib/composio';
import { useBoards } from '../context/BoardContext';

const GLOBAL_PROMPTS = [
  '✅ What should I work on next?',
  '🔥 Who is overloaded with tasks?',
  '⚠️ What tasks are overdue?',
  '🎯 Which tasks are blocked?',
];

const BOARD_PROMPTS = [
  '➕ Add a card "Fix login bug" to the To Do list',
  '✏️ Rename the first card in In Progress',
  '🗑️ Delete the card titled "…"',
  '📋 What cards are in this board?',
];

const TYPING_DOTS = ['dot-1', 'dot-2', 'dot-3'];

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1 px-1">
      {TYPING_DOTS.map((id, i) => (
        <span
          key={id}
          className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s`, animationDuration: '0.8s' }}
        />
      ))}
    </span>
  );
}

function renderInline(text, keyPrefix) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    const k = `${keyPrefix}-p${i}`;
    if (part.startsWith('**') && part.endsWith('**'))
      return <strong key={k} className="font-semibold text-white">{part.slice(2, -2)}</strong>;
    if (part.startsWith('*') && part.endsWith('*'))
      return <em key={k} className="italic">{part.slice(1, -1)}</em>;
    if (part.startsWith('`') && part.endsWith('`'))
      return <code key={k} className="px-1 py-0.5 rounded bg-white/10 text-violet-300 text-xs font-mono">{part.slice(1, -1)}</code>;
    return part;
  });
}

function MarkdownContent({ text }) {
  const baseId = useId();
  const lines = text.split('\n');
  const elements = [];
  let bulletBuffer = [];
  let key = 0;

  const flushBullets = () => {
    if (!bulletBuffer.length) return;
    const ulKey = `${baseId}-ul-${key++}`;
    elements.push(
      <ul key={ulKey} className="space-y-0.5 my-1.5 pl-3">
        {bulletBuffer.map((item, i) => {
          const liKey = `${ulKey}-li-${i}`;
          return (
            <li key={liKey} className="flex gap-2 text-gray-300 text-sm leading-relaxed">
              <span className="text-gray-500 shrink-0 mt-0.5">•</span>
              <span>{renderInline(item, liKey)}</span>
            </li>
          );
        })}
      </ul>
    );
    bulletBuffer = [];
  };

  for (const line of lines) {
    const h3 = line.match(/^###\s+(.*)/);
    const h2 = line.match(/^##\s+(.*)/);
    const h1 = line.match(/^#\s+(.*)/);
    const bullet = line.match(/^[-*]\s+(.*)/);
    const hr = line.match(/^---+$/);
    const k = `${baseId}-${key++}`;

    if (h3) {
      flushBullets();
      elements.push(<p key={k} className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-3 mb-1">{renderInline(h3[1], k)}</p>);
    } else if (h2) {
      flushBullets();
      elements.push(<p key={k} className="text-sm font-bold text-gray-200 mt-3 mb-1">{renderInline(h2[1], k)}</p>);
    } else if (h1) {
      flushBullets();
      elements.push(<p key={k} className="text-base font-bold text-white mt-2 mb-1">{renderInline(h1[1], k)}</p>);
    } else if (bullet) {
      bulletBuffer.push(bullet[1]);
    } else if (hr) {
      flushBullets();
      elements.push(<hr key={k} className="border-white/10 my-2" />);
    } else if (line.trim() === '') {
      flushBullets();
      elements.push(<div key={k} className="h-1.5" />);
    } else {
      flushBullets();
      elements.push(<p key={k} className="text-sm text-gray-200 leading-relaxed">{renderInline(line, k)}</p>);
    }
  }
  flushBullets();

  return <div className="space-y-0.5">{elements}</div>;
}

function formatCountdown(seconds) {
  if (seconds <= 0) return 'now';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${String(s).padStart(2, '0')}s`;
}

function RateLimitNotice({ retryAfter, resetAt, limit }) {
  const targetTs = useMemo(() => {
    if (resetAt) {
      const t = new Date(resetAt).getTime();
      if (Number.isFinite(t)) return t;
    }
    if (retryAfter) return Date.now() + retryAfter * 1000;
    return null;
  }, [resetAt, retryAfter]);

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!targetTs) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [targetTs]);

  const remaining = targetTs ? Math.max(0, Math.round((targetTs - now) / 1000)) : null;

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 text-amber-400 shrink-0" />
        <p className="text-sm font-semibold text-amber-200">AI rate limit reached</p>
      </div>
      <p className="text-xs text-amber-100/80 leading-relaxed">
        The AI provider&apos;s per-minute token budget is used up
        {limit ? ` (${limit} input tokens/min)` : ''}. Your message couldn&apos;t be processed.
      </p>
      {remaining !== null && (
        <p className="text-xs text-amber-300 font-medium">
          {remaining > 0
            ? <>Try again in <span className="font-mono">{formatCountdown(remaining)}</span>.</>
            : <>You can try again now.</>}
        </p>
      )}
      <p className="text-[10px] text-amber-200/60 leading-relaxed">
        Tip: open the AI on a specific board so less context is sent, or wait for the window to reset.
      </p>
    </div>
  );
}

function MessageContent({ isUser, text, meta }) {
  if (isUser) return <p className="text-sm">{text}</p>;
  if (meta?.rateLimit) {
    return (
      <div className="space-y-2">
        <RateLimitNotice
          retryAfter={meta.rateLimit.retryAfter}
          resetAt={meta.rateLimit.resetAt}
          limit={meta.rateLimit.limit}
        />
        {text && <MarkdownContent text={text} />}
      </div>
    );
  }
  return <MarkdownContent text={text} />;
}

function MessageBubble({ msg, isStreaming }) {
  const isUser = msg.role === 'user';
  const hasRateLimit = !!msg.meta?.rateLimit;
  return (
    <div className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-linear-to-br from-violet-500 to-pink-500 flex items-center justify-center shrink-0 mt-0.5">
          <BrainCog className="w-3.5 h-3.5 text-white" />
        </div>
      )}
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
          isUser
            ? 'bg-linear-to-br from-violet-600 to-pink-600 text-white rounded-br-sm'
            : 'bg-[#2A2D31] text-gray-200 border border-[#3A3D42] rounded-bl-sm'
        }`}
      >
        {(msg.text || hasRateLimit) && (
          <MessageContent isUser={isUser} text={msg.text} meta={msg.meta} />
        )}
        {!msg.text && !hasRateLimit && isStreaming && <TypingDots />}
      </div>
    </div>
  );
}

function HeaderStatus({ isLoading, boardsCount, activeBoardTitle }) {
  if (isLoading) {
    return (
      <span className="flex items-center gap-1 text-violet-400">
        <Loader2 className="w-2.5 h-2.5 animate-spin" /> Thinking…
      </span>
    );
  }
  if (activeBoardTitle) {
    return <span>On <span className="text-gray-300">{activeBoardTitle}</span></span>;
  }
  const suffix = boardsCount === 1 ? '' : 's';
  return <span>{`${boardsCount} board${suffix} in context`}</span>;
}

export default function AICopilot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const { boards, persistBoardsNow, refreshBoards } = useBoards();
  const location = useLocation();
  const messagesEndRef = useRef(null);
  const abortRef = useRef(false);

  // Detect the current board from the URL so the AI knows what "this board" means.
  const currentBoardId = useMemo(() => {
    const m = matchPath('/boards/:boardId', location.pathname);
    return m?.params?.boardId || null;
  }, [location.pathname]);

  const activeBoard = useMemo(
    () => (currentBoardId ? boards.find((b) => b.id === currentBoardId) : null),
    [boards, currentBoardId],
  );

  const quickPrompts = currentBoardId ? BOARD_PROMPTS : GLOBAL_PROMPTS;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const handleSend = useCallback(async (text) => {
    if (!text?.trim() || isLoading) return;

    const history = messages.map((m) => ({ role: m.role, text: m.text }));
    const userMsg = { role: 'user', text: text.trim(), id: `u-${Date.now()}-${Math.random()}` };
    const aiMsg = { role: 'assistant', text: '', id: `a-${Date.now()}-${Math.random()}` };

    setMessages((prev) => [...prev, userMsg, aiMsg]);
    setIsLoading(true);
    abortRef.current = false;

    // Flush any pending local edits so the AI server reads the latest board state
    // from Supabase before running its tools. Ignore failures — the AI will still run.
    try {
      await persistBoardsNow();
    } catch (err) {
      console.warn('Could not flush local changes before AI request:', err);
    }

    let accumulated = '';

    await streamChat(
      text.trim(),
      boards,
      history,
      (chunk) => {
        if (abortRef.current) return;
        accumulated += chunk;
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated.at(-1);
          updated[updated.length - 1] = { ...last, text: accumulated };
          return updated;
        });
      },
      async () => {
        // After the AI finishes, pull the latest board state in case the realtime
        // event was missed or delayed.
        try { await refreshBoards(); } catch { /* noop */ }
        setIsLoading(false);
      },
      (err, payload) => {
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated.at(-1);
          if (payload?.code === 'rate_limit') {
            updated[updated.length - 1] = {
              ...last,
              text: '',
              meta: {
                rateLimit: {
                  retryAfter: payload.retryAfter,
                  resetAt: payload.resetAt,
                  limit: payload.limit,
                },
              },
            };
          } else {
            updated[updated.length - 1] = {
              ...last,
              text: `Sorry, I ran into an error: ${err}\n\nMake sure the TaskFlow AI server is running (\`npm run server\`).`,
            };
          }
          return updated;
        });
        setIsLoading(false);
      },
      { currentBoardId },
    );
  }, [boards, isLoading, messages, currentBoardId, persistBoardsNow, refreshBoards]);

  const handleReset = () => {
    abortRef.current = true;
    setMessages([]);
    setIsLoading(false);
  };

  return (
    <>
      {/* Floating button */}
      <AnimatePresence>
        {!open && (
          <motion.button
            key="fab"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-linear-to-br from-violet-500 to-pink-500 flex items-center justify-center shadow-xl shadow-violet-500/30 cursor-pointer"
            aria-label="Open AI Copilot"
          >
            <BrainCog className="w-6 h-6 text-white" />
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-green-400 rounded-full border-2 border-white animate-pulse" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Panel + backdrop */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]"
              onClick={() => setOpen(false)}
            />

            {/* Chat panel */}
            <motion.div
              key="panel"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-[420px] bg-[#1A1C1F] border-l border-[#2E3033] flex flex-col shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#2E3033] shrink-0">
                <div className="w-8 h-8 rounded-full bg-linear-to-br from-violet-500 to-pink-500 flex items-center justify-center shrink-0">
                  <BrainCog className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white leading-tight">TaskFlow AI</p>
                  <p className="text-[10px] text-gray-500 leading-tight">
                    <HeaderStatus
                      isLoading={isLoading}
                      boardsCount={boards.length}
                      activeBoardTitle={activeBoard?.title}
                    />
                  </p>
                </div>
                {messages.length > 0 && (
                  <button
                    type="button"
                    onClick={handleReset}
                    className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-colors"
                    title="New chat"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-colors"
                  aria-label="Close AI Copilot"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
                {messages.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="h-full flex flex-col"
                  >
                    {/* Hero */}
                    <div className="text-center py-8 px-4">
                      <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-violet-500/20 to-pink-500/20 border border-violet-500/20 flex items-center justify-center mx-auto mb-4">
                        <Sparkles className="w-8 h-8 text-violet-400" />
                      </div>
                      <p className="text-gray-100 font-semibold text-base">How can I help?</p>
                      <p className="text-gray-500 text-xs mt-1.5 leading-relaxed">
                        {activeBoard
                          ? <>I can add, edit, delete, and move cards<br />on <span className="text-gray-300">{activeBoard.title}</span>.</>
                          : <>I can read your boards, create cards,<br />move tasks, and tell you what to do next.</>}
                      </p>
                    </div>

                    {/* Quick prompts */}
                    <div className="space-y-2">
                      {quickPrompts.map((prompt) => (
                        <button
                          key={prompt}
                          type="button"
                          onClick={() => handleSend(prompt)}
                          className="w-full text-left px-3.5 py-2.5 rounded-xl border border-[#2E3033] bg-[#22252A] hover:bg-[#2A2D32] hover:border-[#444] text-sm text-gray-300 transition-all duration-150"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                ) : (
                  messages.map((msg, i) => (
                    <MessageBubble
                      key={msg.id}
                      msg={msg}
                      isStreaming={isLoading && i === messages.length - 1 && msg.role === 'assistant'}
                    />
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-3 border-t border-[#2E3033] shrink-0">
                <PromptInputBox
                  onSend={handleSend}
                  isLoading={isLoading}
                  placeholder="Ask about your project…"
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

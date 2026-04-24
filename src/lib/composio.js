const API_URL = 'http://localhost:3001';

// Hard cap so we never blow the LLM's input rate limit. Trim the description
// and only keep a few cards per list in the full-detail serialization; the
// AI can always call taskflow_get_board for the rest.
const MAX_DESC_CHARS = 160;
const MAX_CARDS_PER_LIST = 25;

function serializeCard(c) {
  let info = `  - [cardId:${c.id}] "${c.title}"`;
  if (c.description) {
    const desc = c.description.length > MAX_DESC_CHARS
      ? `${c.description.slice(0, MAX_DESC_CHARS)}…`
      : c.description;
    info += ` (desc: ${desc})`;
  }
  if (c.labels?.length) info += ` [labels: ${c.labels.map(l => l.text).join(', ')}]`;
  if (c.dueDate) info += ` [due: ${c.dueDate}]`;
  if (c.members?.length) info += ` [members: ${c.members.map(m => m.name).join(', ')}]`;
  const cl = c.checklist || [];
  if (cl.length) info += ` [checklist: ${cl.filter(i => i.completed).length}/${cl.length}]`;
  if (c.comments?.length) info += ` [comments: ${c.comments.length}]`;
  return info;
}

function serializeBoardFull(board) {
  if (!board) return '';
  const lists = board.lists || [];
  const listsDescription = lists.map((list) => {
    const cards = list.cards || [];
    const shown = cards.slice(0, MAX_CARDS_PER_LIST).map(serializeCard).join('\n') || '  (no cards)';
    const truncated = cards.length > MAX_CARDS_PER_LIST
      ? `\n  … and ${cards.length - MAX_CARDS_PER_LIST} more — call taskflow_get_board for the rest`
      : '';
    return `List [listId:${list.id}]: "${list.title}" (${cards.length} cards)\n${shown}${truncated}`;
  }).join('\n\n');

  return `Board [boardId:${board.id}]: "${board.title}"\nLists: ${lists.length}\nCards: ${lists.reduce((s, l) => s + (l.cards?.length || 0), 0)}\n\n${listsDescription}`;
}

function serializeBoardIndex(board) {
  const listNames = (board.lists || []).map(l => `"${l.title}"`).join(', ');
  const cardCount = board.lists?.reduce((s, l) => s + (l.cards?.length || 0), 0) || 0;
  return `• [boardId:${board.id}] "${board.title}" — ${board.lists?.length || 0} lists, ${cardCount} cards — Lists: ${listNames}`;
}

function buildContext(boards, currentBoardId) {
  if (!boards) return '';
  const arr = Array.isArray(boards) ? boards : [boards];
  if (!arr.length) return '';

  const active = currentBoardId ? arr.find(b => b.id === currentBoardId) : null;
  const others = arr.filter(b => b.id !== active?.id);

  if (active) {
    const activePart = `ACTIVE BOARD (full detail):\n${serializeBoardFull(active)}`;
    const indexPart = others.length
      ? `\n\n---\n\nOTHER BOARDS (summary — call taskflow_get_board to inspect):\n${others.map(serializeBoardIndex).join('\n')}`
      : '';
    return activePart + indexPart;
  }

  // No active board — if only one, send it in full. Otherwise send an index
  // so we stay under the input-token budget.
  if (arr.length === 1) return serializeBoardFull(arr[0]);
  return `BOARDS INDEX (call taskflow_get_board to inspect any of these):\n${arr.map(serializeBoardIndex).join('\n')}`;
}

export async function streamChat(message, board, history, onChunk, onDone, onError, options = {}) {
  const { currentBoardId = null } = options;
  const boardContext = buildContext(board, currentBoardId);

  try {
    const res = await fetch(`${API_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, boardContext, history, currentBoardId }),
    });

    if (!res.ok) throw new Error(`Server error: ${res.status}`);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') {
          onDone?.();
          return;
        }
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) {
            onError?.(parsed.error, parsed);
            return;
          }
          if (parsed.text) {
            onChunk?.(parsed.text);
          }
        } catch {
          // skip malformed chunks
        }
      }
    }
    onDone?.();
  } catch (err) {
    onError?.(err.message, null);
  }
}

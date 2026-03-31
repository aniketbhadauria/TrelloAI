const API_URL = 'http://localhost:3001';

function serializeBoard(board) {
  if (!board) return '';

  const listsDescription = board.lists.map((list) => {
    const cards = list.cards?.length
      ? list.cards.map((c) => {
          let info = `  - [cardId:${c.id}] "${c.title}"`;
          if (c.description) info += ` (desc: ${c.description})`;
          if (c.labels?.length) info += ` [labels: ${c.labels.map(l => l.text).join(', ')}]`;
          if (c.dueDate) info += ` [due: ${c.dueDate}]`;
          if (c.members?.length) info += ` [members: ${c.members.map(m => m.name).join(', ')}]`;
          const cl = c.checklist || [];
          if (cl.length) info += ` [checklist: ${cl.filter(i => i.completed).length}/${cl.length}]`;
          if (c.comments?.length) info += ` [comments: ${c.comments.length}]`;
          return info;
        }).join('\n')
      : '  (no cards)';
    return `List [listId:${list.id}]: "${list.title}" (${list.cards?.length || 0} cards)\n${cards}`;
  }).join('\n\n');

  return `Board [boardId:${board.id}]: "${board.title}"\nLists: ${board.lists.length}\nCards: ${board.lists.reduce((s, l) => s + (l.cards?.length || 0), 0)}\n\n${listsDescription}`;
}

export async function streamChat(message, board, history, onChunk, onDone, onError) {
  const boardContext = serializeBoard(board);

  try {
    const res = await fetch(`${API_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, boardContext, history }),
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
            onError?.(parsed.error);
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
    onError?.(err.message);
  }
}

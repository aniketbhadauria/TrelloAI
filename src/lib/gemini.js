import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

function serializeBoard(board) {
  if (!board) return 'No board data available.';

  const listsDescription = board.lists.map((list) => {
    const cards = list.cards?.length
      ? list.cards.map((c) => {
          let info = `  - "${c.title}"`;
          if (c.description) info += ` (description: ${c.description})`;
          if (c.labels?.length) info += ` [labels: ${c.labels.join(', ')}]`;
          if (c.dueDate) info += ` [due: ${c.dueDate}]`;
          return info;
        }).join('\n')
      : '  (no cards)';
    return `List: "${list.title}" (${list.cards?.length || 0} cards)\n${cards}`;
  }).join('\n\n');

  return `Board: "${board.title}"\nTotal lists: ${board.lists.length}\nTotal cards: ${board.lists.reduce((sum, l) => sum + (l.cards?.length || 0), 0)}\n\n${listsDescription}`;
}

const SYSTEM_PROMPT = `You are TaskFlow AI, a smart assistant embedded inside a Kanban board app. You have access to the current board's data and can help users with:

- Summarizing the board state
- Suggesting task priorities and next steps
- Answering questions about what's on the board
- Helping organize, categorize, or break down tasks
- Providing productivity tips based on the board's structure
- Writing card descriptions, checklists, or acceptance criteria

Be concise, helpful, and friendly. Use markdown formatting for better readability. When referring to lists or cards, use their exact names in quotes.`;

export async function streamGeminiResponse(userMessage, board, history = []) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });

  const boardContext = serializeBoard(board);

  const chatHistory = history.map((msg) => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.text }],
  }));

  const chat = model.startChat({
    history: [
      { role: 'user', parts: [{ text: `${SYSTEM_PROMPT}\n\nHere is the current board state:\n\n${boardContext}` }] },
      { role: 'model', parts: [{ text: 'I have the board context loaded. How can I help you with your TaskFlow board?' }] },
      ...chatHistory,
    ],
  });

  const result = await chat.sendMessageStream(userMessage);
  return result.stream;
}

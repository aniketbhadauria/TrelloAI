import { Link } from 'react-router-dom';
import { WorkflowBuilderCard } from './ui/workflow-builder-card';

function timeAgo(dateStr) {
  const now = new Date();
  const past = new Date(dateStr);
  const diffMs = now - past;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export default function BoardCard({ board }) {
  const totalCards = board.lists.reduce((acc, l) => acc + l.cards.length, 0);
  const listNames = board.lists.map(l => l.title).slice(0, 3);

  return (
    <Link to={`/boards/${board.id}`} className="block relative">
      <WorkflowBuilderCard
        imageUrl={resolveBoardImageUrl(board.backgroundImage)}
        gradientClass={board.gradient}
        status="Active"
        lastUpdated={timeAgo(board.createdAt)}
        title={board.title}
        description={`${board.lists.length} ${board.lists.length === 1 ? 'list' : 'lists'} · ${totalCards} ${totalCards === 1 ? 'card' : 'cards'}`}
        tags={listNames}
      />
    </Link>
  );
}

function resolveBoardImageUrl(imageUrl) {
  if (!imageUrl) return null;
  if (imageUrl.startsWith('file:///')) {
    if (imageUrl.toLowerCase().includes('emerson')) return '/emerson.jpg';
    if (imageUrl.toLowerCase().includes('chatgpt') || imageUrl.toLowerCase().includes('esperia')) return '/esperia.png';
    return null;
  }
  return imageUrl;
}

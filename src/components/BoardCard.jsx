import { Link } from 'react-router-dom';
import { Star, List, CreditCard } from 'lucide-react';
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

  const users = [
    { src: 'https://images.unsplash.com/photo-1599566150163-29194dcabd9c?w=80&h=80&fit=crop&crop=face', fallback: 'U1' },
    { src: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&crop=face', fallback: 'U2' },
    { src: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face', fallback: 'U3' },
  ];

  const actions = [
    { Icon: List, bgColor: 'bg-pink-500' },
    { Icon: CreditCard, bgColor: 'bg-purple-500' },
    ...(board.starred ? [{ Icon: Star, bgColor: 'bg-yellow-500' }] : []),
  ];

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
        users={users}
        actions={actions}
      />
    </Link>
  );
}

function resolveBoardImageUrl(imageUrl) {
  if (!imageUrl) return null;
  if (imageUrl.startsWith('file:///')) {
    if (imageUrl.toLowerCase().includes('emerson')) return '/emerson.png';
    if (imageUrl.toLowerCase().includes('chatgpt') || imageUrl.toLowerCase().includes('esperia')) return '/esperia.png';
    return null;
  }
  return imageUrl;
}

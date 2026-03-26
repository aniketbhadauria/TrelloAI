import { Link } from 'react-router-dom';
import { Star, Trash2, List, CreditCard, Zap } from 'lucide-react';
import { useBoards } from '../context/BoardContext';
import { useState } from 'react';
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
  const { toggleStarBoard, deleteBoard } = useBoards();
  const [showMenu, setShowMenu] = useState(false);

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
        gradientClass={board.gradient}
        status="Active"
        lastUpdated={timeAgo(board.createdAt)}
        title={board.title}
        description={`${board.lists.length} ${board.lists.length === 1 ? 'list' : 'lists'} · ${totalCards} ${totalCards === 1 ? 'card' : 'cards'}`}
        tags={listNames}
        users={users}
        actions={actions}
        onMoreClick={() => setShowMenu(!showMenu)}
        menuContent={
          showMenu && (
            <div
              className="absolute top-full right-3 mt-1 bg-white/95 backdrop-blur-lg border border-pink-100 rounded-xl shadow-xl shadow-pink-500/10 p-1 z-50 min-w-[140px] animate-slide-down"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
            >
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleStarBoard(board.id); setShowMenu(false); }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-muted-foreground hover:bg-pink-50 rounded-lg transition-colors cursor-pointer"
              >
                <Star className={`w-4 h-4 ${board.starred ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                {board.starred ? 'Unstar' : 'Star'} board
              </button>
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); deleteBoard(board.id); }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                Delete board
              </button>
            </div>
          )
        }
      />
    </Link>
  );
}

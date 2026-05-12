import { Link } from 'react-router-dom';
import { WorkflowBuilderCard } from '@/components/ui/workflow-builder-card';
import { timeAgo } from '@/utils/date';
import { resolveBoardImageUrl } from '@/utils/board';
import type { Board } from '@/types/board';

interface BoardCardProps {
  board: Board;
  sharedBy?: string | null;
}

export default function BoardCard({ board, sharedBy }: BoardCardProps) {
  const totalCards = board.lists.reduce((acc, l) => acc + l.cards.length, 0);
  const listNames = board.lists.map(l => l.title).slice(0, 3);

  return (
    <Link to={`/boards/${board.id}`} className="block relative">
      <WorkflowBuilderCard
        imageUrl={resolveBoardImageUrl(board.backgroundImage)}
        gradientClass={board.gradient}
        status="Active"
        lastUpdated={sharedBy ? `Shared by ${sharedBy}` : timeAgo(board.createdAt)}
        title={board.title}
        description={`${board.lists.length} ${board.lists.length === 1 ? 'list' : 'lists'} · ${totalCards} ${totalCards === 1 ? 'card' : 'cards'}`}
        tags={listNames}
      />
    </Link>
  );
}

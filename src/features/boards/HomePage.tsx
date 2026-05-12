import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBoards } from '@/context/BoardContext';
import BoardCard from './BoardCard';
import CreateBoardModal from './CreateBoardModal';
import { Star, Plus, Users } from 'lucide-react';

export default function Home() {
  const { boards, boardsLoading } = useBoards();
  const [showCreate, setShowCreate] = useState(false);

  const navigate = useNavigate();

  if (boardsLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-56px)]">
        <div className="w-8 h-8 border-3 border-pink-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const starredBoards = boards.filter(
    (b) => b.starred && b.memberRole === 'owner',
  );
  const ownedBoards = boards
    .filter((b) => b.memberRole === 'owner')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const sharedBoards = boards
    .filter((b) => b.memberRole !== 'owner')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto page-enter pb-32">
      <div className="mb-10 pt-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
              Your{' '}
              <span className="bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 bg-clip-text text-transparent">
                Workspace
              </span>
            </h1>
            <p className="text-muted-foreground text-base text-9xl-line-height">
              Organize, manage, and track your projects with ease.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/collaborators')}
            className="inline-flex items-center gap-2 rounded-lg border border-border/60 px-3 py-2 text-sm font-medium hover:bg-secondary/50 transition-colors"
          >
            <Users className="w-4 h-4" />
            Collaborators
          </button>
        </div>
      </div>

      {starredBoards.length > 0 && (
        <section className="mb-10">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-yellow-400 to-orange-400 flex items-center justify-center">
              <Star className="w-3.5 h-3.5 text-white fill-white" />
            </div>
            <h2 className="text-lg font-semibold tracking-tight">
              Starred Boards
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {starredBoards.map((board) => (
              <BoardCard key={board.id} board={board} />
            ))}
          </div>
        </section>
      )}

      <section className="mb-10">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-7 h-7 rounded-lg overflow-hidden">
            <img
              src="/esperia.png"
              alt="Esperia logo"
              className="w-full h-full object-cover"
            />
          </div>
          <h2 className="text-lg font-semibold tracking-tight">Your Boards</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {ownedBoards.map((board) => (
            <BoardCard key={board.id} board={board} />
          ))}
          <button
            onClick={() => setShowCreate(true)}
            className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-pink-200/80 text-muted-foreground hover:text-pink-600 hover:border-pink-400/60 hover:bg-pink-50/30 transition-all duration-300 cursor-pointer group min-h-[200px] sm:min-h-[210px]"
          >
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-100 to-purple-100 group-hover:from-pink-200 group-hover:to-purple-200 flex items-center justify-center transition-colors mb-2">
              <Plus className="w-6 h-6 group-hover:scale-110 transition-transform" />
            </div>
            <span className="text-sm font-semibold">Create new board</span>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Start a fresh project
            </p>
          </button>
        </div>
      </section>

      {sharedBoards.length > 0 && (
        <section>
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
              <Users className="w-3.5 h-3.5 text-white" />
            </div>
            <h2 className="text-lg font-semibold tracking-tight">
              Shared with You
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {sharedBoards.map((board) => (
              <BoardCard
                key={board.id}
                board={board}
                sharedBy={board.ownerName}
              />
            ))}
          </div>
        </section>
      )}

      {showCreate && <CreateBoardModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}

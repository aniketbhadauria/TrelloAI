import { useState } from 'react';
import { useBoards } from '../context/BoardContext';
import BoardCard from '../components/BoardCard';
import CreateBoardModal from '../components/CreateBoardModal';
import MacOSDock from '../components/ui/mac-os-dock';
import { Star, Plus, LayoutGrid } from 'lucide-react';

const dockApps = [
  { id: 'finder', name: 'Finder', icon: 'https://cdn.jim-nielsen.com/macos/1024/finder-2021-09-10.png?rf=1024' },
  { id: 'calculator', name: 'Calculator', icon: 'https://cdn.jim-nielsen.com/macos/1024/calculator-2021-04-29.png?rf=1024' },
  { id: 'terminal', name: 'Terminal', icon: 'https://cdn.jim-nielsen.com/macos/1024/terminal-2021-06-03.png?rf=1024' },
  { id: 'mail', name: 'Mail', icon: 'https://cdn.jim-nielsen.com/macos/1024/mail-2021-05-25.png?rf=1024' },
  { id: 'notes', name: 'Notes', icon: 'https://cdn.jim-nielsen.com/macos/1024/notes-2021-05-25.png?rf=1024' },
  { id: 'safari', name: 'Safari', icon: 'https://cdn.jim-nielsen.com/macos/1024/safari-2021-06-02.png?rf=1024' },
  { id: 'photos', name: 'Photos', icon: 'https://cdn.jim-nielsen.com/macos/1024/photos-2021-05-28.png?rf=1024' },
  { id: 'music', name: 'Music', icon: 'https://cdn.jim-nielsen.com/macos/1024/music-2021-05-25.png?rf=1024' },
  { id: 'calendar', name: 'Calendar', icon: 'https://cdn.jim-nielsen.com/macos/1024/calendar-2021-04-29.png?rf=1024' },
];

export default function Home() {
  const { boards, boardsLoading } = useBoards();
  const [showCreate, setShowCreate] = useState(false);
  const [openApps, setOpenApps] = useState(['finder', 'safari']);

  const handleDockAppClick = (appId) => {
    if (appId === 'calendar') {
      window.open('https://calendar.google.com', '_blank');
      return;
    }
    setOpenApps(prev =>
      prev.includes(appId) ? prev.filter(id => id !== appId) : [...prev, appId]
    );
  };

  if (boardsLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-56px)]">
        <div className="w-8 h-8 border-3 border-pink-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const starredBoards = boards.filter(b => b.starred);
  const allBoards = [...boards].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto page-enter pb-32">
      <div className="mb-10 pt-4">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
          Your{' '}
          <span className="bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 bg-clip-text text-transparent">
            Workspace
          </span>
        </h1>
        <p className="text-muted-foreground text-base">Organize, manage, and track your projects with ease.</p>
      </div>

      {starredBoards.length > 0 && (
        <section className="mb-10">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-yellow-400 to-orange-400 flex items-center justify-center">
              <Star className="w-3.5 h-3.5 text-white fill-white" />
            </div>
            <h2 className="text-lg font-semibold tracking-tight">Starred Boards</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {starredBoards.map(board => (
              <BoardCard key={board.id} board={board} />
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-pink-400 to-purple-400 flex items-center justify-center">
            <LayoutGrid className="w-3.5 h-3.5 text-white" />
          </div>
          <h2 className="text-lg font-semibold tracking-tight">All Boards</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {allBoards.map(board => (
            <BoardCard key={board.id} board={board} />
          ))}
          <button
            onClick={() => setShowCreate(true)}
            className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-pink-200/80 text-muted-foreground hover:text-pink-600 hover:border-pink-400/60 hover:bg-pink-50/30 transition-all duration-300 cursor-pointer group min-h-[280px]"
          >
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-100 to-purple-100 group-hover:from-pink-200 group-hover:to-purple-200 flex items-center justify-center transition-colors mb-3">
              <Plus className="w-7 h-7 group-hover:scale-110 transition-transform" />
            </div>
            <span className="text-sm font-semibold">Create new board</span>
            <p className="text-xs text-muted-foreground/60 mt-1">Start a fresh project</p>
          </button>
        </div>
      </section>

      {showCreate && <CreateBoardModal onClose={() => setShowCreate(false)} />}

      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
        <MacOSDock
          apps={dockApps}
          onAppClick={handleDockAppClick}
          openApps={openApps}
        />
      </div>
    </div>
  );
}

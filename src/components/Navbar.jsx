import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Search } from 'lucide-react';
import { Input } from './ui/input';

export default function Navbar() {
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <nav className="h-14 border-b border-border/40 bg-background/60 backdrop-blur-xl flex items-center px-5 gap-4 sticky top-0 z-40">
      <Link to="/" className="flex items-center gap-2.5 font-semibold text-lg">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-400 via-pink-500 to-purple-500 flex items-center justify-center shadow-md shadow-pink-500/20">
          <LayoutDashboard className="w-4 h-4 text-white" />
        </div>
        <span className="bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 bg-clip-text text-transparent font-bold tracking-tight">
          TaskFlow
        </span>
      </Link>

      <div className="flex-1 max-w-sm mx-auto">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
          <Input
            placeholder="Search boards..."
            className="pl-9 bg-white/50 border-border/40 h-9 text-sm rounded-xl placeholder:text-muted-foreground/50 focus:bg-white/80 transition-colors"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Link
          to="/"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
            isHome
              ? 'bg-gradient-to-r from-pink-500/10 to-purple-500/10 text-pink-600'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          Boards
        </Link>
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 via-pink-500 to-purple-500 flex items-center justify-center text-white text-sm font-semibold shadow-md shadow-pink-500/20">
          U
        </div>
      </div>
    </nav>
  );
}

import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Search, LogOut } from 'lucide-react';
import { Input } from './ui/input';
import { useAuth } from '@/context/AuthContext';

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { session, signOut } = useAuth();
  const isBoards = location.pathname === '/boards';
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const email = session?.user?.email ?? '';
  const initials = email ? email[0].toUpperCase() : '?';

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    setMenuOpen(false);
    await signOut();
    navigate('/', { replace: true });
  };

  return (
    <nav className="h-14 border-b border-border/40 bg-background/60 backdrop-blur-xl flex items-center px-5 gap-4 sticky top-0 z-40">
      <Link to="/" className="flex items-center gap-2.5 font-semibold text-lg">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-400 via-pink-500 to-purple-500 flex items-center justify-center shadow-md shadow-pink-500/20">
          <LayoutDashboard className="w-4 h-4 text-white" />
        </div>
        <span className="bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 bg-clip-text text-transparent font-bold tracking-tight">
          Esperia Trello
        </span>
      </Link>

      <div className="flex-1 max-w-sm mx-auto">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
          <Input
            type="text"
            placeholder="Search boards..."
            className="pl-9 bg-white/50 border-border/40 h-9 text-sm rounded-xl placeholder:text-muted-foreground/50 focus:bg-white/80 transition-colors"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        {session && (
          <Link
            to="/boards"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
              isBoards
                ? 'bg-gradient-to-r from-pink-500/10 to-purple-500/10 text-pink-600'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Boards
          </Link>
        )}

        {session ? (
          <div ref={menuRef} className="relative">
            <button
              onClick={() => setMenuOpen(o => !o)}
              className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 via-pink-500 to-purple-500 flex items-center justify-center text-white text-sm font-semibold shadow-md shadow-pink-500/20 hover:opacity-90 transition-opacity"
            >
              {initials}
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-10 w-52 bg-popover border border-border rounded-xl shadow-lg py-1 animate-slide-down">
                <div className="px-3 py-2 text-xs text-muted-foreground truncate border-b border-border/60 mb-1">
                  {email}
                </div>
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-secondary/60 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link
            to="/login"
            className="px-3 py-1.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all"
          >
            Sign in
          </Link>
        )}
      </div>
    </nav>
  );
}

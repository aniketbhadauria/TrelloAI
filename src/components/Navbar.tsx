import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Search, LogOut, UserCog, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useProfile } from '@/context/ProfileContext';
import { useBoards } from '@/context/BoardContext';
import { LogoMark } from '@/components/Logo';

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { session, signOut } = useAuth();
  const { profile } = useProfile();
  const { boards } = useBoards();
  const isBoards = location.pathname === '/boards';

  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const email = session?.user?.email ?? '';
  const displayName = profile?.display_name ?? profile?.first_name ?? email.split('@')[0];
  const initials = (profile?.first_name?.[0] ?? email[0] ?? '?').toUpperCase();
  const avatarUrl = profile?.avatar_url;

  const searchResults = searchQuery.trim().length > 0
    ? boards.filter(b => b.title.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 6)
    : [];

  // Close menus on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
        setSearchQuery('');
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

  function handleSearchKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { setSearchOpen(false); setSearchQuery(''); }
    if (e.key === 'Enter' && searchResults.length > 0) {
      navigate(`/boards/${searchResults[0].id}`);
      setSearchOpen(false);
      setSearchQuery('');
    }
  }

  return (
    <nav className="h-14 border-b border-border/40 bg-background/60 backdrop-blur-xl flex items-center px-5 gap-4 sticky top-0 z-40">
      <Link to="/" className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
          <LogoMark className="w-4 h-4 text-primary-foreground" />
        </div>
        <span className="font-semibold text-foreground tracking-tight">Trello</span>
      </Link>

      {/* Search */}
      <div className="flex-1 max-w-sm mx-auto" ref={searchRef}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setSearchOpen(true); }}
            onFocus={() => setSearchOpen(true)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Search boards..."
            className="w-full pl-9 pr-8 h-9 text-sm rounded-xl bg-secondary/50 border border-border/40 placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:bg-background transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => { setSearchQuery(''); setSearchOpen(false); }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {searchOpen && searchQuery.trim().length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-popover border border-border rounded-xl shadow-lg overflow-hidden animate-slide-down z-50">
              {searchResults.length > 0 ? (
                searchResults.map(board => (
                  <button
                    key={board.id}
                    onClick={() => { navigate(`/boards/${board.id}`); setSearchOpen(false); setSearchQuery(''); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-secondary/60 transition-colors"
                  >
                    <div className="w-6 h-6 rounded-md shrink-0" style={{ backgroundColor: board.backgroundImage ? undefined : `var(--color-${board.gradient}, #475569)` }}>
                      {board.backgroundImage
                        ? <div className="w-full h-full rounded-md bg-cover bg-center" style={{ backgroundImage: `url('${board.backgroundImage}')` }} />
                        : null}
                    </div>
                    <span className="text-sm truncate">{board.title}</span>
                  </button>
                ))
              ) : (
                <div className="px-3 py-3 text-sm text-muted-foreground text-center">No boards found</div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {session && (
          <Link
            to="/boards"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              isBoards
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
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
              className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity overflow-hidden"
              aria-label="Account menu"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                initials
              )}
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-10 w-56 bg-popover border border-border rounded-xl shadow-lg py-1 animate-slide-down">
                <div className="px-3 py-2.5 border-b border-border/60 mb-1">
                  <p className="text-xs font-semibold text-foreground truncate">{displayName}</p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{email}</p>
                </div>
                <button
                  onClick={() => { setMenuOpen(false); navigate('/profile'); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-secondary/60 transition-colors"
                >
                  <UserCog className="w-4 h-4" />
                  Edit profile
                </button>
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

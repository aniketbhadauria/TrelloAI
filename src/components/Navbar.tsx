import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useBoards } from '@/context/board/BoardContext'
import { LogoMark } from '@/components/Logo'
import SearchBar from './navbar/SearchBar'
import NotificationDropdown from './navbar/NotificationDropdown'
import UserMenu from './navbar/UserMenu'

export default function Navbar() {
  const location = useLocation()
  const { session } = useAuth()
  const { boards } = useBoards()
  const isBoards = location.pathname === '/boards'

  return (
    <nav className="h-14 border-b border-border/40 bg-background/60 backdrop-blur-xl flex items-center px-5 gap-4 sticky top-0 z-40">
      <Link to="/" className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
          <LogoMark className="w-4 h-4 text-primary-foreground" />
        </div>
        <span className="font-semibold text-foreground tracking-tight">Trello</span>
      </Link>

      {/* Search */}
      <SearchBar boards={boards} />

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
          <>
            <NotificationDropdown />
            <UserMenu />
          </>
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
  )
}

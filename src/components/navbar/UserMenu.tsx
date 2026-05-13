import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, UserCog } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useProfile } from '@/context/ProfileContext'
import { useOutsideClick } from '@/hooks/useOutsideClick'

export default function UserMenu() {
  const navigate = useNavigate()
  const { session, signOut } = useAuth()
  const { profile } = useProfile()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useOutsideClick(ref, () => setOpen(false), open)

  const email = session?.user?.email ?? ''
  const initials = (profile?.first_name?.[0] ?? email[0] ?? '?').toUpperCase()
  const avatarUrl = profile?.avatar_url

  const handleSignOut = async () => {
    setOpen(false)
    await signOut()
    navigate('/', { replace: true })
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity overflow-hidden"
        aria-label="Account menu"
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={profile?.first_name ?? ''}
            className="w-full h-full object-cover"
          />
        ) : (
          initials
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-56 bg-popover backdrop-blur-xl border border-border/40 rounded-2xl shadow-2xl overflow-hidden animate-slide-down z-50">
          <div className="px-4 py-3 border-b border-border/30 mb-1 bg-secondary/10">
            <p className="text-sm font-semibold text-foreground truncate capitalize">
              {profile?.first_name ?? ''} {profile?.last_name ?? ''}
            </p>
            <p className="text-[11px] text-muted-foreground truncate mt-0.5">{email}</p>
          </div>
          <div className="py-1">
            <button
              onClick={() => {
                setOpen(false)
                navigate('/profile')
              }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-secondary/60 transition-colors"
            >
              <UserCog className="w-4 h-4 text-muted-foreground" />
              Edit profile
            </button>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Clock, MessageSquare, CheckCircle2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useNotifications } from '@/context/NotificationContext'
import { useBoards } from '@/context/board/BoardContext'
import { generateBoardKey } from '@/utils/board'
import { useOutsideClick } from '@/hooks/useOutsideClick'

export default function NotificationDropdown() {
  const navigate = useNavigate()
  const { boards } = useBoards()
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useOutsideClick(ref, () => setOpen(false), open)

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all relative ${
          open
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:text-foreground hover:bg-secondary/80'
        }`}
      >
        <Bell className="w-4.5 h-4.5" />
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full border-2 border-background" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-80 bg-popover backdrop-blur-xl border border-border/40 rounded-2xl shadow-2xl overflow-hidden animate-slide-down z-50">
          <div className="px-4 py-3 border-b border-border/30 flex items-center justify-between bg-secondary/10">
            <span className="text-sm font-semibold">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsRead()}
                className="text-[11px] font-medium text-primary hover:underline"
              >
                Mark all as read
              </button>
            )}
          </div>
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length > 0 ? (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => {
                    markAsRead(n.id)
                    if (n.board_id) {
                      const board = boards.find((b) => b.id === n.board_id)
                      if (board) {
                        const slug = board.key || generateBoardKey(board.title)
                        if (n.card_id) {
                          let cardNum: number | undefined
                          for (const l of board.lists) {
                            const c = l.cards.find((cc) => cc.id === n.card_id)
                            if (c) {
                              cardNum = c.number
                              break
                            }
                          }
                          navigate(`/boards/${slug}${cardNum ? `/${cardNum}` : ''}`)
                        } else {
                          navigate(`/boards/${slug}`)
                        }
                      }
                    }
                    setOpen(false)
                  }}
                  className={`w-full text-left px-4 py-3 border-b border-border/20 last:border-0 hover:bg-secondary/40 transition-colors relative ${
                    !n.read ? 'bg-primary/5' : ''
                  }`}
                >
                  {!n.read && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />}
                  <div className="flex gap-3">
                    <div
                      className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center ${
                        !n.read
                          ? 'bg-primary/20 text-primary'
                          : 'bg-secondary text-muted-foreground'
                      }`}
                    >
                      {n.title.includes('commented') ? (
                        <MessageSquare className="w-4 h-4" />
                      ) : (
                        <Clock className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate leading-tight">{n.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.body}</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1.5 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <div className="px-4 py-10 text-center">
                <CheckCircle2 className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">All caught up!</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

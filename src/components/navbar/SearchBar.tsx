import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X } from 'lucide-react'
import type { Board } from '@/types/board'
import { generateBoardKey } from '@/utils/board'
import { useOutsideClick } from '@/hooks/useOutsideClick'

interface SearchBarProps {
  boards: Board[]
}

export default function SearchBar({ boards }: SearchBarProps) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useOutsideClick(
    ref,
    () => {
      setOpen(false)
      setQuery('')
    },
    open
  )

  const results =
    query.trim().length > 0
      ? boards.filter((b) => b.title.toLowerCase().includes(query.toLowerCase())).slice(0, 6)
      : []

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      setOpen(false)
      setQuery('')
    }
    if (e.key === 'Enter' && results.length > 0) {
      navigate(`/boards/${results[0].key || generateBoardKey(results[0].title)}`)
      setOpen(false)
      setQuery('')
    }
  }

  return (
    <div className="flex-1 max-w-sm mx-auto" ref={ref}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search boards..."
          className="w-full pl-9 pr-8 h-9 text-sm rounded-xl bg-secondary/50 border border-border/40 placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:bg-background transition-colors"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('')
              setOpen(false)
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        {open && query.trim().length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1.5 bg-popover border border-border rounded-xl shadow-lg overflow-hidden animate-slide-down z-50">
            {results.length > 0 ? (
              results.map((board) => (
                <button
                  key={board.id}
                  onClick={() => {
                    navigate(`/boards/${board.key || generateBoardKey(board.title)}`)
                    setOpen(false)
                    setQuery('')
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-secondary/60 transition-colors"
                >
                  <div
                    className="w-6 h-6 rounded-md shrink-0"
                    style={{
                      backgroundColor: board.backgroundImage
                        ? undefined
                        : `var(--color-${board.gradient}, #475569)`,
                    }}
                  >
                    {board.backgroundImage ? (
                      <div
                        className="w-full h-full rounded-md bg-cover bg-center"
                        style={{ backgroundImage: `url('${board.backgroundImage}')` }}
                      />
                    ) : null}
                  </div>
                  <span className="text-sm truncate">{board.title}</span>
                </button>
              ))
            ) : (
              <div className="px-3 py-3 text-sm text-muted-foreground text-center">
                No boards found
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

import { Image as ImageIcon, Trash2 } from 'lucide-react'
import type { BoardRole } from '@/types/board'

interface BoardMenuPanelProps {
  role: BoardRole | null
  onBackgroundPicker: () => void
  onArchive: () => void
  onClose: () => void
}

export default function BoardMenuPanel({
  role,
  onBackgroundPicker,
  onArchive,
  onClose,
}: BoardMenuPanelProps) {
  return (
    <div className="absolute top-full right-0 mt-1 bg-popover backdrop-blur-xl border border-border/40 rounded-xl shadow-2xl p-1.5 z-50 min-w-[220px] animate-slide-down">
      <button
        onClick={() => {
          onBackgroundPicker()
          onClose()
        }}
        className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-foreground hover:bg-secondary/60 rounded-lg transition-colors"
      >
        <ImageIcon className="w-4 h-4" />
        Change background
      </button>
      {role === 'owner' && (
        <button
          onClick={() => {
            onArchive()
            onClose()
          }}
          className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          Archive board
        </button>
      )}
    </div>
  )
}

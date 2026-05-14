import { useState } from 'react'
import { useBoards } from '@/context/BoardContext'
import {
  Archive,
  RotateCcw,
  Trash2,
  LayoutGrid,
  CreditCard,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { timeAgo } from '@/utils/date'

interface ConfirmButtonProps {
  label: string
  icon: React.ComponentType<{ className?: string }>
  onConfirm: () => void
  variant?: 'danger' | 'primary'
}

function ConfirmButton({ label, icon: Icon, onConfirm, variant = 'danger' }: ConfirmButtonProps) {
  const [confirming, setConfirming] = useState(false)

  if (confirming) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground">Sure?</span>
        <button
          onClick={() => {
            onConfirm()
            setConfirming(false)
          }}
          className="px-2 py-1 rounded text-xs font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
        >
          Yes
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="px-2 py-1 rounded text-xs font-medium bg-secondary hover:bg-secondary/80 transition-colors"
        >
          No
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors',
        variant === 'danger'
          ? 'text-destructive hover:bg-destructive/10'
          : 'text-primary hover:bg-primary/10'
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  )
}

function ArchivedBoardCard({
  board,
  onRestore,
  onDelete,
}: {
  board: {
    id: string
    title: string
    lists?: { cards?: unknown[] }[]
    gradient?: string
    archivedAt?: string | null
  }
  onRestore: () => void
  onDelete: () => void
}) {
  const totalCards = board.lists?.reduce((s, l) => s + (l.cards?.length ?? 0), 0) ?? 0

  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-card px-4 py-3 hover:border-border transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={cn(
            'w-10 h-10 rounded-lg shrink-0',
            board.gradient || 'bg-linear-to-br from-pink-400 to-purple-500'
          )}
        />
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{board.title}</p>
          <p className="text-xs text-muted-foreground">
            {board.lists?.length ?? 0} lists · {totalCards} cards · archived{' '}
            {timeAgo(board.archivedAt)}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <ConfirmButton label="Restore" icon={RotateCcw} onConfirm={onRestore} variant="primary" />
        <ConfirmButton label="Delete" icon={Trash2} onConfirm={onDelete} variant="danger" />
      </div>
    </div>
  )
}

function ArchivedCardRow({
  card,
  onRestore,
  onDelete,
}: {
  card: {
    id: string
    title?: string
    boardTitle?: string
    listTitle?: string
    archivedAt?: string | null
  }
  onRestore: () => void
  onDelete: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-card px-4 py-3 hover:border-border transition-colors">
      <div className="min-w-0">
        <p className="text-sm font-semibold truncate">{card.title || 'Untitled card'}</p>
        <p className="text-xs text-muted-foreground">
          {card.boardTitle} › {card.listTitle} · archived {timeAgo(card.archivedAt)}
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <ConfirmButton label="Restore" icon={RotateCcw} onConfirm={onRestore} variant="primary" />
        <ConfirmButton label="Delete" icon={Trash2} onConfirm={onDelete} variant="danger" />
      </div>
    </div>
  )
}

interface SectionProps {
  title: string
  icon: React.ComponentType<{ className?: string }>
  count: number
  children?: React.ReactNode
  emptyMessage: string
}

function Section({ title, icon: Icon, count, children, emptyMessage }: SectionProps) {
  const [open, setOpen] = useState(true)

  return (
    <section className="mb-8">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2.5 mb-4 w-full text-left group"
      >
        <div className="w-7 h-7 rounded-lg bg-linear-to-br from-orange-400 to-pink-500 flex items-center justify-center shrink-0">
          <Icon className="w-3.5 h-3.5 text-white" />
        </div>
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        <span className="ml-1 text-xs text-muted-foreground bg-secondary rounded-full px-2 py-0.5">
          {count}
        </span>
        <span className="ml-auto text-muted-foreground group-hover:text-foreground transition-colors">
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </span>
      </button>
      {open &&
        (count === 0 ? (
          <p className="text-sm text-muted-foreground pl-1">{emptyMessage}</p>
        ) : (
          <div className="flex flex-col gap-2">{children}</div>
        ))}
    </section>
  )
}

export default function ArchivePage() {
  const {
    archivedBoards,
    archivedCards,
    restoreBoard,
    restoreCard,
    deleteBoardPermanently,
    deleteCardPermanently,
  } = useBoards()

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto page-enter">
      <div className="mb-10 pt-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-linear-to-br from-orange-500 via-pink-500 to-purple-500 flex items-center justify-center">
            <Archive className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Archive</h1>
        </div>
        <p className="text-muted-foreground text-base pl-1">
          Archived items are hidden from your workspace but not permanently deleted.
        </p>
      </div>

      <Section
        title="Archived Boards"
        icon={LayoutGrid}
        count={archivedBoards.length}
        emptyMessage="No archived boards."
      >
        {archivedBoards.map((board) => (
          <ArchivedBoardCard
            key={board.id}
            board={board}
            onRestore={() => restoreBoard(board.id)}
            onDelete={() => deleteBoardPermanently(board.id)}
          />
        ))}
      </Section>

      <Section
        title="Archived Cards"
        icon={CreditCard}
        count={archivedCards.length}
        emptyMessage="No archived cards."
      >
        {archivedCards.map((card) => (
          <ArchivedCardRow
            key={card.id}
            card={card}
            onRestore={() => restoreCard(card.boardId, card.listId, card.id)}
            onDelete={() => deleteCardPermanently(card.boardId, card.listId, card.id)}
          />
        ))}
      </Section>
    </div>
  )
}

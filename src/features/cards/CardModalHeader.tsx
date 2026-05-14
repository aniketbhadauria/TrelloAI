import { useState } from 'react'
import { Link2, Check, X } from 'lucide-react'
import { format } from 'date-fns'
import { useCardContext } from '@/context/CardContext'

interface CardModalHeaderProps {
  title: string
  onTitleChange: (value: string) => void
  onTitleBlur: () => void
  onClose: () => void
}

export default function CardModalHeader({
  title,
  onTitleChange,
  onTitleBlur,
  onClose,
}: CardModalHeaderProps) {
  const { card, board, boardId, listTitle } = useCardContext()
  const [copied, setCopied] = useState(false)

  const cardRef = card.number
    ? board.key
      ? `${board.key}-${card.number}`
      : `#${card.number}`
    : null
  const boardSlug = board.key ?? boardId
  const shareUrl = card.number
    ? `${window.location.origin}/boards/${boardSlug}/${card.number}`
    : null

  const handleCopyLink = async () => {
    if (!shareUrl) return
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-border/30 shrink-0">
      <div className="flex-1 mr-4">
        {cardRef && (
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-mono font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded">
              {cardRef}
            </span>
            {shareUrl && (
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                title="Copy shareable link"
              >
                {copied ? (
                  <Check className="w-3 h-3 text-green-500" />
                ) : (
                  <Link2 className="w-3 h-3" />
                )}
                <span>{copied ? 'Copied!' : 'Copy link'}</span>
              </button>
            )}
          </div>
        )}
        <input
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          onBlur={onTitleBlur}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          className="w-full text-lg font-semibold bg-transparent border-none outline-none focus:bg-secondary/30 rounded px-1 py-0.5 -ml-1 transition-colors"
        />
        <div className="flex items-center gap-2 mt-1">
          <p className="text-xs text-muted-foreground">
            in list <span className="font-medium text-foreground/80">{listTitle}</span>
          </p>
          {card.creatorName && (
            <>
              <span className="text-muted-foreground/30 text-[10px]">•</span>
              <p className="text-xs text-muted-foreground">
                Created by{' '}
                <span className="font-medium text-foreground/80">{card.creatorName}</span>
              </p>
            </>
          )}
          <span className="text-muted-foreground/30 text-[10px]">•</span>
          <p className="text-xs text-muted-foreground">
            on{' '}
            <span className="font-medium text-foreground/80">
              {format(new Date(card.createdAt), 'MMM d, yyyy')}
            </span>
          </p>
        </div>
      </div>
      <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
        <X className="w-5 h-5" />
      </button>
    </div>
  )
}

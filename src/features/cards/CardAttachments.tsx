import { useRef, useState } from 'react'
import { Paperclip, X, ExternalLink, Plus } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { v4 as uuidv4 } from 'uuid'
import { useCardContext } from '@/context/CardContext'

function sanitizeUrl(url: string | undefined): string | null {
  if (!url || typeof url !== 'string') return null
  try {
    const trimmed = url.trim()
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      // Allow local blobs or data urls or relative?
      // For now just check if it parses.
    }
    const parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`)
    return parsed.toString()
  } catch {
    return null
  }
}

export default function CardAttachments() {
  const { card, updateCard, activeSection, setActiveSection } = useCardContext()
  const attachments = card.attachments ?? []
  const showForm = activeSection === 'attachment'

  const onAdd = showForm
    ? (url: string, name: string) => {
        updateCard({
          attachments: [
            ...attachments,
            { id: uuidv4(), url, name: name || url, addedAt: new Date().toISOString() },
          ],
        })
        setActiveSection(null)
      }
    : undefined

  const onRemove = (attachmentId: string) =>
    updateCard({ attachments: attachments.filter((a) => a.id !== attachmentId) })

  const containerRef = useRef<HTMLDivElement>(null)
  const [url, setUrl] = useState('')
  const [name, setName] = useState('')

  const handleAdd = () => {
    if (!url.trim()) return
    onAdd?.(url.trim(), name.trim())
    setUrl('')
    setName('')
  }

  return (
    <div ref={containerRef} className="mb-4 space-y-3">
      {onAdd && (
        <div className="bg-secondary/20 p-4 rounded-xl border border-border/30 space-y-3 animate-slide-down">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">
              Link URL
            </label>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste any link here…"
              className="bg-background/50 text-sm h-9"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">
              Display Name (optional)
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Give it a name…"
              className="bg-background/50 text-sm h-9"
            />
          </div>
          <div className="flex justify-end pt-1">
            <Button
              size="sm"
              onClick={handleAdd}
              disabled={!url.trim()}
              className="h-8 text-xs px-4"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Attach
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        {attachments.map((attachment) => {
          const safeUrl = sanitizeUrl(attachment.url)
          return (
            <div
              key={attachment.id}
              className="group flex items-center gap-3 text-xs rounded-xl bg-secondary/30 px-3 py-2 border border-transparent hover:border-border/40 hover:bg-secondary/40 transition-all"
            >
              <div className="w-8 h-8 rounded-lg bg-background/50 flex items-center justify-center shrink-0 shadow-sm border border-border/20">
                <Paperclip className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                {safeUrl ? (
                  <a
                    href={safeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-primary hover:underline flex items-center gap-1.5"
                  >
                    <span className="truncate">{attachment.name || safeUrl}</span>
                    <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                  </a>
                ) : (
                  <span className="font-semibold truncate block">
                    {attachment.name || attachment.fileName || attachment.url}
                  </span>
                )}
                <span className="text-[10px] text-muted-foreground block mt-0.5">
                  Added {new Date(attachment.addedAt).toLocaleDateString()}
                </span>
              </div>
              <button
                onClick={() => onRemove(attachment.id)}
                className="opacity-0 group-hover:opacity-100 p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all shrink-0"
                title="Remove attachment"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

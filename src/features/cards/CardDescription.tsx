import { useRef, useState } from 'react'
import { AlignLeft } from 'lucide-react'
import type { JSONContent } from '@tiptap/core'
import { Button } from '@/components/ui/button'
import RichTextEditor, { type RichTextEditorRef } from './RichTextEditor'
import { parseDescription, extractMentions, diffMentions } from './activityUtils'
import { apiInsertActivity, sendNotification } from '@/api'
import { useCardContext } from '@/context/CardContext'
import { renderTiptapHTML } from '@/utils/tiptap'

export default function CardDescription() {
  const { card, board, boardId, cardId, boardMembers, actorEmail, actorName, updateCard } =
    useCardContext()
  const description = card.description
  const boardTitle = board.title
  const onSave = (descriptionJson: string) => updateCard({ description: descriptionJson })

  const [editing, setEditing] = useState(false)
  const editorRef = useRef<RichTextEditorRef>(null)
  const prevMentionsRef = useRef<Array<{ id: string; label: string }>>([])

  const currentContent = parseDescription(description)

  const handleClickArea = () => {
    prevMentionsRef.current = extractMentions(currentContent)
    setEditing(true)
  }

  const handleSave = async () => {
    const content = editorRef.current?.getContent()
    if (!content) return

    onSave(JSON.stringify(content))
    setEditing(false)

    void apiInsertActivity({ boardId, cardId, actorEmail, actorName, type: 'description_updated' })

    const newMentions = diffMentions(prevMentionsRef.current, extractMentions(content))
    for (const mention of newMentions) {
      const member = boardMembers.find((m) => m.userId === mention.id)
      if (member?.email && member.email !== actorEmail) {
        void sendNotification({
          userEmail: member.email,
          title: `@mention — ${boardTitle}`,
          body: `${actorName} mentioned you in a card description`,
          boardId,
          cardId,
        })
      }
    }
  }

  const handleCancel = () => {
    editorRef.current?.resetContent(currentContent)
    setEditing(false)
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <AlignLeft className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium">Description</span>
      </div>
      {editing ? (
        <div className="space-y-2">
          <RichTextEditor
            ref={editorRef}
            content={currentContent}
            placeholder="Add a more detailed description..."
            members={boardMembers}
            autoFocus
            showHeadings
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave}>
              Save
            </Button>
            <Button size="sm" variant="ghost" onClick={handleCancel}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleClickArea}
          className="w-full text-left min-h-20 rounded-xl p-4 text-sm cursor-pointer transition-colors bg-white hover:bg-gray-50 border border-border/40"
        >
          {description ? (
            <div
              className="tiptap-render"
              dangerouslySetInnerHTML={{ __html: renderTiptapHTML(currentContent) }}
            />
          ) : (
            <span className="text-gray-500">Add a more detailed description...</span>
          )}
        </button>
      )}
    </div>
  )
}

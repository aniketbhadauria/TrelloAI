import { useRef, useState } from 'react'
import { AlignLeft } from 'lucide-react'
import { generateHTML } from '@tiptap/html'
import StarterKit from '@tiptap/starter-kit'
import Mention from '@tiptap/extension-mention'
import type { JSONContent } from '@tiptap/core'
import { Button } from '@/components/ui/button'
import RichTextEditor, { type RichTextEditorRef } from './RichTextEditor'
import type { MentionMember } from './MentionList'
import { parseDescription, extractMentions, diffMentions } from './activityUtils'
import { apiInsertActivity } from '@/api'
import { sendNotification } from '@/context/NotificationContext'

interface CardDescriptionProps {
  description: string
  boardId: string
  cardId: string
  boardTitle: string
  actorEmail: string
  actorName: string
  boardMembers: MentionMember[]
  onSave: (descriptionJson: string) => void
}

function renderToHTML(content: JSONContent): string {
  return generateHTML(content, [
    StarterKit,
    Mention.configure({ HTMLAttributes: { class: 'mention' } }),
  ])
}

export default function CardDescription({
  description,
  boardId,
  cardId,
  boardTitle,
  actorEmail,
  actorName,
  boardMembers,
  onSave,
}: CardDescriptionProps) {
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
          className="w-full text-left min-h-[80px] rounded-xl p-4 text-sm cursor-pointer transition-colors bg-white hover:bg-gray-50 border border-border/40"
        >
          {description ? (
            <div
              className="tiptap-render"
              dangerouslySetInnerHTML={{ __html: renderToHTML(currentContent) }}
            />
          ) : (
            <span className="text-gray-500">Add a more detailed description...</span>
          )}
        </button>
      )}
    </div>
  )
}

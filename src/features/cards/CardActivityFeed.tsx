import { useState, useRef, useEffect } from 'react'
import { MessageSquare, Send } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/AuthContext'
import RichTextEditor, { type RichTextEditorRef } from './RichTextEditor'
import type { JSONContent } from '@tiptap/core'
import { renderTiptapHTML } from '@/utils/tiptap'
import {
  useCardCommentsQuery,
  useCardActivityQuery,
  useCommentsCache,
  apiAddComment,
  apiDeleteComment,
  apiInsertActivity,
  activityKey,
} from '@/api'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import {
  extractPlainText,
  formatActivityMessage,
  extractMentions,
  diffMentions,
} from './activityUtils'
import { sendNotification } from '@/api'
import { logError } from '@/lib/logger'
import ConfirmModal from '@/components/modals/ConfirmModal'
import { getAvatarColor } from '@/utils/user'
import { formatCommentTime } from '@/utils/date'
import type { BoardMember, CardComment, ActivityEntry } from '@/types/board'
import { useCardContext } from '@/context/CardContext'

export default function CardActivityFeed() {
  const {
    boardId,
    cardId,
    card,
    board,
    boardMembers,
    actorEmail,
    actorName,
    actorAvatar,
    notifyAssignedMembers,
  } = useCardContext()
  const cardMembers = card.members ?? []
  const cardTitle = card.title
  const boardTitle = board.title

  const { user } = useAuth()
  const commentEditorRef = useRef<RichTextEditorRef>(null)
  const { data: cardComments = [], isLoading: commentsLoading } = useCardCommentsQuery(
    boardId,
    cardId
  )
  const { data: cardActivity = [], isLoading: activityLoading } = useCardActivityQuery(
    boardId,
    cardId
  )
  const commentsCache = useCommentsCache(boardId, cardId)
  const qc = useQueryClient()
  const feedLoading = commentsLoading || activityLoading

  const [isCommenting, setIsCommenting] = useState(false)
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [commentToDeleteId, setCommentToDeleteId] = useState<string | null>(null)
  const prevCommentMentionsRef = useRef<Array<{ id: string; label: string }>>([])

  useEffect(() => {
    const channel = supabase
      .channel(`card-comments-${cardId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'card_comments', filter: `card_id=eq.${cardId}` },
        () => {
          commentsCache.invalidate()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'card_activity', filter: `card_id=eq.${cardId}` },
        () => {
          qc.invalidateQueries({ queryKey: activityKey(boardId, cardId) })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [cardId, boardId, qc, commentsCache])

  const handleAddComment = async () => {
    const content = commentEditorRef.current?.getContent()
    if (!content) return
    const plain = extractPlainText(content)
    if (!plain) return

    setIsCommenting(true)
    try {
      const added = await apiAddComment(
        boardId,
        cardId,
        actorEmail,
        actorName,
        content,
        actorAvatar
      )
      if (!added) {
        toast.error('Forbidden: Board owner must be added to members list or policy updated.')
        setIsCommenting(false)
        return
      }

      commentsCache.patch((prev) => {
        if (prev?.some((c) => c.id === added.id)) return prev
        return [...(prev ?? []), added]
      })

      void apiInsertActivity({
        boardId,
        cardId,
        actorEmail,
        actorName,
        actorAvatar,
        type: 'comment_added',
        payload: { preview: plain.slice(0, 60) },
      })

      notifyAssignedMembers(
        actorEmail,
        `${cardTitle} — ${boardTitle}`,
        `${actorName} commented: ${plain.slice(0, 80)}`,
        'comment'
      )

      const newMentions = diffMentions(prevCommentMentionsRef.current, extractMentions(content))
      for (const mention of newMentions) {
        const member = boardMembers.find((m) => m.userId === mention.id)
        if (member?.email && member.email !== actorEmail) {
          void sendNotification({
            userEmail: member.email,
            title: `@mention — ${boardTitle}`,
            body: `${actorName} mentioned you in a comment on ${cardTitle}`,
            boardId,
            cardId,
            email_type: 'mention',
          })
        }
      }

      commentEditorRef.current?.resetContent(null)
      prevCommentMentionsRef.current = []
    } catch (err: unknown) {
      const e = err as { message?: string; code?: string }
      logError('add_comment_failed', { message: e?.message, code: e?.code })
      if (e?.code === '42501') {
        toast.error('Permission Denied: You do not have permission to comment on this card.')
      } else {
        toast.error('Failed to add comment. Please try again.')
      }
    } finally {
      setIsCommenting(false)
    }
  }

  const handleUpdateComment = async (commentId: string, content: JSONContent) => {
    const original = cardComments.find((c) => c.id === commentId)
    if (!original) return

    try {
      const { apiUpdateComment } = await import('@/api')
      await apiUpdateComment(commentId, content)

      commentsCache.patch(
        (prev) => prev?.map((c) => (c.id === commentId ? { ...c, content } : c)) ?? []
      )

      const newMentions = diffMentions(extractMentions(original.content), extractMentions(content))
      if (newMentions.length > 0) {
        for (const mention of newMentions) {
          const member = boardMembers.find((m) => m.userId === mention.id)
          if (member?.email && member.email !== actorEmail) {
            void sendNotification({
              userEmail: member.email,
              title: `@mention — ${boardTitle}`,
              body: `${actorName} mentioned you in an edited comment on ${cardTitle}`,
              boardId,
              cardId,
              email_type: 'mention',
            })
          }
        }
      }

      setEditingCommentId(null)
    } catch (err) {
      toast.error('Failed to update comment.')
    }
  }

  const handleDeleteOwnComment = async (commentId: string) => {
    commentsCache.patch((prev) => prev?.filter((c) => c.id !== commentId) ?? [])
    await apiDeleteComment(commentId)
  }

  type FeedItem = { kind: 'comment'; data: CardComment } | { kind: 'activity'; data: ActivityEntry }

  const feed: FeedItem[] = [
    ...cardComments.map((c) => ({ kind: 'comment' as const, data: c })),
    ...cardActivity.map((a) => ({ kind: 'activity' as const, data: a })),
  ].sort((a, b) => new Date(a.data.createdAt).getTime() - new Date(b.data.createdAt).getTime())

  return (
    <div className="w-96 shrink-0 border-l border-border/30 flex flex-col overflow-hidden bg-secondary/5">
      <div className="px-4 pt-4 pb-2 shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Activity</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-2 space-y-4">
        {feedLoading ? (
          <p className="text-xs text-muted-foreground py-2 text-center">Loading activity...</p>
        ) : feed.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2 text-center">No activity yet.</p>
        ) : (
          feed.map((item) => {
            if (item.kind === 'activity') {
              const entry = item.data
              return (
                <div key={entry.id} className="flex items-start gap-3 text-xs">
                  {entry.actorAvatar ? (
                    <img
                      src={entry.actorAvatar}
                      alt=""
                      className="w-6 h-6 rounded-full object-cover shrink-0 mt-0.5 shadow-sm"
                    />
                  ) : (
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[8px] font-bold shrink-0 mt-0.5 shadow-sm"
                      style={{ backgroundColor: getAvatarColor(entry.actorEmail) }}
                    >
                      {entry.actorName.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1 leading-relaxed">
                    <span className="font-semibold text-foreground/90 mr-1.5">
                      {entry.actorName}
                    </span>
                    <span className="text-muted-foreground">
                      {formatActivityMessage(entry.type, '', entry.payload)}
                    </span>
                    <span className="ml-2 text-muted-foreground/50 text-[10px]">
                      {formatCommentTime(entry.createdAt)}
                    </span>
                  </div>
                </div>
              )
            }

            const comment = item.data
            const initials = comment.authorName
              .split(' ')
              .map((w: string) => w[0])
              .join('')
              .toUpperCase()
              .slice(0, 2)
            const isOwn = comment.authorEmail === user?.email

            return (
              <div key={comment.id} className="flex items-start gap-3 group">
                {comment.authorAvatar ? (
                  <img
                    src={comment.authorAvatar}
                    alt={comment.authorName}
                    className="w-8 h-8 rounded-full object-cover shrink-0 mt-0.5 shadow-sm border border-border/20"
                  />
                ) : (
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0 mt-0.5 shadow-sm"
                    style={{ backgroundColor: getAvatarColor(comment.authorName) }}
                  >
                    {initials}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span
                      className="text-[13px] font-bold text-foreground/90 truncate max-w-37.5"
                      title={comment.authorName}
                    >
                      {comment.authorName}
                    </span>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {formatCommentTime(comment.createdAt)}
                    </span>
                    {isOwn && (
                      <div className="ml-auto flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => setEditingCommentId(comment.id)}
                          className="text-[10px] font-medium text-muted-foreground hover:text-primary transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setCommentToDeleteId(comment.id)}
                          className="text-[10px] font-medium text-muted-foreground hover:text-destructive transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                  {editingCommentId === comment.id ? (
                    <div className="mt-1 space-y-2 bg-background p-2 rounded-xl border border-border/50 shadow-sm">
                      <RichTextEditor
                        content={comment.content}
                        members={boardMembers}
                        showHeadings={false}
                        onSubmit={(content) => handleUpdateComment(comment.id, content)}
                        autoFocus
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => setEditingCommentId(null)}
                          className="text-[10px] h-7"
                        >
                          Cancel
                        </Button>
                      </div>
                      <p className="text-[9px] text-muted-foreground italic px-1">
                        Press ⌘↵ to save, Esc to cancel
                      </p>
                    </div>
                  ) : (
                    <div
                      className="tiptap-render text-[13px] bg-background border border-border/30 rounded-xl px-3 py-2 shadow-sm"
                      dangerouslySetInnerHTML={{ __html: renderTiptapHTML(comment.content) }}
                    />
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      <div className="px-4 pt-2 pb-4 border-t border-border/30 shrink-0 space-y-2 bg-background/50 backdrop-blur-sm">
        <RichTextEditor
          ref={commentEditorRef}
          content={null}
          placeholder="Write a comment... (⌘↵ to submit)"
          members={boardMembers}
          showHeadings={false}
          onSubmit={handleAddComment}
        />
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={handleAddComment}
            disabled={isCommenting}
            className="h-8 text-xs gap-1.5 shadow-sm"
          >
            <Send className="w-3.5 h-3.5" />
            {isCommenting ? 'Sending...' : 'Comment'}
          </Button>
        </div>
      </div>

      {commentToDeleteId && (
        <ConfirmModal
          onClose={() => setCommentToDeleteId(null)}
          onConfirm={() => {
            if (commentToDeleteId) handleDeleteOwnComment(commentToDeleteId)
            setCommentToDeleteId(null)
          }}
          title="Delete comment?"
          message="Are you sure you want to delete this comment? This action cannot be undone."
          confirmText="Delete"
          variant="destructive"
        />
      )}
    </div>
  )
}

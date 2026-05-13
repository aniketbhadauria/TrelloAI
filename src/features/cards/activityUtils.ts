import type { JSONContent } from '@tiptap/core'
import type { ActivityType } from '@/types/board'

export function parseDescription(raw: string): JSONContent {
  if (!raw) return { type: 'doc', content: [{ type: 'paragraph' }] }
  try {
    const parsed = JSON.parse(raw) as unknown
    if (parsed && typeof parsed === 'object' && (parsed as { type?: unknown }).type === 'doc') {
      return parsed as JSONContent
    }
  } catch {
    // not JSON — treat as plain text
  }
  return {
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text: raw }] }],
  }
}

export function extractMentions(content: JSONContent): Array<{ id: string; label: string }> {
  const mentions: Array<{ id: string; label: string }> = []
  function traverse(node: JSONContent) {
    if (node.type === 'mention' && node.attrs?.id) {
      mentions.push({ id: node.attrs.id as string, label: (node.attrs.label as string) ?? '' })
    }
    node.content?.forEach(traverse)
  }
  traverse(content)
  return mentions
}

export function diffMentions(
  prev: Array<{ id: string }>,
  next: Array<{ id: string; label: string }>
): Array<{ id: string; label: string }> {
  const prevIds = new Set(prev.map((m) => m.id))
  return next.filter((m) => !prevIds.has(m.id))
}

export function extractPlainText(content: JSONContent): string {
  let text = ''
  function traverse(node: JSONContent) {
    if (node.type === 'text') text += (node.text as string | undefined) ?? ''
    else if (node.type === 'mention') text += `@${(node.attrs?.label as string | undefined) ?? ''}`
    else if (node.type === 'hardBreak') text += ' '
    node.content?.forEach(traverse)
  }
  traverse(content)
  return text.trim()
}

export function formatActivityMessage(
  type: ActivityType,
  actorName: string,
  payload: Record<string, string>
): string {
  switch (type) {
    case 'member_assigned':
      return `${actorName} assigned ${payload.userName} to this card`
    case 'member_unassigned':
      return `${actorName} removed ${payload.userName} from this card`
    case 'comment_added':
      return `${actorName} commented: ${payload.preview}`
    case 'moved':
      return `${actorName} moved this from ${payload.from} to ${payload.to}`
    case 'due_date_set':
      return `${actorName} set the due date to ${payload.date}`
    case 'due_date_changed':
      return `${actorName} changed the due date to ${payload.to}`
    case 'due_date_removed':
      return `${actorName} removed the due date`
    case 'archived':
      return `${actorName} archived this card`
    case 'description_updated':
      return `${actorName} updated the description`
    default:
      return ''
  }
}

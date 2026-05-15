import { generateHTML } from '@tiptap/html'
import StarterKit from '@tiptap/starter-kit'
import Mention from '@tiptap/extension-mention'
import type { JSONContent } from '@tiptap/core'

export function renderTiptapHTML(content: JSONContent): string {
  return generateHTML(content, [
    StarterKit,
    Mention.configure({ HTMLAttributes: { class: 'mention' } }),
  ])
}

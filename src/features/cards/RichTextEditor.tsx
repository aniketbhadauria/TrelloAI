import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Mention from '@tiptap/extension-mention'
import Placeholder from '@tiptap/extension-placeholder'
import type { JSONContent } from '@tiptap/core'
import {
  Bold,
  Code,
  Code2,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  Quote,
  Strikethrough,
} from 'lucide-react'
import 'tippy.js/dist/tippy.css'
import type { MentionMember } from './MentionList'
import { buildMentionSuggestion } from './MentionList'

export interface RichTextEditorRef {
  getContent: () => JSONContent
  resetContent: (content: JSONContent | null) => void
  focus: () => void
}

interface RichTextEditorProps {
  content: JSONContent | null
  placeholder?: string
  members: MentionMember[]
  autoFocus?: boolean
  showHeadings?: boolean
  onSubmit?: (content: JSONContent) => void
}

interface ToolbarButtonProps {
  onClick: () => void
  active: boolean
  title: string
  children: React.ReactNode
}

function ToolbarButton({ onClick, active, title, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault()
        onClick()
      }}
      title={title}
      className={`p-1.5 rounded text-xs transition-colors ${
        active
          ? 'bg-primary/15 text-primary'
          : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
      }`}
    >
      {children}
    </button>
  )
}

const RichTextEditor = forwardRef<RichTextEditorRef, RichTextEditorProps>(
  (
    {
      content,
      placeholder = 'Write something...',
      members,
      autoFocus = false,
      showHeadings = true,
      onSubmit,
    },
    ref
  ) => {
    const membersRef = useRef<MentionMember[]>(members)
    useEffect(() => {
      membersRef.current = members
    }, [members])

    const editor = useEditor({
      extensions: [
        StarterKit,
        Placeholder.configure({ placeholder }),
        Mention.configure({
          HTMLAttributes: { class: 'mention' },
          suggestion: buildMentionSuggestion(() => membersRef.current),
        }),
      ],
      content: content ?? undefined,
      autofocus: autoFocus,
      editorProps: {
        handleKeyDown(_view, event) {
          if ((event.metaKey || event.ctrlKey) && event.key === 'Enter' && onSubmit) {
            const json = editor?.getJSON()
            if (json) onSubmit(json)
            return true
          }
          return false
        },
      },
    })

    useImperativeHandle(ref, () => ({
      getContent: () => editor?.getJSON() ?? { type: 'doc', content: [{ type: 'paragraph' }] },
      resetContent: (newContent) => {
        editor?.commands.setContent(newContent ?? { type: 'doc', content: [{ type: 'paragraph' }] })
      },
      focus: () => {
        editor?.commands.focus()
      },
    }))

    if (!editor) return null

    return (
      <div className="border border-border/40 rounded-xl overflow-hidden bg-white">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-border/30 bg-secondary/20">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive('bold')}
            title="Bold (⌘B)"
          >
            <Bold className="w-3.5 h-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive('italic')}
            title="Italic (⌘I)"
          >
            <Italic className="w-3.5 h-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            active={editor.isActive('strike')}
            title="Strikethrough"
          >
            <Strikethrough className="w-3.5 h-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCode().run()}
            active={editor.isActive('code')}
            title="Inline code"
          >
            <Code className="w-3.5 h-3.5" />
          </ToolbarButton>
          <div className="w-px h-4 bg-border/50 mx-0.5" />
          {showHeadings && (
            <>
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                active={editor.isActive('heading', { level: 2 })}
                title="Heading 2"
              >
                <Heading2 className="w-3.5 h-3.5" />
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                active={editor.isActive('heading', { level: 3 })}
                title="Heading 3"
              >
                <Heading3 className="w-3.5 h-3.5" />
              </ToolbarButton>
              <div className="w-px h-4 bg-border/50 mx-0.5" />
            </>
          )}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive('bulletList')}
            title="Bullet list"
          >
            <List className="w-3.5 h-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={editor.isActive('orderedList')}
            title="Ordered list"
          >
            <ListOrdered className="w-3.5 h-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            active={editor.isActive('blockquote')}
            title="Blockquote"
          >
            <Quote className="w-3.5 h-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            active={editor.isActive('codeBlock')}
            title="Code block"
          >
            <Code2 className="w-3.5 h-3.5" />
          </ToolbarButton>
        </div>
        {/* Editor area */}
        <EditorContent
          editor={editor}
          className="tiptap-content px-3 py-2 min-h-[100px] text-sm focus:outline-none"
        />
      </div>
    )
  }
)

RichTextEditor.displayName = 'RichTextEditor'

export default RichTextEditor

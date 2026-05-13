import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import { ReactRenderer } from '@tiptap/react'
import tippy, { type Instance as TippyInstance } from 'tippy.js'
import type { SuggestionKeyDownProps, SuggestionProps } from '@tiptap/suggestion'

export interface MentionMember {
  userId: string
  display_name: string | null
  email: string | null
  avatar_url: string | null
}

export interface MentionListRef {
  onKeyDown: (props: SuggestionKeyDownProps) => boolean
}

interface MentionListProps {
  items: MentionMember[]
  command: (attrs: { id: string; label: string }) => void
}

const AVATAR_COLORS = [
  '#8b5cf6',
  '#3b82f6',
  '#06b6d4',
  '#10b981',
  '#f59e0b',
  '#f97316',
  '#ef4444',
  '#ec4899',
]

function avatarColor(id: string): string {
  let h = 0
  for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + ((h << 5) - h)
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

const MentionListDropdown = forwardRef<MentionListRef, MentionListProps>((props, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0)

  const selectItem = (index: number) => {
    const item = props.items[index]
    if (item) {
      props.command({ id: item.userId, label: item.display_name || item.email || item.userId })
    }
  }

  useEffect(() => setSelectedIndex(0), [props.items])

  useImperativeHandle(ref, () => ({
    onKeyDown({ event }: SuggestionKeyDownProps) {
      if (event.key === 'ArrowUp') {
        if (props.items.length === 0) return true
        setSelectedIndex((i) => (i + props.items.length - 1) % props.items.length)
        return true
      }
      if (event.key === 'ArrowDown') {
        if (props.items.length === 0) return true
        setSelectedIndex((i) => (i + 1) % props.items.length)
        return true
      }
      if (event.key === 'Enter') {
        selectItem(selectedIndex)
        return true
      }
      return false
    },
  }))

  if (!props.items.length) {
    return (
      <div className="bg-popover border border-border rounded-xl shadow-lg py-2 px-3 text-sm text-muted-foreground min-w-[160px]">
        No members found
      </div>
    )
  }

  return (
    <div className="bg-popover border border-border rounded-xl shadow-lg py-1 min-w-[200px] max-w-[280px]">
      {props.items.map((item, index) => {
        const name = item.display_name || item.email || 'Unknown'
        const initials = name
          .split(' ')
          .map((w) => w[0])
          .join('')
          .toUpperCase()
          .slice(0, 2)
        return (
          <button
            key={item.userId}
            type="button"
            onClick={() => selectItem(index)}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
              index === selectedIndex ? 'bg-secondary' : 'hover:bg-secondary/60'
            }`}
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
              style={{ backgroundColor: avatarColor(item.userId) }}
            >
              {initials}
            </div>
            <div className="text-left min-w-0">
              <div className="font-medium truncate">{name}</div>
              {item.email && (
                <div className="text-xs text-muted-foreground truncate">{item.email}</div>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
})

MentionListDropdown.displayName = 'MentionListDropdown'

export function buildMentionSuggestion(getMembersRef: () => MentionMember[]) {
  return {
    items: ({ query }: { query: string }) => {
      const members = getMembersRef()
      const q = query.toLowerCase()
      return members
        .filter((m) => {
          const name = (m.display_name || m.email || '').toLowerCase()
          return name.includes(q)
        })
        .slice(0, 8)
    },

    render: () => {
      let renderer: ReactRenderer<MentionListRef, MentionListProps>
      let popup: TippyInstance[]

      return {
        onStart(props: SuggestionProps) {
          renderer = new ReactRenderer(MentionListDropdown, {
            props: props as unknown as MentionListProps,
            editor: props.editor,
          })
          if (!props.clientRect) return
          popup = tippy('body', {
            getReferenceClientRect: props.clientRect as () => DOMRect,
            appendTo: () => document.body,
            content: renderer.element,
            showOnCreate: true,
            interactive: true,
            trigger: 'manual',
            placement: 'bottom-start',
          })
        },
        onUpdate(props: SuggestionProps) {
          renderer.updateProps(props as unknown as MentionListProps)
          if (!props.clientRect) return
          popup[0]?.setProps({ getReferenceClientRect: props.clientRect as () => DOMRect })
        },
        onKeyDown(props: SuggestionKeyDownProps) {
          if (props.event.key === 'Escape') {
            popup[0]?.hide()
            return true
          }
          return renderer.ref?.onKeyDown(props) ?? false
        },
        onExit() {
          popup[0]?.destroy()
          renderer.destroy()
        },
      }
    },
  }
}

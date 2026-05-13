import { useState, useEffect } from 'react'
import { Pencil } from 'lucide-react'
import { generateBoardKey } from '@/utils/board'

interface BoardKeyEditorProps {
  boardKey: string | undefined
  title: string
  canEdit: boolean
  onSave: (key: string) => void
}

export default function BoardKeyEditor({ boardKey, title, canEdit, onSave }: BoardKeyEditorProps) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(boardKey ?? '')

  useEffect(() => {
    setValue(boardKey ?? '')
  }, [boardKey])

  const handleSubmit = () => {
    const val = value
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 8)
    if (val && val !== boardKey) onSave(val)
    else setValue(boardKey ?? '')
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        value={value}
        onChange={(e) =>
          setValue(
            e.target.value
              .toUpperCase()
              .replace(/[^A-Z0-9]/g, '')
              .slice(0, 8)
          )
        }
        onBlur={handleSubmit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSubmit()
          if (e.key === 'Escape') {
            setValue(boardKey ?? '')
            setEditing(false)
          }
        }}
        className="w-20 text-xs font-mono bg-white/10 text-white px-1.5 py-0.5 rounded border border-white/30 outline-none uppercase"
        maxLength={8}
        autoFocus
      />
    )
  }

  return (
    <button
      onClick={() => canEdit && setEditing(true)}
      className={`group flex items-center gap-1 text-xs font-mono text-white/40 px-1.5 py-0.5 rounded bg-white/10 transition-colors ${
        canEdit ? 'hover:bg-white/20' : ''
      }`}
      title={canEdit ? 'Click to edit board key' : 'Board Key'}
    >
      {boardKey || generateBoardKey(title)}
      {canEdit && (
        <Pencil className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
    </button>
  )
}

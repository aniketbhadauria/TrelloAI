import { useState, useEffect } from 'react'

interface BoardTitleEditorProps {
  title: string
  canEdit: boolean
  onSave: (title: string) => void
}

export default function BoardTitleEditor({ title, canEdit, onSave }: BoardTitleEditorProps) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(title)

  useEffect(() => {
    setValue(title)
  }, [title])

  const handleSubmit = () => {
    const val = value.trim()
    if (val && val !== title) onSave(val)
    else setValue(title)
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleSubmit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSubmit()
          if (e.key === 'Escape') {
            setValue(title)
            setEditing(false)
          }
        }}
        className="text-lg font-bold bg-secondary/50 px-2 py-1 rounded-lg border border-primary/30 outline-none text-white min-w-[100px]"
        autoFocus
      />
    )
  }

  return (
    <h1
      className={`text-lg font-bold px-2 py-1 rounded-lg transition-colors text-white ${
        canEdit ? 'cursor-pointer hover:bg-white/10' : ''
      }`}
      onClick={() => canEdit && setEditing(true)}
    >
      {title}
    </h1>
  )
}

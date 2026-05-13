import { useRef } from 'react'
import { Camera } from 'lucide-react'
import { getAvatarColor } from '@/utils/user'

interface ProfileAvatarEditorProps {
  id: string | undefined
  preview: string | null
  initials: string
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export default function ProfileAvatarEditor({
  id,
  preview,
  initials,
  onFileChange,
}: ProfileAvatarEditorProps) {
  const fileRef = useRef<HTMLInputElement>(null)

  return (
    <div className="bg-secondary/10 border border-border/40 rounded-2xl p-6 flex items-center gap-6 shadow-sm">
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="relative w-24 h-24 rounded-full bg-primary flex items-center justify-center overflow-hidden ring-4 ring-primary/10 group cursor-pointer shrink-0 shadow-lg transition-all hover:scale-105 active:scale-95"
      >
        {preview ? (
          <img src={preview} alt="Avatar" className="w-full h-full object-cover" />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-3xl font-bold text-white select-none"
            style={{ backgroundColor: getAvatarColor(id) }}
          >
            {initials}
          </div>
        )}
        <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <Camera className="w-6 h-6 text-white" />
          <span className="text-[10px] text-white font-bold uppercase mt-1">Change</span>
        </div>
      </button>
      <div className="space-y-1">
        <h3 className="text-lg font-bold">Profile Picture</h3>
        <p className="text-sm text-muted-foreground">Click the image to upload a new one.</p>
        <p className="text-xs text-muted-foreground/60 italic">JPG, PNG or GIF are supported.</p>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onFileChange}
      />
    </div>
  )
}

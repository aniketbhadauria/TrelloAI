import { useRef } from 'react'
import { Camera } from 'lucide-react'
import { getAvatarColor } from '@/utils/user'

interface OnboardingAvatarUploadProps {
  userId: string | undefined
  preview: string | null
  initials: string
  error: string
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export default function OnboardingAvatarUpload({
  userId,
  preview,
  initials,
  error,
  onFileChange,
}: OnboardingAvatarUploadProps) {
  const fileRef = useRef<HTMLInputElement>(null)

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col items-center gap-4">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="relative w-32 h-32 rounded-full bg-primary flex items-center justify-center overflow-hidden ring-4 ring-primary/20 shadow-2xl group cursor-pointer transition-all hover:scale-105 active:scale-95"
          aria-label="Upload profile photo"
        >
          {preview ? (
            <img src={preview} alt="Preview" className="w-full h-full object-cover" />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-5xl font-bold text-white select-none transition-colors"
              style={{ backgroundColor: getAvatarColor(userId) }}
            >
              {initials}
            </div>
          )}
          <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Camera className="w-7 h-7 text-white" />
            <span className="text-white text-xs font-semibold">Upload</span>
          </div>
        </button>

        <div className="text-center">
          <p className="text-sm font-medium text-foreground">
            {preview ? '✨ Looking great!' : '📷 Upload a profile photo'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {preview ? 'Click the circle to change.' : 'Help your team recognize you.'}
          </p>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onFileChange}
        />

        {error && <p className="text-sm text-destructive animate-bounce">⚠️ {error}</p>}
      </div>
    </div>
  )
}

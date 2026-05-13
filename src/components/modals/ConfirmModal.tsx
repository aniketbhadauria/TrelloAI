import { X, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ConfirmModalProps {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'default' | 'destructive'
  onConfirm: () => void
  onClose: () => void
}

export default function ConfirmModal({
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  return (
    <div className="modal-overlay z-[100]" onClick={onClose}>
      <div
        className="modal-content bg-card border border-border rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <AlertCircle
              className={`w-4 h-4 ${variant === 'destructive' ? 'text-destructive' : 'text-primary'}`}
            />
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">{message}</p>

        <div className="flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={onClose}>
            {cancelText}
          </Button>
          <Button
            variant={variant === 'destructive' ? 'destructive' : 'default'}
            className="flex-1"
            onClick={() => {
              onConfirm()
              onClose()
            }}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  )
}

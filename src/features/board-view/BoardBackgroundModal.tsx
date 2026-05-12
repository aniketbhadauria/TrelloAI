import { X } from 'lucide-react';
import { GRADIENTS, GRADIENT_STYLES } from '@/utils/gradients';

interface BoardBackgroundModalProps {
  currentGradient: string;
  currentBackgroundImage: string | null;
  onSelectGradient: (g: string) => void;
  onSelectImage: (url: string) => void;
  onClose: () => void;
}

export default function BoardBackgroundModal({
  currentGradient,
  currentBackgroundImage,
  onSelectGradient,
  onSelectImage: _onSelectImage,
  onClose,
}: BoardBackgroundModalProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content bg-card border border-border rounded-2xl p-5 w-full max-w-sm mx-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold">Board Background</h3>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-secondary transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div>
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2.5">Colors</p>
          <div className="grid grid-cols-4 gap-2">
            {GRADIENTS.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => { onSelectGradient(g); onClose(); }}
                className={`h-10 rounded-lg transition-all ${
                  !currentBackgroundImage && currentGradient === g
                    ? 'ring-2 ring-primary ring-offset-2 ring-offset-card scale-[1.06]'
                    : 'hover:scale-[1.04] opacity-80 hover:opacity-100'
                }`}
                style={{ backgroundColor: GRADIENT_STYLES[g] }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

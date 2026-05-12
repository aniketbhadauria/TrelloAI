import { useRef } from 'react';
import { Paperclip, X, ExternalLink } from 'lucide-react';
import type { Attachment } from '@/types/board';

interface CardAttachmentsProps {
  attachments: Attachment[];
  onRemove: (attachmentId: string) => void;
}

function sanitizeUrl(url: string | undefined): string | null {
  if (!url || typeof url !== 'string') return null;
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.toString() : null;
  } catch {
    return null;
  }
}

export default function CardAttachments({ attachments, onRemove }: CardAttachmentsProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  if (attachments.length === 0) return null;

  return (
    <div ref={containerRef} className="mb-4 space-y-1.5">
      {attachments.map((attachment) => {
        const safeUrl = sanitizeUrl(attachment.url);
        return (
          <div key={attachment.id} className="flex items-center gap-2 text-xs rounded-lg bg-secondary/30 px-2 py-1.5">
            <Paperclip className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            {safeUrl ? (
              <a
                href={safeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate text-primary hover:underline flex-1"
              >
                {attachment.name || safeUrl}
              </a>
            ) : (
              <span className="truncate flex-1">{attachment.name || attachment.fileName || attachment.url}</span>
            )}
            {safeUrl && (
              <a
                href={safeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground shrink-0"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            <button
              onClick={() => onRemove(attachment.id)}
              className="ml-auto text-muted-foreground hover:text-destructive transition-colors shrink-0"
              title="Remove attachment"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

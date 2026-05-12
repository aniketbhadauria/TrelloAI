import { useEffect } from 'react';

const BASE = 'Esperia Trello';

export function usePageTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} · ${BASE}` : BASE;
  }, [title]);
}

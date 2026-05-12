import { useState, useEffect, useCallback } from 'react';

type Theme = 'light' | 'dark';

export function useTheme(): { theme: Theme; toggle: () => void } {
  const [theme, setTheme] = useState<Theme>(() =>
    (localStorage.getItem('theme') as Theme | null) ?? 'light',
  );

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggle = useCallback(() => setTheme(t => t === 'dark' ? 'light' : 'dark'), []);

  return { theme, toggle };
}

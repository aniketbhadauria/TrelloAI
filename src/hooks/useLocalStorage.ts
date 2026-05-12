import { useState, useCallback } from 'react';

export function useLocalStorage<T>(
  key: string,
  initialValue: T | (() => T),
): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item
        ? (JSON.parse(item) as T)
        : (typeof initialValue === 'function' ? (initialValue as () => T)() : initialValue);
    } catch {
      return typeof initialValue === 'function' ? (initialValue as () => T)() : initialValue;
    }
  });

  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch {
      // ignore write errors
    }
  }, [key, storedValue]);

  return [storedValue, setValue];
}

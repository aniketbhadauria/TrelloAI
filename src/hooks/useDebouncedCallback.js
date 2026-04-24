import { useRef, useCallback, useEffect } from 'react';

export function useDebouncedCallback(callback, delay) {
  const timeoutRef = useRef(null);
  const callbackRef = useRef(callback);
  const argsRef = useRef(null);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const run = useCallback((...args) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    argsRef.current = args;
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      const latestArgs = argsRef.current || [];
      argsRef.current = null;
      callbackRef.current(...latestArgs);
    }, delay);
  }, [delay]);

  const cancel = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
    argsRef.current = null;
  }, []);

  const flush = useCallback(() => {
    if (!timeoutRef.current) return;
    clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
    const latestArgs = argsRef.current || [];
    argsRef.current = null;
    callbackRef.current(...latestArgs);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return { run, cancel, flush };
}

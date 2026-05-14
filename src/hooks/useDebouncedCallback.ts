import { useRef, useCallback, useEffect } from 'react'

interface DebouncedCallback {
  run: (...args: unknown[]) => void
  cancel: () => void
  flush: () => void
}

export function useDebouncedCallback(
  callback: (...args: unknown[]) => unknown,
  delay: number
): DebouncedCallback {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const callbackRef = useRef(callback)
  const argsRef = useRef<unknown[] | null>(null)

  callbackRef.current = callback

  const run = useCallback(
    (...args: unknown[]) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      argsRef.current = args
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null
        const latestArgs = argsRef.current ?? []
        argsRef.current = null
        callbackRef.current(...latestArgs)
      }, delay)
    },
    [delay]
  )

  const cancel = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = null
    argsRef.current = null
  }, [])

  const flush = useCallback(() => {
    if (!timeoutRef.current) return
    clearTimeout(timeoutRef.current)
    timeoutRef.current = null
    const latestArgs = argsRef.current ?? []
    argsRef.current = null
    callbackRef.current(...latestArgs)
  }, [])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  return { run, cancel, flush }
}

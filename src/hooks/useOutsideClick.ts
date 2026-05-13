import { useEffect, RefObject } from 'react'

export function useOutsideClick<T extends HTMLElement>(
  ref: RefObject<T | null>,
  handler: (event: MouseEvent) => void,
  enabled: boolean = true
) {
  useEffect(() => {
    if (!enabled) return

    function listener(event: MouseEvent) {
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return
      }
      handler(event)
    }

    document.addEventListener('mousedown', listener)
    return () => {
      document.removeEventListener('mousedown', listener)
    }
  }, [ref, handler, enabled])
}

import { useState, useCallback, useMemo } from 'react'
import type { Board } from '@/types/board'
import { isPast, isToday, addDays, addWeeks, addMonths, isWithinInterval } from 'date-fns'

export interface Filters {
  keyword: string
  labels: string[]
  dueDate: string[]
  status: string[]
  activity: string[]
  sprint: string[]
  priority: string[]
  cardType: string[]
}

const EMPTY: Filters = {
  keyword: '',
  labels: [],
  dueDate: [],
  status: [],
  activity: [],
  sprint: [],
  priority: [],
  cardType: [],
}

type Setter<T> = T | ((prev: T) => T)

export function useBoardFilters(board: Board | null) {
  const [filters, setFilters] = useState<Filters>(EMPTY)
  const [isOpen, setIsOpen] = useState(false)

  const openFilter = useCallback(() => setIsOpen(true), [])
  const closeFilter = useCallback(() => setIsOpen(false), [])
  const toggleFilter = useCallback(() => setIsOpen((v) => !v), [])

  const setKeyword = useCallback((v: string) => setFilters((f) => ({ ...f, keyword: v })), [])
  const setLabels = useCallback(
    (v: Setter<string[]>) =>
      setFilters((f) => ({ ...f, labels: typeof v === 'function' ? v(f.labels) : v })),
    []
  )
  const setDueDate = useCallback(
    (v: Setter<string[]>) =>
      setFilters((f) => ({ ...f, dueDate: typeof v === 'function' ? v(f.dueDate) : v })),
    []
  )
  const setStatus = useCallback(
    (v: Setter<string[]>) =>
      setFilters((f) => ({ ...f, status: typeof v === 'function' ? v(f.status) : v })),
    []
  )
  const setActivity = useCallback(
    (v: Setter<string[]>) =>
      setFilters((f) => ({ ...f, activity: typeof v === 'function' ? v(f.activity) : v })),
    []
  )
  const setSprint = useCallback(
    (v: Setter<string[]>) =>
      setFilters((f) => ({ ...f, sprint: typeof v === 'function' ? v(f.sprint) : v })),
    []
  )
  const setPriority = useCallback(
    (v: Setter<string[]>) =>
      setFilters((f) => ({ ...f, priority: typeof v === 'function' ? v(f.priority) : v })),
    []
  )
  const setCardType = useCallback(
    (v: Setter<string[]>) =>
      setFilters((f) => ({ ...f, cardType: typeof v === 'function' ? v(f.cardType) : v })),
    []
  )
  const clear = useCallback(() => setFilters(EMPTY), [])

  const hasActiveFilters = !!(
    filters.keyword ||
    filters.labels.length ||
    filters.dueDate.length ||
    filters.status.length ||
    filters.activity.length ||
    filters.sprint.length ||
    filters.priority.length ||
    filters.cardType.length
  )

  const allLabels = useMemo(() => {
    if (!board) return []
    const map = new Map<string, { id: string; text: string; color: string }>()
    board.lists.forEach((l) =>
      l.cards.forEach((c) => c.labels?.forEach((lb) => map.set(lb.id, lb)))
    )
    return [...map.values()]
  }, [board])

  const allSprints = useMemo(() => board?.sprints ?? [], [board])

  const filteredLists = useMemo(() => {
    if (!board || !hasActiveFilters) return board?.lists || []
    const now = new Date()
    return board.lists.map((list) => ({
      ...list,
      cards: list.cards.filter((card) => {
        if (filters.keyword) {
          const kw = filters.keyword.toLowerCase()
          const match =
            card.title?.toLowerCase().includes(kw) ||
            card.description?.toLowerCase().includes(kw) ||
            card.labels?.some((l) => l.text.toLowerCase().includes(kw))
          if (!match) return false
        }
        if (filters.labels.length) {
          const ids = (card.labels || []).map((l) => l.id)
          const pass =
            (filters.labels.includes('__none__') && ids.length === 0) ||
            filters.labels.some((id) => id !== '__none__' && ids.includes(id))
          if (!pass) return false
        }
        if (filters.dueDate.length) {
          const due = card.dueDate ? new Date(card.dueDate) : null
          const pass = filters.dueDate.some((f) => {
            if (f === 'none') return !due
            if (!due) return false
            if (f === 'overdue') return isPast(due) && !isToday(due)
            if (f === 'nextDay') return isWithinInterval(due, { start: now, end: addDays(now, 1) })
            if (f === 'nextWeek')
              return isWithinInterval(due, { start: now, end: addWeeks(now, 1) })
            if (f === 'nextMonth')
              return isWithinInterval(due, { start: now, end: addMonths(now, 1) })
            return true
          })
          if (!pass) return false
        }
        if (filters.status.length) {
          const cl = card.checklist || []
          const allDone = cl.length > 0 && cl.every((i) => i.completed)
          const pass = filters.status.some((f) => (f === 'complete' ? allDone : !allDone))
          if (!pass) return false
        }
        // activity filter is a no-op until DB-backed activity feed is implemented
        if (filters.sprint.length) {
          const pass =
            (filters.sprint.includes('__backlog__') && !card.sprintId) ||
            (!!card.sprintId && filters.sprint.includes(card.sprintId))
          if (!pass) return false
        }
        if (filters.priority.length) {
          const pass =
            (filters.priority.includes('__none__') && !card.priority) ||
            (!!card.priority && filters.priority.includes(card.priority))
          if (!pass) return false
        }
        if (filters.cardType.length) {
          const pass =
            (filters.cardType.includes('__none__') && !card.cardType) ||
            (!!card.cardType && filters.cardType.includes(card.cardType))
          if (!pass) return false
        }
        return true
      }),
    }))
  }, [board, filters, hasActiveFilters])

  return {
    filters,
    hasActiveFilters,
    allLabels,
    allSprints,
    filteredLists,
    setKeyword,
    setLabels,
    setDueDate,
    setStatus,
    setActivity,
    setSprint,
    setPriority,
    setCardType,
    clear,
    isOpen,
    openFilter,
    closeFilter,
    toggleFilter,
  }
}

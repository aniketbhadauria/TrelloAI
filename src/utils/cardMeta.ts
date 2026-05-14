import type { CardPriority, CardType } from '@/types/board'

export const PRIORITIES: {
  value: CardPriority
  label: string
  color: string
  dot: string
}[] = [
  { value: 'urgent', label: 'Urgent', color: 'text-red-400', dot: 'bg-red-400' },
  { value: 'high', label: 'High', color: 'text-orange-400', dot: 'bg-orange-400' },
  { value: 'medium', label: 'Medium', color: 'text-yellow-400', dot: 'bg-yellow-400' },
  { value: 'low', label: 'Low', color: 'text-blue-400', dot: 'bg-blue-400' },
]

export const CARD_TYPES: {
  value: CardType
  label: string
  color: string
  bg: string
}[] = [
  { value: 'feature', label: 'Feature', color: 'text-violet-400', bg: 'bg-violet-400/15' },
  { value: 'bug', label: 'Bug', color: 'text-red-400', bg: 'bg-red-400/15' },
  { value: 'improvement', label: 'Improvement', color: 'text-green-400', bg: 'bg-green-400/15' },
  { value: 'task', label: 'Task', color: 'text-blue-400', bg: 'bg-blue-400/15' },
  { value: 'chore', label: 'Chore', color: 'text-muted-foreground', bg: 'bg-secondary/60' },
]

export function getPriority(v: CardPriority | null | undefined) {
  return PRIORITIES.find((p) => p.value === v) ?? null
}

export function getCardType(v: CardType | null | undefined) {
  return CARD_TYPES.find((t) => t.value === v) ?? null
}

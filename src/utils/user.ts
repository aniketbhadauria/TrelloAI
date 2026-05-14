import type { BoardMember } from '@/types/board'

export const MEMBER_COLORS = [
  '#8b5cf6',
  '#3b82f6',
  '#06b6d4',
  '#10b981',
  '#f59e0b',
  '#f97316',
  '#ef4444',
  '#ec4899',
]

export function getAvatarColor(id: string | undefined): string {
  if (!id) return MEMBER_COLORS[0]
  let h = 0
  for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + ((h << 5) - h)
  return MEMBER_COLORS[Math.abs(h) % MEMBER_COLORS.length]
}

type ActorUser = {
  id?: string
  email?: string | null
  user_metadata?: {
    display_name?: string
    full_name?: string
    name?: string
    preferred_username?: string
  } | null
}

export function resolveActorIdentity(
  user: ActorUser | null | undefined,
  boardMembers: Array<Pick<BoardMember, 'userId' | 'display_name'>> = []
): { actorEmail: string; actorName: string } {
  const actorEmail = user?.email ?? ''
  const member = boardMembers.find((m) => m.userId === user?.id)
  const actorName =
    member?.display_name ||
    user?.user_metadata?.display_name ||
    user?.user_metadata?.full_name ||
    user?.email ||
    'Someone'
  return { actorEmail, actorName }
}

export function getUserInitials(
  name: string | null | undefined,
  email: string | null | undefined
): string {
  const src = name || email || '?'
  return (src.split(/\s|@/)[0]?.[0] ?? '?').toUpperCase()
}

export function getFullName(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  displayName: string | null | undefined,
  email: string | null | undefined
): string {
  if (firstName && lastName) return `${firstName} ${lastName}`
  if (firstName) return firstName
  return displayName || email || 'Anonymous'
}

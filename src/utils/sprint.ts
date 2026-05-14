import { z } from 'zod'
import type { Sprint } from '@/types/board'

export const SPRINT_PREFIX = 'Sprint'

export type Duration = '1week' | '2weeks' | 'custom'

export interface SprintFormValues {
  sprintNumber: number
  goal: string
  duration: Duration
  startDate: string
  endDate: string
}

export function parseSprintNumber(name: string): number {
  const m = name.match(/^Sprint\s+(\d+)$/i)
  return m ? parseInt(m[1], 10) : 0
}

export function getNextSprintNumber(sprints: Sprint[]): number {
  const max = sprints.reduce((m, s) => Math.max(m, parseSprintNumber(s.name)), 0)
  return max + 1
}

export function shiftDate(date: string, days: number): string {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export function sprintsOverlap(
  aStart: string,
  aEnd: string,
  bStart: string | null | undefined,
  bEnd: string | null | undefined
): boolean {
  if (!bStart || !bEnd) return false
  return aStart <= bEnd && aEnd >= bStart
}

export function buildSchema(minNumber: number, otherSprints: Sprint[]) {
  const today = new Date().toISOString().slice(0, 10)

  return z
    .object({
      sprintNumber: z
        .number({ invalid_type_error: 'Enter a number' })
        .int()
        .min(minNumber, `Sprint number must be at least ${minNumber}`),
      goal: z.string(),
      duration: z.enum(['1week', '2weeks', 'custom']),
      startDate: z.string().min(1, 'Start date is required'),
      endDate: z.string(),
    })
    .superRefine((data, ctx) => {
      if (data.startDate && data.startDate < today) {
        ctx.addIssue({
          code: 'custom',
          path: ['startDate'],
          message: 'Start date cannot be in the past',
        })
      }
      if (data.endDate && data.startDate && data.endDate < data.startDate) {
        ctx.addIssue({
          code: 'custom',
          path: ['endDate'],
          message: 'End date must be after start date',
        })
      }
      if (data.startDate && data.endDate) {
        for (const s of otherSprints) {
          if (sprintsOverlap(data.startDate, data.endDate, s.startDate, s.endDate)) {
            ctx.addIssue({
              code: 'custom',
              path: ['startDate'],
              message: `Overlaps with ${s.name} (${s.startDate} – ${s.endDate})`,
            })
            break
          }
        }
      }
    })
}

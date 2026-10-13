import type { Exercise } from './db'

export type Verdict = 'up' | 'down' | 'keep'

/**
 * Double progression on the first set only: reaching the top of the range
 * means more weight next time, falling below the bottom means less.
 * With 8–12: 7 or fewer → down, 8–11 → keep, 12 or more → up.
 */
export function judgeFirstSet(reps: number, repMin: number, repMax: number): Verdict {
  if (reps >= repMax) return 'up'
  if (reps < repMin) return 'down'
  return 'keep'
}

export function suggestedWeight(weight: number, verdict: Verdict, step: number) {
  if (verdict === 'up') return weight + step
  if (verdict === 'down') return Math.max(0, weight - step)
  return weight
}

/** Cardio machines don't use weights, so they skip progression. */
export const usesProgression = (e: Exercise) => e.group !== 'cardio'

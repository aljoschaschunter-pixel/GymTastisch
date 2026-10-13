import type { Exercise } from './db'

export type Verdict = 'up' | 'down' | 'keep'

/** Progressive overload: only the first set of an exercise counts. */
export function judgeFirstSet(reps: number, repMin: number, repMax: number): Verdict {
  if (reps > repMax) return 'up'
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

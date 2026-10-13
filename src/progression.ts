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

/** Big lower-body lifts move in larger jumps. */
const HEAVY_LOWER = new Set(['squat', 'deadlift', 'leg_press', 'romanian_deadlift', 'hip_thrust', 'hack_squat'])

/** Built-in exercises done with body weight; extra load is optional. */
const BODYWEIGHT = new Set([
  'push_up',
  'pull_up',
  'dips',
  'lunge',
  'back_extension',
  'plank',
  'crunch',
  'hanging_leg_raise',
  'bulgarian_split_squat',
  'leg_raise',
  'russian_twist',
])

export const isBodyweight = (e: Exercise) => e.bodyweight ?? (!!e.builtin && BODYWEIGHT.has(e.builtin))

/** Smallest weight change for this exercise: its own setting, else 5 kg for big lower-body lifts, else the global default. */
export const stepFor = (e: Exercise, defaultStep: number) =>
  e.weightStep ?? (e.builtin && HEAVY_LOWER.has(e.builtin) ? 5 : defaultStep)

/**
 * Change the load by about 5 %, within the commonly recommended 2–10 %
 * (ACSM), rounded to what the equipment allows and at least one step.
 */
export function suggestedWeight(weight: number, verdict: Verdict, step: number) {
  if (verdict === 'keep' || step <= 0) return weight
  const change = Math.max(step, Math.round((weight * 0.05) / step) * step)
  const next = verdict === 'up' ? weight + change : Math.max(0, weight - change)
  return Math.round(next * 100) / 100
}

/** Cardio machines don't use weights, so they skip progression. */
export const usesProgression = (e: Exercise) => e.group !== 'cardio'

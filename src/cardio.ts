import type { Exercise, WorkoutSet } from './db'

/** Second value logged next to the time for a cardio exercise. */
export type CardioMetric = 'speed' | 'incline' | 'level' | 'distance'

export const CARDIO_METRICS: CardioMetric[] = ['speed', 'incline', 'level', 'distance']

/** Unit, stepper increment and a first-time default for each value. */
export const METRIC_INFO: Record<CardioMetric, { unit: string; step: number; start: number }> = {
  speed: { unit: 'km/h', step: 0.5, start: 8 },
  incline: { unit: '%', step: 0.5, start: 8 },
  level: { unit: '', step: 1, start: 8 },
  distance: { unit: 'm', step: 100, start: 2000 },
}

const BUILTIN_METRIC: Record<string, CardioMetric> = {
  treadmill: 'speed',
  incline_walk: 'incline',
  bike: 'level',
  cross_trainer: 'level',
  stair_climber: 'level',
  rowing_machine: 'distance',
}

export const DEFAULT_MINUTES = 20

/** Cardio is logged as time plus one value instead of weight and reps. */
export const isCardio = (e: Exercise) => e.group === 'cardio'

/** The exercise's own choice, else the built-in default; undefined means time only. */
export const cardioMetric = (e: Exercise): CardioMetric | undefined =>
  e.cardioMetric === 'none' ? undefined : (e.cardioMetric ?? (e.builtin ? BUILTIN_METRIC[e.builtin] : undefined))

/** Logged with time; older cardio entries were logged as weight × reps. */
export const isTimed = (s: WorkoutSet) => s.minutes !== undefined

import Dexie, { type EntityTable } from 'dexie'

export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'legs'
  | 'shoulders'
  | 'arms'
  | 'core'
  | 'cardio'
  | 'other'

export const MUSCLE_GROUPS: MuscleGroup[] = [
  'chest',
  'back',
  'legs',
  'shoulders',
  'arms',
  'core',
  'cardio',
  'other',
]

export interface Exercise {
  id: string
  /** Key into the translation table for built-in exercises. */
  builtin?: string
  /** Name for custom exercises (or a user rename of a built-in one). */
  name?: string
  group: MuscleGroup
  notes?: string
  photo?: Blob
  /** Rest time override in seconds; falls back to the global default. */
  restSeconds?: number
  /** Weight for the first set next time (progressive overload). */
  workingWeight?: number
  /** Smallest weight change in kg, e.g. the plate or stack increment of a machine. */
  weightStep?: number
  /** Done with body weight; logged weight is extra load. Built-ins have a default. */
  bodyweight?: boolean
  archived?: boolean
  createdAt: number
}

export interface Workout {
  id: string
  startedAt: number
  endedAt?: number
  /** Exercises in this workout, in the order they were added. */
  exerciseIds: string[]
  /** Training day this workout was started from. */
  planId?: string
  /** Logged afterwards without sets, so it counts for the weekly goal and streak. */
  logged?: boolean
  note?: string
}

/** A training day, e.g. "Monday · Day 1", with a fixed list of exercises. */
export interface Plan {
  id: string
  name: string
  order: number
  exerciseIds: string[]
  /** Weekdays this day is usually trained on, 0 = Monday. */
  weekdays?: number[]
}

export const MAX_PLANS = 7

export interface WorkoutSet {
  id: string
  workoutId: string
  exerciseId: string
  weight: number
  reps: number
  createdAt: number
}

/** Optional morning body weight, one entry per day. */
export interface BodyWeight {
  /** Local calendar day, YYYY-MM-DD. */
  date: string
  weight: number
  createdAt: number
}

export const db = new Dexie('gymtastisch') as Dexie & {
  exercises: EntityTable<Exercise, 'id'>
  workouts: EntityTable<Workout, 'id'>
  sets: EntityTable<WorkoutSet, 'id'>
  plans: EntityTable<Plan, 'id'>
  bodyweights: EntityTable<BodyWeight, 'date'>
}

db.version(1).stores({
  exercises: 'id, builtin, group',
  workouts: 'id, startedAt, endedAt',
  sets: 'id, workoutId, exerciseId, createdAt, [exerciseId+createdAt]',
})

db.version(2).stores({
  plans: 'id, order',
})

db.version(3).stores({
  bodyweights: 'date',
})

// One entry per day: drop duplicate entries that were logged afterwards.
db.version(4)
  .stores({})
  .upgrade(async (tx) => {
    const workouts = await tx.table<Workout, string>('workouts').toArray()
    await tx.table('workouts').bulkDelete(redundantLogged(workouts))
  })

/** Local calendar day as YYYY-MM-DD. */
export const dayKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/**
 * Ids of entries logged afterwards that duplicate another workout on the same day.
 * A finished workout tracked in the app wins; otherwise one logged entry is kept,
 * preferring one with a training day.
 */
export function redundantLogged(workouts: Workout[]) {
  const byDay = new Map<string, Workout[]>()
  for (const w of workouts) {
    const key = dayKey(new Date(w.startedAt))
    byDay.set(key, [...(byDay.get(key) ?? []), w])
  }
  const ids: string[] = []
  for (const day of byDay.values()) {
    const logged = day.filter((w) => w.logged)
    const tracked = day.some((w) => !w.logged && w.endedAt)
    const keep = tracked ? undefined : (logged.find((w) => w.planId) ?? logged[0])
    for (const w of logged) if (w !== keep) ids.push(w.id)
  }
  return ids
}

export const uid = () =>
  typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2)

/** Epley estimate of the one-rep max. */
export const estimate1RM = (weight: number, reps: number) =>
  reps <= 1 ? weight : weight * (1 + reps / 30)

export async function activeWorkout() {
  const open = await db.workouts.filter((w) => !w.endedAt).toArray()
  return open.sort((a, b) => b.startedAt - a.startedAt)[0]
}

/** Sets of the most recent finished-or-other workout that included this exercise. */
export async function lastSessionSets(exerciseId: string, excludeWorkoutId?: string) {
  const sets = await db.sets
    .where('[exerciseId+createdAt]')
    .between([exerciseId, Dexie.minKey], [exerciseId, Dexie.maxKey])
    .reverse()
    .toArray()
  const prev = sets.find((s) => s.workoutId !== excludeWorkoutId)
  if (!prev) return []
  return sets.filter((s) => s.workoutId === prev.workoutId).reverse()
}

/** Ask the browser not to evict our data. */
export async function requestPersistence() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) {
      await navigator.storage.persist()
    }
  } catch {
    // not supported; installed home-screen apps are not evicted on iOS anyway
  }
}

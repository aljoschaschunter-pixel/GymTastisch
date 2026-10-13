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
  archived?: boolean
  createdAt: number
}

export interface Workout {
  id: string
  startedAt: number
  endedAt?: number
  /** Exercises in this workout, in the order they were added. */
  exerciseIds: string[]
  note?: string
}

export interface WorkoutSet {
  id: string
  workoutId: string
  exerciseId: string
  weight: number
  reps: number
  createdAt: number
}

export const db = new Dexie('gymtastisch') as Dexie & {
  exercises: EntityTable<Exercise, 'id'>
  workouts: EntityTable<Workout, 'id'>
  sets: EntityTable<WorkoutSet, 'id'>
}

db.version(1).stores({
  exercises: 'id, builtin, group',
  workouts: 'id, startedAt, endedAt',
  sets: 'id, workoutId, exerciseId, createdAt, [exerciseId+createdAt]',
})

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

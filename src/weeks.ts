import type { Workout } from './db'

export const DAY = 86_400_000

/** Monday 00:00 of the week containing `ts`. */
export function weekStart(ts: number) {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return d.getTime()
}

/** Previous Monday, robust against daylight saving changes. */
export const prevWeek = (monday: number) => weekStart(monday - 3 * DAY)

/** Days with a finished workout per week (keyed by Monday 00:00); a day counts once. */
export function workoutsPerWeek(workouts: Workout[]) {
  const days = new Map<number, Set<number>>()
  for (const w of workouts) {
    if (!w.endedAt) continue
    const day = new Date(w.startedAt).setHours(0, 0, 0, 0)
    const week = weekStart(w.startedAt)
    days.set(week, (days.get(week) ?? new Set()).add(day))
  }
  return new Map([...days].map(([week, set]) => [week, set.size]))
}

/** Consecutive weeks with at least one workout; the current week counts once it has one. */
export function weekStreak(perWeek: Map<number, number>, now = Date.now()) {
  const thisWeek = weekStart(now)
  let streak = 0
  for (let w = perWeek.has(thisWeek) ? thisWeek : prevWeek(thisWeek); perWeek.has(w); w = prevWeek(w)) streak++
  return streak
}

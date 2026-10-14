import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { db, type Workout } from '../db'
import { useI18n } from '../i18n'
import { useNav } from '../nav'
import { exerciseName } from '../seed'
import { Icon } from './Icon'
import { setLabel } from './ui'

export function HistoryView() {
  const { t } = useI18n()
  const workouts = useLiveQuery(() => db.workouts.orderBy('startedAt').reverse().toArray(), [])
  if (!workouts) return null
  return (
    <div className="page">
      <header className="page-head">
        <h1>{t('tabHistory')}</h1>
      </header>
      {!workouts.length && <p className="muted">{t('historyEmpty')}</p>}
      {workouts.map((w) => (
        <WorkoutSummary key={w.id} workout={w} deletable />
      ))}
    </div>
  )
}

export function WorkoutSummary({ workout, deletable }: { workout: Workout; deletable?: boolean }) {
  const { t, lang } = useI18n()
  const { openExercise } = useNav()
  const [open, setOpen] = useState(false)
  const data = useLiveQuery(async () => {
    const sets = await db.sets.where('workoutId').equals(workout.id).sortBy('createdAt')
    const ids = [...new Set([...workout.exerciseIds, ...sets.map((s) => s.exerciseId)])].filter((id) =>
      sets.some((s) => s.exerciseId === id),
    )
    const exercises = await db.exercises.bulkGet(ids)
    const plan = workout.planId ? await db.plans.get(workout.planId) : undefined
    return { plan, sets, groups: ids.map((id, i) => ({ id, exercise: exercises[i], sets: sets.filter((s) => s.exerciseId === id) })) }
  }, [workout])
  if (!data) return null

  const locale = lang === 'de' ? 'de-DE' : 'en-GB'
  const started = new Date(workout.startedAt)
  const weekday = started.toLocaleDateString(locale, { weekday: 'long' })
  const month = started.toLocaleDateString(locale, { month: 'short' }).replace('.', '')
  const mins = workout.endedAt ? Math.round((workout.endedAt - workout.startedAt) / 60000) : undefined

  const remove = async () => {
    if (!confirm(t('discardConfirm'))) return
    await db.transaction('rw', db.workouts, db.sets, async () => {
      await db.sets.where('workoutId').equals(workout.id).delete()
      await db.workouts.delete(workout.id)
    })
  }

  return (
    <article className="card history-card">
      <button className="history-head" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className="date-tile">
          <strong>{started.getDate()}</strong>
          <span>{month}</span>
        </span>
        <div className="grow min0">
          <strong className="clamp block">{data.plan?.name ?? weekday}</strong>
          <div className="muted small">
            {workout.logged ? (
              t('loggedEntry')
            ) : (
              <>
                {mins !== undefined ? `${mins} ${t('minutes')}` : t('inProgress')} · {data.groups.length}{' '}
                {t('exercises')} · {data.sets.length} {t('sets')}
              </>
            )}
          </div>
        </div>
        <Icon name="chevronDown" size={20} className={`chev ${open ? 'flip' : ''}`} />
      </button>
      {!open && (
        <p className="small muted clamp">{data.groups.map((g) => exerciseName(g.exercise, t)).join(', ')}</p>
      )}
      {open && (
        <>
          <ul className="history-list">
            {data.groups.map((g) => (
              <li key={g.id}>
                <button className="link" onClick={() => openExercise(g.id)}>
                  {exerciseName(g.exercise, t)}
                </button>
                <span className="muted small">
                  {g.sets
                    .map((s) => setLabel(s, g.exercise, t, lang))
                    .join(' · ')}
                </span>
              </li>
            ))}
          </ul>
          {deletable && (
            <button className="btn ghost small danger-text" onClick={remove}>
              {t('deleteWorkout')}
            </button>
          )}
        </>
      )}
    </article>
  )
}

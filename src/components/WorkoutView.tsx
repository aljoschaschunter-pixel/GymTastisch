import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef, useState } from 'react'
import { activeWorkout, db, estimate1RM, lastSessionSets, uid, type Exercise, type Workout, type WorkoutSet } from '../db'
import { setKeepAwake, unlockAudio } from '../device'
import { useI18n } from '../i18n'
import { useNav } from '../nav'
import { exerciseName } from '../seed'
import { useSettings } from '../settings'
import { ExercisePicker } from './ExercisePicker'
import { useRest } from './RestTimer'
import { WorkoutSummary } from './HistoryView'
import { fmt, Photo, Sheet, Stepper } from './ui'

export function WorkoutView() {
  const { t } = useI18n()
  const { settings } = useSettings()
  const { stop } = useRest()
  const workout = useLiveQuery(activeWorkout, [], null)
  const [picking, setPicking] = useState(false)

  useEffect(() => {
    setKeepAwake(!!workout && settings.keepAwake)
  }, [workout, settings.keepAwake])

  // A fresh workout goes straight to picking the first exercise.
  const autoOpened = useRef<string>(undefined)
  useEffect(() => {
    if (workout && !workout.exerciseIds.length && autoOpened.current !== workout.id) {
      autoOpened.current = workout.id
      if (Date.now() - workout.startedAt < 5000) setPicking(true)
    }
  }, [workout])

  if (workout === null) return null // loading

  if (!workout) return <StartScreen />

  const addExercise = async (id: string) => {
    setPicking(false)
    if (!workout.exerciseIds.includes(id)) {
      await db.workouts.update(workout.id, { exerciseIds: [...workout.exerciseIds, id] })
    }
    setTimeout(() => document.getElementById(`ex-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  const finish = async () => {
    const count = await db.sets.where('workoutId').equals(workout.id).count()
    if (!count) {
      await db.workouts.delete(workout.id)
    } else {
      if (!confirm(t('finishConfirm'))) return
      await db.workouts.update(workout.id, { endedAt: Date.now() })
    }
    stop()
  }

  const discard = async () => {
    if (!confirm(t('discardConfirm'))) return
    await db.transaction('rw', db.workouts, db.sets, async () => {
      await db.sets.where('workoutId').equals(workout.id).delete()
      await db.workouts.delete(workout.id)
    })
    stop()
  }

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>{t('tabWorkout')}</h1>
          <Elapsed since={workout.startedAt} />
        </div>
        <button className="btn primary small" onClick={finish}>
          {t('finishWorkout')}
        </button>
      </header>

      {workout.exerciseIds.map((id) => (
        <ExerciseCard key={id} workout={workout} exerciseId={id} />
      ))}

      <button className="btn secondary full add-ex" onClick={() => setPicking(true)}>
        + {t('addExercise')}
      </button>
      <button className="btn ghost full danger-text" onClick={discard}>
        {t('discardWorkout')}
      </button>

      {picking && (
        <Sheet title={t('addExercise')} onClose={() => setPicking(false)}>
          <ExercisePicker selected={workout.exerciseIds} onPick={addExercise} />
        </Sheet>
      )}
    </div>
  )
}

function StartScreen() {
  const { t } = useI18n()
  const recent = useLiveQuery(
    () => db.workouts.orderBy('startedAt').reverse().filter((w) => !!w.endedAt).limit(3).toArray(),
    [],
  )
  const start = async () => {
    unlockAudio()
    await db.workouts.add({ id: uid(), startedAt: Date.now(), exerciseIds: [] })
  }
  return (
    <div className="page">
      <div className="hero">
        <div className="hero-logo">💪</div>
        <h1>{t('noActiveWorkout')}</h1>
        <p className="muted">{t('noActiveHint')}</p>
        <button className="btn primary big" onClick={start}>
          {t('startWorkout')}
        </button>
      </div>
      {!!recent?.length && (
        <section>
          <h3 className="group-title">{t('recentWorkouts')}</h3>
          {recent.map((w) => (
            <WorkoutSummary key={w.id} workout={w} />
          ))}
        </section>
      )}
    </div>
  )
}

function Elapsed({ since }: { since: number }) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15_000)
    return () => clearInterval(id)
  }, [])
  const { t } = useI18n()
  return (
    <span className="muted">
      {Math.max(0, Math.floor((now - since) / 60000))} {t('minutes')}
    </span>
  )
}

function ExerciseCard({ workout, exerciseId }: { workout: Workout; exerciseId: string }) {
  const { t, lang } = useI18n()
  const { settings } = useSettings()
  const { openExercise } = useNav()
  const rest = useRest()
  const exercise = useLiveQuery(() => db.exercises.get(exerciseId), [exerciseId])
  const sets = useLiveQuery(
    () => db.sets.where({ workoutId: workout.id, exerciseId }).sortBy('createdAt'),
    [workout.id, exerciseId],
  )
  const previous = useLiveQuery(() => lastSessionSets(exerciseId, workout.id), [exerciseId, workout.id])

  const [weight, setWeight] = useState<number>()
  const [reps, setReps] = useState<number>()
  const [editing, setEditing] = useState<WorkoutSet>()
  const [pr, setPr] = useState(false)

  // Prefill with the last set of today, otherwise what you did last time.
  useEffect(() => {
    if (!sets || !previous || weight !== undefined) return
    const last = sets.at(-1) ?? previous[0]
    setWeight(last?.weight ?? 20)
    setReps(last?.reps ?? 10)
  }, [sets, previous, weight])

  if (!exercise || !sets || weight === undefined || reps === undefined) return null

  const saveSet = async () => {
    unlockAudio()
    const best = await bestEstimate(exerciseId)
    await db.sets.add({ id: uid(), workoutId: workout.id, exerciseId, weight, reps, createdAt: Date.now() })
    rest.start(exercise.restSeconds ?? settings.defaultRest)
    if (best > 0 && weight > 0 && estimate1RM(weight, reps) > best) {
      setPr(true)
      setTimeout(() => setPr(false), 4000)
    }
  }

  const remove = async () => {
    if (sets.length && !confirm(t('discardConfirm'))) return
    await db.transaction('rw', db.workouts, db.sets, async () => {
      await db.sets.where({ workoutId: workout.id, exerciseId }).delete()
      await db.workouts.update(workout.id, { exerciseIds: workout.exerciseIds.filter((x) => x !== exerciseId) })
    })
  }

  return (
    <article className="card" id={`ex-${exerciseId}`}>
      <header className="card-head">
        <button className="card-title" onClick={() => openExercise(exerciseId)}>
          {exercise.photo && <Photo blob={exercise.photo} className="thumb" />}
          <span>
            <strong>{exerciseName(exercise, t)}</strong>
            {exercise.notes && <small className="muted block">{exercise.notes}</small>}
          </span>
        </button>
        <button className="icon-btn muted" onClick={remove} aria-label={t('removeFromWorkout')}>
          ✕
        </button>
      </header>

      <p className="muted small">
        {previous?.length
          ? `${t('lastTime')}: ${previous.map((s) => `${fmt(s.weight, lang)}×${s.reps}`).join(' · ')}`
          : t('firstTime')}
      </p>

      {!!sets.length && (
        <ol className="sets">
          {sets.map((s, i) => (
            <li key={s.id}>
              <button onClick={() => setEditing(s)}>
                <span className="set-no">{i + 1}</span>
                <span>
                  {fmt(s.weight, lang)} kg × {s.reps}
                </span>
              </button>
            </li>
          ))}
        </ol>
      )}

      {pr && <div className="pr-badge">🏆 {t('newPR')}</div>}

      <div className="entry">
        <Stepper label={`${t('weight')} (kg)`} value={weight} onChange={setWeight} step={settings.weightStep} />
        <Stepper label={t('reps')} value={reps} onChange={setReps} step={1} />
      </div>
      <button className="btn primary full" onClick={saveSet}>
        ✓ {t('saveSet')} {sets.length + 1}
      </button>

      {editing && <EditSetSheet set={editing} exercise={exercise} onClose={() => setEditing(undefined)} />}
    </article>
  )
}

async function bestEstimate(exerciseId: string) {
  const all = await db.sets.where('exerciseId').equals(exerciseId).toArray()
  return all.reduce((m, s) => Math.max(m, estimate1RM(s.weight, s.reps)), 0)
}

export function EditSetSheet({ set, exercise, onClose }: { set: WorkoutSet; exercise?: Exercise; onClose: () => void }) {
  const { t } = useI18n()
  const { settings } = useSettings()
  const [weight, setWeight] = useState(set.weight)
  const [reps, setReps] = useState(set.reps)
  return (
    <Sheet title={`${t('editSet')}${exercise ? ` · ${exerciseName(exercise, t)}` : ''}`} onClose={onClose}>
      <div className="entry">
        <Stepper label={`${t('weight')} (kg)`} value={weight} onChange={setWeight} step={settings.weightStep} />
        <Stepper label={t('reps')} value={reps} onChange={setReps} step={1} />
      </div>
      <button
        className="btn primary full"
        onClick={async () => {
          await db.sets.update(set.id, { weight, reps })
          onClose()
        }}
      >
        {t('save')}
      </button>
      <button
        className="btn ghost full danger-text"
        onClick={async () => {
          await db.sets.delete(set.id)
          onClose()
        }}
      >
        {t('deleteSet')}
      </button>
    </Sheet>
  )
}

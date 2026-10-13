import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { db, estimate1RM, MUSCLE_GROUPS, uid, type Exercise, type MuscleGroup, type WorkoutSet } from '../db'
import { useI18n, type Key } from '../i18n'
import { useNav } from '../nav'
import { exerciseName } from '../seed'
import { useSettings } from '../settings'
import { Chart } from './Chart'
import { groupByMuscle, useExerciseList } from './ExercisePicker'
import { EditSetSheet } from './WorkoutView'
import { ExerciseThumb, fmt, Photo, Sheet, shrinkImage } from './ui'

export function ExercisesView() {
  const { t } = useI18n()
  const { openExercise } = useNav()
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)
  const { list } = useExerciseList(query)

  return (
    <div className="page">
      <header className="page-head">
        <h1>{t('tabExercises')}</h1>
        <button className="btn primary small" onClick={() => setCreating(true)}>
          + {t('newExercise')}
        </button>
      </header>
      <input
        className="search"
        type="search"
        placeholder={t('searchExercises')}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {!list.length && <p className="muted">{t('noResults')}</p>}
      {groupByMuscle(list).map(({ group, items }) => (
        <section key={group}>
          <h3 className="group-title">{t(`group_${group}` as Key)}</h3>
          <ul className="list">
            {items.map(({ e, name }) => (
              <li key={e.id}>
                <button className="list-item" onClick={() => openExercise(e.id)}>
                  <ExerciseThumb exercise={e} />
                  <span className="grow">{name}</span>
                  <span className="chev">›</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {creating && (
        <ExerciseForm
          initialName={query}
          onClose={(id) => {
            setCreating(false)
            if (id) openExercise(id)
          }}
        />
      )}
    </div>
  )
}

const REST_OPTIONS = [45, 60, 90, 120, 150, 180, 240, 300]

export function ExerciseForm({
  exercise,
  initialName = '',
  onClose,
}: {
  exercise?: Exercise
  initialName?: string
  onClose: (id?: string) => void
}) {
  const { t } = useI18n()
  const { settings } = useSettings()
  const builtinName = exercise?.builtin ? t(`ex_${exercise.builtin}` as Key) : ''
  const [name, setName] = useState(exercise?.name ?? (exercise ? '' : initialName))
  const [group, setGroup] = useState<MuscleGroup>(exercise?.group ?? 'other')
  const [notes, setNotes] = useState(exercise?.notes ?? '')
  const [photo, setPhoto] = useState<Blob | undefined>(exercise?.photo)
  const [restSeconds, setRestSeconds] = useState<number | undefined>(exercise?.restSeconds)

  const canSave = !!name.trim() || !!exercise?.builtin

  const save = async () => {
    if (!canSave) return
    const data = { name: name.trim() || undefined, group, notes: notes.trim() || undefined, photo, restSeconds }
    if (exercise) {
      await db.exercises.update(exercise.id, data)
      onClose(exercise.id)
    } else {
      const id = uid()
      await db.exercises.add({ id, createdAt: Date.now(), ...data })
      onClose(id)
    }
  }

  const archive = async () => {
    if (!exercise || !confirm(t('archiveConfirm'))) return
    await db.exercises.update(exercise.id, { archived: true })
    onClose()
  }

  return (
    <Sheet title={exercise ? t('editExercise') : t('newExercise')} onClose={() => onClose()}>
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault()
          void save()
        }}
      >
        <label>
          {t('name')}
          <input value={name} placeholder={builtinName} onChange={(e) => setName(e.target.value)} autoFocus={!exercise} />
        </label>
        <label>
          {t('group')}
          <select value={group} onChange={(e) => setGroup(e.target.value as MuscleGroup)}>
            {MUSCLE_GROUPS.map((g) => (
              <option key={g} value={g}>
                {t(`group_${g}` as Key)}
              </option>
            ))}
          </select>
        </label>
        <div className="field">
          <span>{t('photo')}</span>
          {photo && <Photo blob={photo} className="photo-preview" />}
          <div className="row">
            <label className="btn secondary small file-btn">
              {photo ? t('changePhoto') : `📷 ${t('addPhoto')}`}
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={async (e) => {
                  const f = e.target.files?.[0]
                  if (f) setPhoto(await shrinkImage(f))
                }}
              />
            </label>
            {photo && (
              <button type="button" className="btn ghost small danger-text" onClick={() => setPhoto(undefined)}>
                {t('removePhoto')}
              </button>
            )}
          </div>
        </div>
        <label>
          {t('notes')}
          <textarea value={notes} rows={3} placeholder={t('notesPlaceholder')} onChange={(e) => setNotes(e.target.value)} />
        </label>
        <label>
          {t('restTime')}
          <select
            value={restSeconds ?? ''}
            onChange={(e) => setRestSeconds(e.target.value ? Number(e.target.value) : undefined)}
          >
            <option value="">
              {t('restDefault')} ({mmss(settings.defaultRest)})
            </option>
            {REST_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {mmss(s)}
              </option>
            ))}
          </select>
        </label>
        <button className="btn primary full" disabled={!canSave}>
          {t('save')}
        </button>
        {exercise && (
          <button type="button" className="btn ghost full danger-text" onClick={archive}>
            {t('archive')}
          </button>
        )}
      </form>
    </Sheet>
  )
}

export const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

interface Session {
  workoutId: string
  date: number
  sets: WorkoutSet[]
  top: number
  e1rm: number
  volume: number
}

export function ExerciseDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const { t, lang } = useI18n()
  const exercise = useLiveQuery(() => db.exercises.get(id), [id])
  const sets = useLiveQuery(() => db.sets.where('exerciseId').equals(id).sortBy('createdAt'), [id])
  const [editing, setEditing] = useState(false)
  const [editSet, setEditSet] = useState<WorkoutSet>()
  const [metric, setMetric] = useState<'e1rm' | 'top' | 'volume'>('e1rm')

  const sessions = useMemo<Session[]>(() => {
    const map = new Map<string, Session>()
    for (const s of sets ?? []) {
      let x = map.get(s.workoutId)
      if (!x) map.set(s.workoutId, (x = { workoutId: s.workoutId, date: s.createdAt, sets: [], top: 0, e1rm: 0, volume: 0 }))
      x.sets.push(s)
      x.top = Math.max(x.top, s.weight)
      x.e1rm = Math.max(x.e1rm, estimate1RM(s.weight, s.reps))
      x.volume += s.weight * s.reps
    }
    return [...map.values()]
  }, [sets])

  if (!exercise || !sets) return null

  const best = sessions.reduce((m, s) => Math.max(m, s.e1rm), 0)
  const top = sessions.reduce((m, s) => Math.max(m, s.top), 0)
  const locale = lang === 'de' ? 'de-DE' : 'en-GB'
  const shortDate = (d: number) => new Date(d).toLocaleDateString(locale, { day: 'numeric', month: 'short' })

  return (
    <div className="page detail">
      <header className="page-head">
        <button className="btn ghost small back" onClick={onBack}>
          ‹ {t('back')}
        </button>
        <button className="btn secondary small" onClick={() => setEditing(true)}>
          ✎ {t('editExercise')}
        </button>
      </header>
      <h1>{exerciseName(exercise, t)}</h1>
      <p className="muted small">{t(`group_${exercise.group}` as Key)}</p>
      {(exercise.photo || exercise.builtin) && <ExerciseThumb exercise={exercise} className="photo-large" />}
      {exercise.notes && <p className="notes">{exercise.notes}</p>}

      <h2>{t('progress')}</h2>
      {!sessions.length ? (
        <p className="muted">{t('noHistory')}</p>
      ) : (
        <>
          <div className="stats">
            <div>
              <span className="stat-value">{fmt(Math.round(best * 10) / 10, lang)}</span>
              <span className="muted small">{t('est1rm')} (kg)</span>
            </div>
            <div>
              <span className="stat-value">{fmt(top, lang)}</span>
              <span className="muted small">{t('topWeight')} (kg)</span>
            </div>
            <div>
              <span className="stat-value">{sessions.length}</span>
              <span className="muted small">{t('sessions')}</span>
            </div>
          </div>
          <div className="segmented">
            {(['e1rm', 'top', 'volume'] as const).map((m) => (
              <button key={m} className={metric === m ? 'active' : ''} onClick={() => setMetric(m)}>
                {m === 'e1rm' ? t('est1rm') : m === 'top' ? t('topWeight') : t('volume')}
              </button>
            ))}
          </div>
          <Chart
            points={sessions.map((s) => ({ x: s.date, y: s[metric], label: shortDate(s.date) }))}
            format={(v) => fmt(Math.round(v), lang)}
          />
          <ul className="history-list">
            {[...sessions].reverse().map((s) => (
              <li key={s.workoutId}>
                <strong>{shortDate(s.date)}</strong>
                <span className="set-chips">
                  {s.sets.map((x) => (
                    <button key={x.id} className="chip" onClick={() => setEditSet(x)}>
                      {fmt(x.weight, lang)}×{x.reps}
                    </button>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
      {editing && <ExerciseForm exercise={exercise} onClose={() => setEditing(false)} />}
      {editSet && <EditSetSheet set={editSet} exercise={exercise} onClose={() => setEditSet(undefined)} />}
    </div>
  )
}

import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { db, MAX_PLANS, uid, type Plan } from '../db'
import { unlockAudio } from '../device'
import { useI18n } from '../i18n'
import { exerciseName } from '../seed'
import { ExercisePicker } from './ExercisePicker'
import { ExerciseThumb, Sheet } from './ui'

export async function startWorkout(plan?: Plan) {
  unlockAudio()
  await db.workouts.add({
    id: uid(),
    startedAt: Date.now(),
    exerciseIds: plan ? [...plan.exerciseIds] : [],
    planId: plan?.id,
  })
}

/** Training days on the start screen: tap one to start it, ✎ to edit. */
export function PlansSection() {
  const { t } = useI18n()
  const plans = useLiveQuery(() => db.plans.orderBy('order').toArray(), [])
  const exercises = useLiveQuery(() => db.exercises.toArray(), [])
  const [editing, setEditing] = useState<Plan | 'new'>()
  if (!plans || !exercises) return null
  const byId = new Map(exercises.map((e) => [e.id, e]))

  return (
    <section className="plans">
      <div className="section-head">
        <h3 className="group-title">{t('trainingDays')}</h3>
        {plans.length < MAX_PLANS && (
          <button className="btn ghost small" onClick={() => setEditing('new')}>
            + {t('newDay')}
          </button>
        )}
      </div>
      {!plans.length && <p className="hint">{t('daysHint')}</p>}
      {plans.map((p) => (
        <div key={p.id} className="plan-card">
          <button className="plan-start" onClick={() => void startWorkout(p)}>
            <strong>{p.name}</strong>
            <span className="muted small clamp">
              {p.exerciseIds.length
                ? p.exerciseIds.map((id) => exerciseName(byId.get(id), t)).join(', ')
                : t('noExercisesYet')}
            </span>
          </button>
          <button className="icon-btn" onClick={() => setEditing(p)} aria-label={t('editDay')}>
            ✎
          </button>
        </div>
      ))}
      {editing && <PlanEditor plan={editing === 'new' ? undefined : editing} count={plans.length} onClose={() => setEditing(undefined)} />}
    </section>
  )
}

function PlanEditor({ plan, count, onClose }: { plan?: Plan; count: number; onClose: () => void }) {
  const { t } = useI18n()
  const [name, setName] = useState(plan?.name ?? '')
  const [ids, setIds] = useState<string[]>(plan?.exerciseIds ?? [])
  const [picking, setPicking] = useState(false)
  const exercises = useLiveQuery(() => db.exercises.bulkGet(ids), [ids])

  const move = (i: number, d: number) => {
    const next = [...ids]
    ;[next[i], next[i + d]] = [next[i + d], next[i]]
    setIds(next)
  }

  const save = async () => {
    const data = { name: name.trim() || t('dayN', { n: count + (plan ? 0 : 1) }), exerciseIds: ids }
    if (plan) await db.plans.update(plan.id, data)
    else await db.plans.add({ id: uid(), order: Date.now(), ...data })
    onClose()
  }

  const remove = async () => {
    if (!plan || !confirm(t('deleteDayConfirm'))) return
    await db.plans.delete(plan.id)
    onClose()
  }

  return (
    <Sheet title={plan ? t('editDay') : t('newDay')} onClose={onClose}>
      <div className="form">
        <label>
          {t('dayName')}
          <input value={name} placeholder={t('dayNamePlaceholder')} onChange={(e) => setName(e.target.value)} />
        </label>
        <div className="field">
          <span>{t('tabExercises')}</span>
          {!ids.length && <p className="muted small">{t('noExercisesYet')}</p>}
          <ul className="list">
            {ids.map((id, i) => {
              const e = exercises?.[i]
              return (
                <li key={id} className="plan-row">
                  {e && <ExerciseThumb exercise={e} />}
                  <span className="grow">{exerciseName(e, t)}</span>
                  <button className="icon-btn" disabled={i === 0} onClick={() => move(i, -1)} aria-label={t('moveUp')}>
                    ↑
                  </button>
                  <button
                    className="icon-btn"
                    disabled={i === ids.length - 1}
                    onClick={() => move(i, 1)}
                    aria-label={t('moveDown')}
                  >
                    ↓
                  </button>
                  <button
                    className="icon-btn danger-text"
                    onClick={() => setIds(ids.filter((x) => x !== id))}
                    aria-label={t('removeFromWorkout')}
                  >
                    ✕
                  </button>
                </li>
              )
            })}
          </ul>
          <button type="button" className="btn secondary full" onClick={() => setPicking(true)}>
            + {t('addExercise')}
          </button>
        </div>
        <button className="btn primary full" onClick={save} disabled={!plan && count >= MAX_PLANS}>
          {t('save')}
        </button>
        {plan && (
          <button className="btn ghost full danger-text" onClick={remove}>
            {t('deleteDay')}
          </button>
        )}
      </div>
      {picking && (
        <Sheet title={t('addExercise')} onClose={() => setPicking(false)}>
          <ExercisePicker
            selected={ids}
            onPick={(id) => {
              if (!ids.includes(id)) setIds([...ids, id])
              setPicking(false)
            }}
          />
        </Sheet>
      )}
    </Sheet>
  )
}

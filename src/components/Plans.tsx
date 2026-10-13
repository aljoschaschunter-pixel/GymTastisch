import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { db, MAX_PLANS, uid, type Plan, type Workout } from '../db'
import { unlockAudio } from '../device'
import { useI18n, type T } from '../i18n'
import { exerciseName } from '../seed'
import { useSettings } from '../settings'
import { DAY, weekStart, weekStreak, workoutsPerWeek } from '../weeks'
import { ExercisePicker } from './ExercisePicker'
import { WorkoutSummary } from './HistoryView'
import { Icon } from './Icon'
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

/** Start screen: guided setup on first use, then the next training day front and centre. */
export function StartScreen() {
  const { t, lang } = useI18n()
  const plans = useLiveQuery(() => db.plans.orderBy('order').toArray(), [])
  const exercises = useLiveQuery(() => db.exercises.toArray(), [])
  const done = useLiveQuery(
    () =>
      db.workouts
        .orderBy('startedAt')
        .reverse()
        .filter((w) => !!w.endedAt)
        .toArray(),
    [],
  )
  const [editing, setEditing] = useState<Plan | 'new'>()
  if (!plans || !exercises || !done) return null

  const byId = new Map(exercises.map((e) => [e.id, e]))
  const locale = lang === 'de' ? 'de-DE' : 'en-GB'
  const lastDone = new Map<string, number>()
  for (const w of done) if (w.planId && !lastDone.has(w.planId)) lastDone.set(w.planId, w.startedAt)

  const { next, eyebrow } = pickNext(plans, done, locale, t)

  const when = (p: Plan) => {
    const d = lastDone.get(p.id)
    return d ? t('lastDone', { date: relativeDay(d, locale, t('today')) }) : t('neverDone')
  }
  const editor = editing && (
    <PlanEditor
      plan={editing === 'new' ? undefined : editing}
      count={plans.length}
      onClose={() => setEditing(undefined)}
    />
  )
  const header = (
    <header className="start-head">
      <span className="eyebrow">
        {new Date().toLocaleDateString(locale, {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
        })}
      </span>
      <h1>{t('tabWorkout')}</h1>
    </header>
  )

  if (!plans.length) {
    return (
      <div className="page">
        {header}
        <section className="setup">
          <div className="setup-badge">
            <Icon name="dumbbell" size={28} />
          </div>
          <h2>{t('setupTitle')}</h2>
          <p className="muted">{t('setupText')}</p>
          <ol className="steps">
            {(['setupStep1', 'setupStep2', 'setupStep3'] as const).map((k, i) => (
              <li key={k}>
                <span className="step-no">{i + 1}</span>
                <span>{t(k)}</span>
              </li>
            ))}
          </ol>
          <button className="btn primary full big" onClick={() => setEditing('new')}>
            <Icon name="plus" /> {t('setupCta')}
          </button>
        </section>
        <button className="btn ghost full" onClick={() => void startWorkout()}>
          {t('trainWithoutPlan')}
        </button>
        <RecentWorkouts />
        {editor}
      </div>
    )
  }

  return (
    <div className="page">
      {header}
      <WeekCard workouts={done} plans={plans} />
      {next && (
        <section className="next-card">
          <span className="eyebrow accent">{eyebrow}</span>
          <div className="next-title">
            <h2>{next.name}</h2>
            <button className="icon-btn" onClick={() => setEditing(next)} aria-label={t('editDay')}>
              <Icon name="pencil" size={20} />
            </button>
          </div>
          <p className="muted small">
            {(next.exerciseIds.length === 1 ? t('oneExercise') : t('nExercises', { n: next.exerciseIds.length }))} · {when(next)}
          </p>
          {!!next.exerciseIds.length && (
            <div className="thumb-stack">
              {next.exerciseIds.slice(0, 5).map((id) => {
                const e = byId.get(id)
                return e ? <ExerciseThumb key={id} exercise={e} className="thumb stack-thumb" /> : null
              })}
              {next.exerciseIds.length > 5 && <span className="stack-more">+{next.exerciseIds.length - 5}</span>}
            </div>
          )}
          <button className="btn primary full big" onClick={() => void startWorkout(next)}>
            <Icon name="play" size={18} /> {t('startWorkout')}
          </button>
        </section>
      )}

      <h3 className="group-title">{t('yourDays')}</h3>
      <ul className="list plan-list">
        {plans.map((p) => (
          <li key={p.id}>
            <div className="plan-row-main">
              <button className="plan-start" onClick={() => void startWorkout(p)}>
                <span className="play-dot">
                  <Icon name="play" size={14} />
                </span>
                <span className="grow plan-text">
                  <strong>
                    {p.name}
                    {!!p.weekdays?.length && <span className="weekday-tag">{weekdayLabels(p.weekdays, lang)}</span>}
                  </strong>
                  <span className="muted small clamp">
                    {p.exerciseIds.length
                      ? p.exerciseIds.map((id) => exerciseName(byId.get(id), t)).join(', ')
                      : t('noExercisesYet')}
                  </span>
                </span>
              </button>
              <button className="icon-btn muted" onClick={() => setEditing(p)} aria-label={t('editDay')}>
                <Icon name="pencil" size={18} />
              </button>
            </div>
          </li>
        ))}
        {plans.length < MAX_PLANS && (
          <li>
            <button className="list-item add-row" onClick={() => setEditing('new')}>
              <span className="play-dot ghost">
                <Icon name="plus" size={16} />
              </span>
              <span className="grow">{t('addDay')}</span>
            </button>
          </li>
        )}
      </ul>

      <button className="btn secondary full" onClick={() => void startWorkout()}>
        {t('trainWithoutPlan')}
      </button>
      <RecentWorkouts />
      {editor}
    </div>
  )
}

/** Weekly goal ring, trained days of this week and the week streak. With `plans`, past days can be logged. */
export function WeekCard({ workouts, plans }: { workouts: Workout[]; plans?: Plan[] }) {
  const { t, lang } = useI18n()
  const { settings } = useSettings()
  const [logDay, setLogDay] = useState<number>()
  const now = Date.now()
  const monday = weekStart(now)
  const perWeek = workoutsPerWeek(workouts)
  const doneCount = perWeek.get(monday) ?? 0
  const streak = weekStreak(perWeek, now)
  const goal = settings.weeklyGoal
  const pct = Math.min(1, doneCount / goal)
  const weekdayOf = (ts: number) => (new Date(ts).getDay() + 6) % 7
  const thisWeek = workouts.filter((w) => w.startedAt >= monday)
  const trainedDays = new Set(thisWeek.map((w) => weekdayOf(w.startedAt)))
  const planned = new Set(plans?.flatMap((p) => p.weekdays ?? []))
  const todayIdx = weekdayOf(now)
  const locale = lang === 'de' ? 'de-DE' : 'en-GB'
  const dayDate = (i: number) => new Date(monday + i * DAY + DAY / 2)
  const dayNames = Array.from({ length: 7 }, (_, i) => dayDate(i).toLocaleDateString(locale, { weekday: 'narrow' }))
  const canLog = !!plans && Array.from({ length: todayIdx }, (_, i) => i).some((i) => !trainedDays.has(i))
  const R = 26
  const C = 2 * Math.PI * R

  return (
    <section className={`week-card ${pct >= 1 ? 'reached' : ''}`}>
      <div className="week-top">
        <svg className="ring" viewBox="0 0 64 64" aria-hidden>
          <circle cx="32" cy="32" r={R} className="ring-track" />
          <circle
            cx="32"
            cy="32"
            r={R}
            className="ring-fill"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - pct)}
            transform="rotate(-90 32 32)"
          />
          <text x="32" y="37" textAnchor="middle" className="ring-text">
            {doneCount}/{goal}
          </text>
        </svg>
        <div className="grow min0">
          <strong className="block">
            {pct >= 1 ? t('goalReached') : t('goalProgress', { done: doneCount, goal })}
          </strong>
          <span className="muted small streak">
            <Icon name="flame" size={15} className={streak ? 'flame on' : 'flame'} />
            {streak > 1 ? t('streakWeeks', { n: streak }) : streak === 1 ? t('streakOne') : t('startStreak')}
          </span>
        </div>
      </div>
      <div className="week-days">
        {dayNames.map((d, i) => {
          const cls = `day ${trainedDays.has(i) ? 'on' : ''} ${i === todayIdx ? 'today' : ''} ${planned.has(i) ? 'planned' : ''}`
          const content = trainedDays.has(i) ? <Icon name="check" size={14} /> : d
          return plans && i <= todayIdx ? (
            <button
              key={i}
              className={cls}
              onClick={() => setLogDay(i)}
              aria-label={dayDate(i).toLocaleDateString(locale)}
            >
              {content}
            </button>
          ) : (
            <span key={i} className={cls}>
              {content}
            </span>
          )
        })}
      </div>
      {canLog && <p className="muted small week-hint">{t('weekTapHint')}</p>}
      {logDay !== undefined && plans && (
        <LogPastSheet
          date={dayDate(logDay)}
          plans={plans}
          existing={thisWeek.filter((w) => weekdayOf(w.startedAt) === logDay)}
          onClose={() => setLogDay(undefined)}
        />
      )}
    </section>
  )
}

/** Log a workout done without the app, or remove such an entry. */
function LogPastSheet({
  date,
  plans,
  existing,
  onClose,
}: {
  date: Date
  plans: Plan[]
  existing: Workout[]
  onClose: () => void
}) {
  const { t, lang } = useI18n()
  const label = date.toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  const weekday = (date.getDay() + 6) % 7
  const log = async (plan?: Plan) => {
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 18).getTime()
    await db.workouts.add({
      id: uid(),
      startedAt: Math.min(start, Date.now() - 60_000),
      endedAt: Math.min(start + 3_600_000, Date.now()),
      exerciseIds: plan ? [...plan.exerciseIds] : [],
      planId: plan?.id,
      logged: true,
    })
    onClose()
  }
  const removable = existing.filter((w) => w.logged)
  // Days planned for this weekday first.
  const ordered = [...plans].sort(
    (a, b) => Number(!!b.weekdays?.includes(weekday)) - Number(!!a.weekdays?.includes(weekday)),
  )

  return (
    <Sheet title={t('logPastTitle', { day: label })} onClose={onClose}>
      <p className="muted small">{t('logPastHint')}</p>
      <ul className="list">
        {ordered.map((p) => (
          <li key={p.id}>
            <button className="list-item" onClick={() => void log(p)}>
              <span className="play-dot">
                <Icon name="check" size={16} />
              </span>
              <span className="grow">{p.name}</span>
            </button>
          </li>
        ))}
        <li>
          <button className="list-item" onClick={() => void log()}>
            <span className="play-dot ghost">
              <Icon name="check" size={16} />
            </span>
            <span className="grow">{t('withoutDay')}</span>
          </button>
        </li>
      </ul>
      {removable.map((w) => (
        <button
          key={w.id}
          className="btn ghost full danger-text"
          onClick={() => db.workouts.delete(w.id).then(onClose)}
        >
          <Icon name="trash" size={18} /> {t('removeLogged')}
          {w.planId ? ` · ${plans.find((p) => p.id === w.planId)?.name ?? ''}` : ''}
        </button>
      ))}
    </Sheet>
  )
}

function RecentWorkouts() {
  const { t } = useI18n()
  const recent = useLiveQuery(
    () =>
      db.workouts
        .orderBy('startedAt')
        .reverse()
        .filter((w) => !!w.endedAt)
        .limit(3)
        .toArray(),
    [],
  )
  if (!recent?.length) return null
  return (
    <section className="stack">
      <h3 className="group-title">{t('recentWorkouts')}</h3>
      {recent.map((w) => (
        <WorkoutSummary key={w.id} workout={w} />
      ))}
    </section>
  )
}

const weekdayLabels = (days: number[], lang: string) =>
  days
    .map((i) =>
      new Date(2024, 0, 1 + i)
        .toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-GB', { weekday: 'short' })
        .replace('.', ''),
    )
    .join(' · ')

/**
 * Which training day to suggest. With weekdays set: today's day if not trained yet,
 * otherwise the next scheduled one. Without: the day after the last one trained.
 */
function pickNext(plans: Plan[], done: Workout[], locale: string, t: T) {
  const today = new Date()
  const todayIdx = (today.getDay() + 6) % 7
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
  const trainedToday = done.some((w) => w.startedAt >= startOfToday)
  if (plans.some((p) => p.weekdays?.length)) {
    const todayPlan = plans.find((p) => p.weekdays?.includes(todayIdx))
    if (todayPlan && !trainedToday) return { next: todayPlan, eyebrow: t('todayPlan') }
    for (let d = 1; d <= 7; d++) {
      const p = plans.find((x) => x.weekdays?.includes((todayIdx + d) % 7))
      if (p) {
        const day = new Date(startOfToday + d * DAY + DAY / 2).toLocaleDateString(locale, { weekday: 'long' })
        return { next: p, eyebrow: todayPlan ? `${t('upNext')} · ${day}` : t('restDay', { day }) }
      }
    }
  }
  const lastPlanIdx = plans.findIndex((p) => p.id === done.find((w) => w.planId)?.planId)
  return { next: plans.length ? plans[(lastPlanIdx + 1) % plans.length] : undefined, eyebrow: t('upNext') }
}

function relativeDay(ts: number, locale: string, today: string) {
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const days = Math.round((startOf(new Date()) - startOf(new Date(ts))) / 86_400_000)
  if (days === 0) return today
  if (days < 7) return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(-days, 'day')
  return new Date(ts).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
  })
}

function PlanEditor({ plan, count, onClose }: { plan?: Plan; count: number; onClose: () => void }) {
  const { t, lang } = useI18n()
  const [name, setName] = useState(plan?.name ?? '')
  const [ids, setIds] = useState<string[]>(plan?.exerciseIds ?? [])
  const [weekdays, setWeekdays] = useState<number[]>(plan?.weekdays ?? [])
  const [picking, setPicking] = useState(false)
  const exercises = useLiveQuery(() => db.exercises.bulkGet(ids), [ids])

  const move = (i: number, d: number) => {
    const next = [...ids]
    ;[next[i], next[i + d]] = [next[i + d], next[i]]
    setIds(next)
  }

  const save = async () => {
    const data = {
      name: name.trim() || t('dayN', { n: count + (plan ? 0 : 1) }),
      exerciseIds: ids,
      weekdays: [...weekdays].sort(),
    }
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
          <span>{t('weekdays')}</span>
          <div className="weekday-picker">
            {Array.from({ length: 7 }, (_, i) => (
              <button
                key={i}
                type="button"
                className={weekdays.includes(i) ? 'on' : ''}
                aria-pressed={weekdays.includes(i)}
                onClick={() => setWeekdays(weekdays.includes(i) ? weekdays.filter((x) => x !== i) : [...weekdays, i])}
              >
                {new Date(2024, 0, 1 + i)
                  .toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-GB', { weekday: 'short' })
                  .replace('.', '')}
              </button>
            ))}
          </div>
          <small className="muted">{t('weekdaysHint')}</small>
        </div>
        <div className="field">
          <span>{t('tabExercises')}</span>
          {!ids.length && <p className="muted small">{t('noExercisesYet')}</p>}
          {!!ids.length && (
            <ul className="list">
              {ids.map((id, i) => {
                const e = exercises?.[i]
                return (
                  <li key={id} className="plan-row">
                    {e && <ExerciseThumb exercise={e} />}
                    <span className="grow">{exerciseName(e, t)}</span>
                    <button
                      className="icon-btn"
                      disabled={i === 0}
                      onClick={() => move(i, -1)}
                      aria-label={t('moveUp')}
                    >
                      <Icon name="arrowUp" size={18} />
                    </button>
                    <button
                      className="icon-btn"
                      disabled={i === ids.length - 1}
                      onClick={() => move(i, 1)}
                      aria-label={t('moveDown')}
                    >
                      <Icon name="arrowDown" size={18} />
                    </button>
                    <button
                      className="icon-btn danger-text"
                      onClick={() => setIds(ids.filter((x) => x !== id))}
                      aria-label={t('removeFromWorkout')}
                    >
                      <Icon name="x" size={18} />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
          <button type="button" className="btn secondary full" onClick={() => setPicking(true)}>
            <Icon name="plus" size={18} /> {t('addExercise')}
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

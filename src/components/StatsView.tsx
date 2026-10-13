import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { dayKey, db, estimate1RM, MUSCLE_GROUPS, type BodyWeight } from '../db'
import { useI18n, type Key, type Lang } from '../i18n'
import { useNav } from '../nav'
import { exerciseName } from '../seed'
import { DAY, prevWeek, weekStart, weekStreak } from '../weeks'
import { Chart } from './Chart'
import { Icon } from './Icon'
import { ExerciseThumb, fmt, Stepper } from './ui'

const locale = (lang: Lang) => (lang === 'de' ? 'de-DE' : 'en-GB')

const signed = (n: number, lang: Lang) => `${n > 0 ? '+' : n < 0 ? '−' : '±'}${fmt(Math.abs(n), lang)}`

export function StatsView() {
  const { t } = useI18n()
  return (
    <div className="page">
      <header className="page-head">
        <h1>{t('tabStats')}</h1>
      </header>
      <BodyWeightCard />
      <TrainingStats />
    </div>
  )
}

const RANGES = [
  { days: 30, label: 'range30' },
  { days: 90, label: 'range90' },
  { days: 365, label: 'range365' },
  { days: 0, label: 'rangeAll' },
] as const

function BodyWeightCard() {
  const { t, lang } = useI18n()
  const entries = useLiveQuery(() => db.bodyweights.orderBy('date').toArray(), [])
  const [range, setRange] = useState<number>(90)
  const [draft, setDraft] = useState<number>()
  const [showAll, setShowAll] = useState(false)
  if (!entries) return null

  const today = dayKey()
  const latest = entries.at(-1)
  const todayEntry = entries.find((e) => e.date === today)
  const value = draft ?? latest?.weight ?? 75
  const toTs = (e: BodyWeight) => new Date(`${e.date}T12:00:00`).getTime()

  const since = range ? Date.now() - range * DAY : 0
  const shown = entries.filter((e) => toTs(e) >= since)
  // Change over the selected range: latest entry vs. the first one inside it.
  const delta = shown.length > 1 ? shown[shown.length - 1].weight - shown[0].weight : undefined
  const spanDays = shown.length > 1 ? Math.round((toTs(shown[shown.length - 1]) - toTs(shown[0])) / DAY) : 0
  const short = (e: BodyWeight) =>
    new Date(toTs(e)).toLocaleDateString(locale(lang), { day: 'numeric', month: 'short' })

  const save = async () => {
    await db.bodyweights.put({ date: today, weight: Math.round(value * 10) / 10, createdAt: Date.now() })
    setDraft(undefined)
  }

  return (
    <section className="card">
      <div className="stat-card-head">
        <span className="eyebrow">{t('bodyWeight')}</span>
        {latest && (
          <div className="bw-current">
            <span className="stat-big">
              {fmt(latest.weight, lang)}
              <small> kg</small>
            </span>
            {delta !== undefined && (
              <span className="delta">
                {t('changeInDays', { delta: signed(Math.round(delta * 10) / 10, lang), n: spanDays })}
              </span>
            )}
          </div>
        )}
      </div>

      {!entries.length && <p className="muted small">{t('bodyWeightHint')}</p>}

      {entries.length > 1 && (
        <>
          <div className="segmented">
            {RANGES.map((r) => (
              <button key={r.days} className={range === r.days ? 'active' : ''} onClick={() => setRange(r.days)}>
                {t(r.label)}
              </button>
            ))}
          </div>
          {shown.length ? (
            <Chart
              points={shown.map((e) => ({ x: toTs(e), y: e.weight, label: short(e) }))}
              format={(v) => fmt(Math.round(v * 10) / 10, lang)}
              timeScale
              highlightMax={false}
            />
          ) : (
            <p className="muted small">–</p>
          )}
        </>
      )}

      <div className="bw-entry">
        <Stepper label={`${t('today')} (kg)`} value={value} onChange={setDraft} step={0.1} />
        <button className="btn primary full" onClick={save}>
          <Icon name="check" size={18} /> {todayEntry ? t('updateToday') : t('logToday')}
        </button>
      </div>

      {!!entries.length && (
        <button className="btn ghost small" onClick={() => setShowAll(!showAll)}>
          {showAll ? t('hideEntries') : `${t('allEntries')} (${entries.length})`}
          <Icon name="chevronDown" size={16} className={`chev ${showAll ? 'flip' : ''}`} />
        </button>
      )}
      {showAll && (
        <ul className="list inset">
          {[...entries].reverse().map((e) => (
            <li key={e.date} className="bw-row">
              <span className="grow">
                {new Date(toTs(e)).toLocaleDateString(locale(lang), {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
              <strong>{fmt(e.weight, lang)} kg</strong>
              <button
                className="icon-btn muted"
                onClick={() => db.bodyweights.delete(e.date)}
                aria-label={t('delete')}
              >
                <Icon name="trash" size={18} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function TrainingStats() {
  const { t, lang } = useI18n()
  const { openExercise } = useNav()
  const data = useLiveQuery(async () => {
    const [workouts, sets, exercises] = await Promise.all([
      db.workouts.filter((w) => !!w.endedAt).toArray(),
      db.sets.toArray(),
      db.exercises.toArray(),
    ])
    return { workouts, sets, exercises }
  }, [])

  const stats = useMemo(() => {
    if (!data) return undefined
    const { workouts, sets, exercises } = data
    const finished = new Set(workouts.map((w) => w.id))
    const done = sets.filter((s) => finished.has(s.workoutId))
    const byId = new Map(exercises.map((e) => [e.id, e]))

    const now = Date.now()
    const thisWeek = weekStart(now)
    const lastWeek = prevWeek(thisWeek)

    // Workouts per week, last 8 weeks (oldest first).
    const weeks: { start: number; count: number }[] = []
    for (let w = thisWeek, i = 0; i < 8; i++, w = prevWeek(w)) weeks.unshift({ start: w, count: 0 })
    const perWeek = new Map<number, number>()
    for (const w of workouts) {
      const k = weekStart(w.startedAt)
      perWeek.set(k, (perWeek.get(k) ?? 0) + 1)
    }
    for (const w of weeks) w.count = perWeek.get(w.start) ?? 0

    const streak = weekStreak(perWeek, now)

    const volume = (from: number, to: number) =>
      done.filter((s) => s.createdAt >= from && s.createdAt < to).reduce((sum, s) => sum + s.weight * s.reps, 0)
    // Compare with last week up to the same point in time, so a fresh week isn't shown as a drop.
    const volThis = volume(thisWeek, Infinity)
    const volLast = volume(lastWeek, lastWeek + (now - thisWeek))

    const groupCounts = new Map<string, number>()
    for (const s of done) {
      if (s.createdAt < now - 30 * DAY) continue
      const g = byId.get(s.exerciseId)?.group ?? 'other'
      groupCounts.set(g, (groupCounts.get(g) ?? 0) + 1)
    }
    const groups = MUSCLE_GROUPS.map((g) => ({ group: g, count: groupCounts.get(g) ?? 0 }))
      .filter((g) => g.count)
      .sort((a, b) => b.count - a.count)

    const best = new Map<string, { e1rm: number; weight: number; reps: number; at: number }>()
    for (const s of done) {
      const ex = byId.get(s.exerciseId)
      if (!ex || ex.group === 'cardio' || s.weight <= 0) continue
      const e1rm = estimate1RM(s.weight, s.reps)
      if (e1rm > (best.get(s.exerciseId)?.e1rm ?? 0)) best.set(s.exerciseId, { e1rm, weight: s.weight, reps: s.reps, at: s.createdAt })
    }
    const records = [...best.entries()]
      .map(([id, r]) => ({ id, exercise: byId.get(id)!, ...r }))
      .sort((a, b) => b.e1rm - a.e1rm)
      .slice(0, 6)

    return {
      total: workouts.length,
      thisWeekCount: perWeek.get(thisWeek) ?? 0,
      streak,
      volThis,
      volLast,
      weeks,
      groups,
      records,
    }
  }, [data])

  if (!stats) return null
  const nf = new Intl.NumberFormat(locale(lang), { maximumFractionDigits: 0 })

  if (!stats.total) {
    return (
      <>
        <h3 className="group-title">{t('overview')}</h3>
        <p className="hint">{t('statsEmpty')}</p>
      </>
    )
  }

  const volDelta = stats.volLast ? Math.round(((stats.volThis - stats.volLast) / stats.volLast) * 100) : undefined
  const maxWeek = Math.max(1, ...stats.weeks.map((w) => w.count))
  const maxGroup = Math.max(1, ...stats.groups.map((g) => g.count))
  const weekLabel = (ts: number) => new Date(ts).toLocaleDateString(locale(lang), { day: 'numeric', month: 'numeric' })

  return (
    <>
      <h3 className="group-title">{t('overview')}</h3>
      <div className="tiles">
        <div className="tile">
          <span className="stat-big">{stats.thisWeekCount}</span>
          <span className="muted small">{t('thisWeek')}</span>
        </div>
        <div className="tile">
          <span className="stat-big">{stats.streak}</span>
          <span className="muted small">{t('weekStreak')}</span>
        </div>
        <div className="tile">
          <span className="stat-big">
            {nf.format(stats.volThis)}
            <small> kg</small>
          </span>
          <span className="muted small">{t('volumeWeek')}</span>
          {volDelta !== undefined && (
            <span className={`delta ${volDelta > 0 ? 'good' : ''}`}>
              {t('vsLastWeek', { delta: `${volDelta > 0 ? '+' : volDelta < 0 ? '−' : '±'}${Math.abs(volDelta)} %` })}
            </span>
          )}
        </div>
        <div className="tile">
          <span className="stat-big">{stats.total}</span>
          <span className="muted small">{t('totalWorkouts')}</span>
        </div>
      </div>

      <h3 className="group-title">{t('workoutsPerWeek')}</h3>
      <div className="card">
        <div className="bars" role="img" aria-label={t('workoutsPerWeek')}>
          {stats.weeks.map((w, i) => (
            <div key={w.start} className={`bar-col ${i === stats.weeks.length - 1 ? 'current' : ''}`}>
              <span className="bar-value">{w.count || ''}</span>
              <span className="bar" style={{ height: `${(w.count / maxWeek) * 100}%` }} />
              <span className="bar-label">{weekLabel(w.start)}</span>
            </div>
          ))}
        </div>
      </div>

      {!!stats.groups.length && (
        <>
          <h3 className="group-title">{t('setsPerGroup')}</h3>
          <div className="card hbars">
            {stats.groups.map((g) => (
              <div key={g.group} className="hbar-row">
                <span className="hbar-label">{t(`group_${g.group}` as Key)}</span>
                <span className="hbar-track">
                  <span className="hbar" style={{ width: `${(g.count / maxGroup) * 100}%` }} />
                </span>
                <span className="hbar-value">{g.count}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {!!stats.records.length && (
        <>
          <h3 className="group-title">{t('records')}</h3>
          <ul className="list">
            {stats.records.map((r) => (
              <li key={r.id}>
                <button className="list-item" onClick={() => openExercise(r.id)}>
                  <ExerciseThumb exercise={r.exercise} />
                  <span className="grow min0">
                    <span className="clamp block">{exerciseName(r.exercise, t)}</span>
                    <span className="muted small">
                      {fmt(r.weight, lang)} kg × {r.reps} ·{' '}
                      {new Date(r.at).toLocaleDateString(locale(lang), { day: 'numeric', month: 'short' })}
                    </span>
                  </span>
                  <span className="record-value">
                    {fmt(Math.round(r.e1rm * 10) / 10, lang)}
                    <small> kg</small>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <p className="muted small center">{t('recordsHint')}</p>
        </>
      )}
    </>
  )
}

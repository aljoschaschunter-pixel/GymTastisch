import { useEffect, useState } from 'react'
import type { Exercise } from '../db'
import { useI18n, type Key } from '../i18n'
import { exerciseMuscles } from '../muscles'
import { exerciseName } from '../seed'
import type { ExerciseTips } from '../tips'
import { Icon } from './Icon'
import { Sheet } from './ui'

/** Built-in exercises come with technique tips; custom ones do not. */
const hasTips = (e: Exercise) => !!e.builtin

/** Card on the exercise page that opens the tips. */
export function TipsCard({ exercise }: { exercise: Exercise }) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  if (!hasTips(exercise)) return null
  return (
    <>
      <button className="tips-card" onClick={() => setOpen(true)}>
        <span className="tips-icon">
          <Icon name="bulb" size={20} />
        </span>
        <span className="grow">
          <strong className="block">{t('techniqueTips')}</strong>
          <span className="muted small">{t('tipsTeaser')}</span>
        </span>
        <Icon name="chevronRight" size={18} className="chev" />
      </button>
      {open && <TipsSheet exercise={exercise} onClose={() => setOpen(false)} />}
    </>
  )
}

/** Small chip next to the rep goal during a workout. */
export function TipsChip({ exercise }: { exercise: Exercise }) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  if (!hasTips(exercise)) return null
  return (
    <>
      <button className="meta-chip tips-chip" onClick={() => setOpen(true)}>
        <Icon name="bulb" size={15} /> {t('tips')}
      </button>
      {open && <TipsSheet exercise={exercise} onClose={() => setOpen(false)} />}
    </>
  )
}

function TipsSheet({ exercise, onClose }: { exercise: Exercise; onClose: () => void }) {
  const { t, lang } = useI18n()
  const [all, setAll] = useState<{ tips: Record<string, ExerciseTips>; sources: Record<string, string> }>()

  useEffect(() => {
    void import('../tips').then((m) => setAll({ tips: m.TIPS, sources: m.SOURCES }))
  }, [])

  const entry = exercise.builtin ? all?.tips[exercise.builtin] : undefined
  const tips = entry?.[lang]
  const shares = Object.entries(exerciseMuscles(exercise))
  const target = shares.filter(([, v]) => v >= 1).map(([m]) => t(`muscle_${m}` as Key))
  const assist = shares.filter(([, v]) => v >= 0.25 && v < 1).map(([m]) => t(`muscle_${m}` as Key))

  return (
    <Sheet title={`${t('techniqueTips')} · ${exerciseName(exercise, t)}`} onClose={onClose}>
      {!tips ? null : (
        <div className="tips">
          {!!target.length && (
            <div className="meta-row">
              <span className="meta-chip">
                {t('tipsTarget')}: <strong>{target.join(', ')}</strong>
              </span>
              {!!assist.length && (
                <span className="meta-chip">
                  {t('tipsAssist')}: <strong>{assist.join(', ')}</strong>
                </span>
              )}
            </div>
          )}
          <TipList title={t('tipsSetup')} items={tips.setup} />
          <TipList title={t('tipsHow')} items={tips.how} ordered />
          <section>
            <h3>{t('tipsFeel')}</h3>
            <p className="tips-feel">{tips.feel}</p>
          </section>
          <section>
            <h3>{t('tipsAvoid')}</h3>
            <ul className="tips-avoid">
              {tips.avoid.map((x) => (
                <li key={x}>
                  <Icon name="x" size={14} />
                  <span>{x}</span>
                </li>
              ))}
            </ul>
          </section>
          <p className="muted small">{t('tipsDisclaimer')}</p>
          <details className="tips-sources">
            <summary className="muted small">{t('tipsSources')}</summary>
            <ul>
              {entry.src.map((s) => (
                <li key={s} className="muted small">
                  {all!.sources[s]}
                </li>
              ))}
            </ul>
          </details>
        </div>
      )}
    </Sheet>
  )
}

function TipList({ title, items, ordered }: { title: string; items: string[]; ordered?: boolean }) {
  const List = ordered ? 'ol' : 'ul'
  return (
    <section>
      <h3>{title}</h3>
      <List className="tips-list">
        {items.map((x) => (
          <li key={x}>{x}</li>
        ))}
      </List>
    </section>
  )
}

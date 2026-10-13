import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { db, MUSCLE_GROUPS, uid, type Exercise } from '../db'
import { useI18n, type Key } from '../i18n'
import { exerciseName } from '../seed'
import { ExerciseThumb } from './ui'

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ß/g, 'ss')

export function useExerciseList(query: string) {
  const { t } = useI18n()
  const all = useLiveQuery(() => db.exercises.toArray(), [])
  return useMemo(() => {
    const q = norm(query.trim())
    const list = (all ?? [])
      .filter((e) => !e.archived)
      .map((e) => ({ e, name: exerciseName(e, t) }))
      .filter(({ name, e }) => !q || norm(name).includes(q) || norm(t(`group_${e.group}` as Key)).includes(q))
      .sort((a, b) => a.name.localeCompare(b.name))
    return { loaded: !!all, list }
  }, [all, query, t])
}

export function groupByMuscle<X extends { e: Exercise }>(list: X[]) {
  return MUSCLE_GROUPS.map((g) => ({ group: g, items: list.filter((x) => x.e.group === g) })).filter(
    (g) => g.items.length,
  )
}

export async function createExercise(name: string) {
  const id = uid()
  await db.exercises.add({ id, name: name.trim(), group: 'other', createdAt: Date.now() })
  return id
}

export function ExercisePicker({ selected, onPick }: { selected: string[]; onPick: (id: string) => void }) {
  const { t } = useI18n()
  const [query, setQuery] = useState('')
  const { list } = useExerciseList(query)
  const trimmed = query.trim()
  const exact = list.some(({ name }) => norm(name) === norm(trimmed))

  return (
    <div className="picker">
      <input
        className="search"
        type="search"
        placeholder={t('searchExercises')}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {trimmed && !exact && (
        <button className="btn secondary full" onClick={async () => onPick(await createExercise(trimmed))}>
          + {t('createNamed', { name: trimmed })}
        </button>
      )}
      {!list.length && <p className="muted">{t('noResults')}</p>}
      {groupByMuscle(list).map(({ group, items }) => (
        <section key={group}>
          <h3 className="group-title">{t(`group_${group}` as Key)}</h3>
          <ul className="list">
            {items.map(({ e, name }) => (
              <li key={e.id}>
                <button className="list-item" onClick={() => onPick(e.id)}>
                  <ExerciseThumb exercise={e} />
                  <span className="grow">{name}</span>
                  {selected.includes(e.id) && <span className="check">✓</span>}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

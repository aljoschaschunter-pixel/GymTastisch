import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { db, MUSCLE_GROUPS, uid, type Exercise, type MuscleGroup } from '../db'
import { useI18n, type Key } from '../i18n'
import { exerciseName } from '../seed'
import { Icon } from './Icon'
import { ExerciseThumb } from './ui'

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ß/g, 'ss')

/** Coarse filters for the exercise list, so a leg day only shows leg exercises. */
export const CATEGORIES = {
  all: null,
  upper: ['chest', 'back', 'shoulders', 'arms'],
  legs: ['legs'],
  core: ['core'],
  cardio: ['cardio'],
} satisfies Record<string, MuscleGroup[] | null>

export type Category = keyof typeof CATEGORIES

export function useExerciseList(query: string, category: Category = 'all') {
  const { t } = useI18n()
  const all = useLiveQuery(() => db.exercises.toArray(), [])
  return useMemo(() => {
    const q = norm(query.trim())
    const groups: MuscleGroup[] | null = CATEGORIES[category]
    const list = (all ?? [])
      .filter((e) => !e.archived && (!groups || groups.includes(e.group)))
      .map((e) => ({ e, name: exerciseName(e, t) }))
      .filter(({ name, e }) => !q || norm(name).includes(q) || norm(t(`group_${e.group}` as Key)).includes(q))
      .sort((a, b) => a.name.localeCompare(b.name))
    return { loaded: !!all, list }
  }, [all, query, category, t])
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
  const [category, setCategory] = useState<Category>('all')
  const { list } = useExerciseList(query, category)
  const trimmed = query.trim()
  const exact = list.some(({ name }) => norm(name) === norm(trimmed))

  return (
    <div className="picker">
      <SearchField value={query} onChange={setQuery} />
      <CategoryFilter value={category} onChange={setCategory} />
      {trimmed && !exact && (
        <button className="btn secondary full" onClick={async () => onPick(await createExercise(trimmed))}>
          <Icon name="plus" size={18} /> {t('createNamed', { name: trimmed })}
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
                  {selected.includes(e.id) && <Icon name="check" size={20} className="check" />}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

export function SearchField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = useI18n()
  return (
    <label className="search">
      <Icon name="search" size={18} />
      <input
        type="search"
        placeholder={t('searchExercises')}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}

export function CategoryFilter({ value, onChange }: { value: Category; onChange: (c: Category) => void }) {
  const { t } = useI18n()
  return (
    <div className="filter-chips" role="tablist">
      {(Object.keys(CATEGORIES) as Category[]).map((c) => (
        <button
          key={c}
          role="tab"
          aria-selected={value === c}
          className={value === c ? 'active' : ''}
          onClick={() => onChange(c)}
        >
          {t(`cat_${c}` as Key)}
        </button>
      ))}
    </div>
  )
}

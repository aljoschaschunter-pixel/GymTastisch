import { useCallback, useEffect, useMemo, useState } from 'react'
import { ExerciseDetail, ExercisesView } from './components/ExercisesView'
import { HistoryView } from './components/HistoryView'
import { loadRest, RestContext, RestTimerBar, saveRest, type RestState } from './components/RestTimer'
import { SettingsView } from './components/SettingsView'
import { WorkoutView } from './components/WorkoutView'
import { requestPersistence } from './db'
import { detectLang, I18nContext, makeT, type Key } from './i18n'
import { NavContext, type Tab } from './nav'
import { seedExercises } from './seed'
import { loadSettings, saveSettings, SettingsContext, type Settings } from './settings'

const TABS: { id: Tab; icon: string; label: Key }[] = [
  { id: 'workout', icon: '🏋️', label: 'tabWorkout' },
  { id: 'exercises', icon: '📋', label: 'tabExercises' },
  { id: 'history', icon: '📅', label: 'tabHistory' },
  { id: 'settings', icon: '⚙️', label: 'tabSettings' },
]

export default function App() {
  const [settings, setSettings] = useState<Settings>(loadSettings)
  const [tab, setTabState] = useState<Tab>('workout')
  const [detail, setDetail] = useState<string>()
  const [rest, setRest] = useState<RestState | null>(loadRest)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    seedExercises().finally(() => setReady(true))
    void requestPersistence()
  }, [])

  const lang = settings.lang === 'auto' ? detectLang() : settings.lang
  const i18n = useMemo(() => ({ lang, t: makeT(lang) }), [lang])
  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const settingsCtx = useMemo(
    () => ({
      settings,
      update: (patch: Partial<Settings>) =>
        setSettings((s) => {
          const next = { ...s, ...patch }
          saveSettings(next)
          return next
        }),
    }),
    [settings],
  )

  const start = useCallback((seconds: number) => {
    const r = { endAt: Date.now() + seconds * 1000, total: seconds }
    saveRest(r)
    setRest(r)
  }, [])
  const stop = useCallback(() => {
    saveRest(null)
    setRest(null)
  }, [])
  const restCtx = useMemo(() => ({ rest, start, stop }), [rest, start, stop])

  const nav = useMemo(
    () => ({
      tab,
      setTab: (t: Tab) => {
        setTabState(t)
        setDetail(undefined)
        window.scrollTo(0, 0)
      },
      openExercise: (id: string) => {
        setDetail(id)
        window.scrollTo(0, 0)
      },
    }),
    [tab],
  )

  return (
    <I18nContext.Provider value={i18n}>
      <SettingsContext.Provider value={settingsCtx}>
        <RestContext.Provider value={restCtx}>
          <NavContext.Provider value={nav}>
            <main className={rest ? 'with-rest' : ''}>
              {ready && (
                <>
                  {/* Keep the workout mounted so typed values survive a quick look elsewhere. */}
                  <div hidden={tab !== 'workout' || !!detail}>
                    <WorkoutView />
                  </div>
                  {detail ? (
                    <ExerciseDetail id={detail} onBack={() => setDetail(undefined)} />
                  ) : (
                    <>
                      {tab === 'exercises' && <ExercisesView />}
                      {tab === 'history' && <HistoryView />}
                      {tab === 'settings' && <SettingsView />}
                    </>
                  )}
                </>
              )}
            </main>
            <RestTimerBar />
            <nav className="tabbar">
              {TABS.map((x) => (
                <button
                  key={x.id}
                  className={tab === x.id ? 'active' : ''}
                  onClick={() => nav.setTab(x.id)}
                  aria-current={tab === x.id ? 'page' : undefined}
                >
                  <span className="tab-icon" aria-hidden>
                    {x.icon}
                  </span>
                  <span>{i18n.t(x.label)}</span>
                </button>
              ))}
            </nav>
          </NavContext.Provider>
        </RestContext.Provider>
      </SettingsContext.Provider>
    </I18nContext.Provider>
  )
}

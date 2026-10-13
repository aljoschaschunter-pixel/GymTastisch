import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { beep } from '../device'
import { useI18n } from '../i18n'
import { useSettings } from '../settings'

export interface RestState {
  endAt: number
  total: number
}

export const RestContext = createContext<{
  rest: RestState | null
  start: (seconds: number) => void
  stop: () => void
}>({ rest: null, start: () => {}, stop: () => {} })

export const useRest = () => useContext(RestContext)

const KEY = 'gymtastisch.rest'

export function loadRest(): RestState | null {
  try {
    const r = JSON.parse(localStorage.getItem(KEY) ?? 'null') as RestState | null
    // Forget timers that ended long ago (app was closed).
    if (r && r.endAt > Date.now() - 60_000) return r
  } catch {
    // ignore
  }
  return null
}

export function saveRest(r: RestState | null) {
  try {
    if (r) localStorage.setItem(KEY, JSON.stringify(r))
    else localStorage.removeItem(KEY)
  } catch {
    // ignore
  }
}

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

/** Bottom bar with the countdown. Uses an end timestamp, so it stays correct after the phone was locked. */
export function RestTimerBar() {
  const { rest, start, stop } = useRest()
  const { t } = useI18n()
  const { settings } = useSettings()
  // The interval only triggers re-renders; the time itself is read fresh on every render.
  const [, setTick] = useState(0)
  const firedFor = useRef<number | null>(null)

  useEffect(() => {
    if (!rest) return
    const id = setInterval(() => setTick((n) => n + 1), 250)
    return () => clearInterval(id)
  }, [rest])

  const remainingMs = rest ? rest.endAt - Date.now() : 0
  const finished = !!rest && remainingMs <= 0

  const endAt = rest?.endAt
  useEffect(() => {
    if (!endAt || !finished) return
    if (firedFor.current !== endAt) {
      firedFor.current = endAt
      // Only make noise if we were watching it end, not when reopening the app much later.
      if (settings.sound && Date.now() - endAt < 3000) beep()
    }
    const id = setTimeout(stop, 8000)
    return () => clearTimeout(id)
  }, [finished, endAt, settings.sound, stop])

  if (!rest) return null
  const remaining = Math.max(0, Math.ceil(remainingMs / 1000))
  const pct = Math.min(100, Math.max(0, (1 - remainingMs / (rest.total * 1000)) * 100))

  return (
    <div className={`rest-bar ${finished ? 'finished' : ''}`} role="timer" aria-live="polite">
      <div className="rest-progress" style={{ width: `${pct}%` }} />
      {finished ? (
        <button className="rest-content rest-done" onClick={stop}>
          <span className="rest-big">{t('restOver')}</span>
        </button>
      ) : (
        <div className="rest-content">
          <div>
            <div className="rest-label">{t('rest')}</div>
            <div className="rest-big">{mmss(remaining)}</div>
          </div>
          <div className="rest-actions">
            <button onClick={() => start(Math.max(0, remaining - 30) || 1)} aria-label="-30s">
              −30
            </button>
            <button onClick={() => start(remaining + 30)} aria-label="+30s">
              +30
            </button>
            <button onClick={stop}>{t('skip')}</button>
          </div>
        </div>
      )}
    </div>
  )
}

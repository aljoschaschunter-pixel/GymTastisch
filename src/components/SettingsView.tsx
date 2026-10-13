import { exportBackup, importBackup } from '../backup'
import { beep, unlockAudio } from '../device'
import { useI18n } from '../i18n'
import { useSettings, type Settings } from '../settings'
import { mmss } from './ExercisesView'

const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true

const REP_OPTIONS = Array.from({ length: 30 }, (_, i) => i + 1)
const MIN_OPTIONS = REP_OPTIONS.slice(0, -1)
const MAX_OPTIONS = REP_OPTIONS.slice(1)

export function SettingsView() {
  const { t } = useI18n()
  const { settings, update } = useSettings()

  return (
    <div className="page">
      <header className="page-head">
        <h1>{t('tabSettings')}</h1>
      </header>

      {!isStandalone() && <p className="hint">{t('installHint')}</p>}

      <div className="card form">
        <label>
          {t('language')}
          <select value={settings.lang} onChange={(e) => update({ lang: e.target.value as Settings['lang'] })}>
            <option value="auto">{t('langAuto')}</option>
            <option value="de">Deutsch</option>
            <option value="en">English</option>
          </select>
        </label>
        <label>
          {t('defaultRest')}
          <select value={settings.defaultRest} onChange={(e) => update({ defaultRest: Number(e.target.value) })}>
            {[45, 60, 90, 120, 150, 180, 240, 300].map((s) => (
              <option key={s} value={s}>
                {mmss(s)}
              </option>
            ))}
          </select>
        </label>
        <div className="field">
          <span>{t('repRange')}</span>
          <div className="range-row">
            <select
              value={settings.repMin}
              aria-label="min"
              onChange={(e) => {
                const repMin = Number(e.target.value)
                update({ repMin, repMax: Math.max(repMin + 1, settings.repMax) })
              }}
            >
              {MIN_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <span>–</span>
            <select
              value={settings.repMax}
              aria-label="max"
              onChange={(e) => {
                const repMax = Number(e.target.value)
                update({ repMax, repMin: Math.min(repMax - 1, settings.repMin) })
              }}
            >
              {MAX_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div className="rule-box small">
            <span className="muted">{t('repRangeHint')}</span>
            {settings.repMin > 1 && <span>⬇︎ {t('ruleDown', { n: settings.repMin - 1 })}</span>}
            {settings.repMax > settings.repMin && (
              <span>= {t('ruleKeep', { a: settings.repMin, b: settings.repMax - 1 })}</span>
            )}
            <span>⬆︎ {t('ruleUp', { n: settings.repMax })}</span>
          </div>
        </div>
        <label>
          {t('weightStep')}
          <select value={settings.weightStep} onChange={(e) => update({ weightStep: Number(e.target.value) })}>
            {[0.5, 1, 1.25, 2, 2.5, 5].map((s) => (
              <option key={s} value={s}>
                {s} kg
              </option>
            ))}
          </select>
        </label>
        <div className="toggle-row">
          <label className="toggle">
            <input type="checkbox" checked={settings.sound} onChange={(e) => update({ sound: e.target.checked })} />
            <span>{t('sound')}</span>
          </label>
          <button
            className="btn secondary small"
            onClick={() => {
              unlockAudio()
              setTimeout(beep, 100)
            }}
          >
            🔔 {t('testSound')}
          </button>
        </div>
        <label className="toggle">
          <input type="checkbox" checked={settings.keepAwake} onChange={(e) => update({ keepAwake: e.target.checked })} />
          <span>{t('keepAwake')}</span>
        </label>
      </div>

      <h2>{t('backup')}</h2>
      <div className="card">
        <p className="muted small">{t('backupHint')}</p>
        <div className="row">
          <button className="btn secondary" onClick={() => void exportBackup()}>
            ⬆︎ {t('exportData')}
          </button>
          <label className="btn secondary file-btn">
            ⬇︎ {t('importData')}
            <input
              type="file"
              accept="application/json,.json"
              hidden
              onChange={async (e) => {
                const f = e.target.files?.[0]
                e.target.value = ''
                if (!f || !confirm(t('importConfirm'))) return
                try {
                  await importBackup(f)
                  alert(t('importDone'))
                } catch {
                  alert(t('importFailed'))
                }
              }}
            />
          </label>
        </div>
      </div>
      <p className="muted small center">
        GymTastisch · {t('about')}
      </p>
    </div>
  )
}

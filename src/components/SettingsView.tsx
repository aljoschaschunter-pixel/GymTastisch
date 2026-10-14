import { exportBackup, importBackup } from '../backup'
import { beep, unlockAudio } from '../device'
import { useI18n } from '../i18n'
import { useSettings, type Settings } from '../settings'
import { reloadApp } from '../update'
import { mmss } from './ExercisesView'
import { Icon } from './Icon'
import { fmt, STEP_OPTIONS } from './ui'

const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true

const REP_OPTIONS = Array.from({ length: 30 }, (_, i) => i + 1)
const MIN_OPTIONS = REP_OPTIONS.slice(0, -1)
const MAX_OPTIONS = REP_OPTIONS.slice(1)

export function SettingsView() {
  const { t, lang } = useI18n()
  const { settings, update } = useSettings()

  return (
    <div className="page">
      <header className="page-head">
        <h1>{t('tabSettings')}</h1>
      </header>

      {!isStandalone() && <p className="hint">{t('installHint')}</p>}

      <h3 className="group-title">{t('sectionGeneral')}</h3>
      <div className="settings-group">
        <label className="set-row">
          <span>{t('language')}</span>
          <select value={settings.lang} onChange={(e) => update({ lang: e.target.value as Settings['lang'] })}>
            <option value="auto">{t('langAuto')}</option>
            <option value="de">Deutsch</option>
            <option value="en">English</option>
          </select>
        </label>
        <div className="set-row">
          <span className="grow">{t('sound')}</span>
          <button
            className="btn secondary tiny"
            onClick={() => {
              unlockAudio()
              setTimeout(beep, 100)
            }}
          >
            <Icon name="bell" size={15} /> {t('testSound')}
          </button>
          <input
            type="checkbox"
            className="switch"
            aria-label={t('sound')}
            checked={settings.sound}
            onChange={(e) => update({ sound: e.target.checked })}
          />
        </div>
        <label className="set-row switch-label">
          <span>{t('keepAwake')}</span>
          <input
            type="checkbox"
            className="switch"
            checked={settings.keepAwake}
            onChange={(e) => update({ keepAwake: e.target.checked })}
          />
        </label>
      </div>

      <h3 className="group-title">{t('sectionTraining')}</h3>
      <div className="settings-group">
        <label className="set-row">
          <span>{t('weeklyGoal')}</span>
          <select value={settings.weeklyGoal} onChange={(e) => update({ weeklyGoal: Number(e.target.value) })}>
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <option key={n} value={n}>
                {t('weeklyGoalValue', { n })}
              </option>
            ))}
          </select>
        </label>
        <label className="set-row">
          <span>{t('defaultRest')}</span>
          <select value={settings.defaultRest} onChange={(e) => update({ defaultRest: Number(e.target.value) })}>
            {[45, 60, 90, 120, 150, 180, 240, 300].map((s) => (
              <option key={s} value={s}>
                {mmss(s)}
              </option>
            ))}
          </select>
        </label>
        <label className="set-row">
          <span>{t('weightStep')}</span>
          <select value={settings.weightStep} onChange={(e) => update({ weightStep: Number(e.target.value) })}>
            {STEP_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {fmt(s, lang)} kg
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="muted small group-note">{t('stepHint')}</p>

      <h3 className="group-title">{t('sectionProgression')}</h3>
      <div className="settings-group">
        <div className="set-row">
          <span>{t('repRange')}</span>
          <span className="range-row">
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
            <span className="muted">–</span>
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
          </span>
        </div>
        <div className="rule-box">
          <span className="muted small">{t('repRangeHint')}</span>
          {settings.repMin > 1 && (
            <span className="rule down">
              <Icon name="trendDown" size={16} /> {t('ruleDown', { n: settings.repMin - 1 })}
            </span>
          )}
          {settings.repMax > settings.repMin && (
            <span className="rule keep">
              <Icon name="check" size={16} /> {t('ruleKeep', { a: settings.repMin, b: settings.repMax - 1 })}
            </span>
          )}
          <span className="rule up">
            <Icon name="trendUp" size={16} /> {t('ruleUp', { n: settings.repMax })}
          </span>
        </div>
      </div>

      <h3 className="group-title">{t('backup')}</h3>
      <div className="settings-group padded">
        <p className="muted small">{t('backupHint')}</p>
        <div className="row two">
          <button className="btn secondary" onClick={() => void exportBackup()}>
            <Icon name="upload" size={18} /> {t('exportData')}
          </button>
          <label className="btn secondary file-btn">
            <Icon name="download" size={18} /> {t('importData')}
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
      <button className="btn ghost small reload-btn" onClick={() => void reloadApp()}>
        {t('reloadApp')}
      </button>
      <p className="muted small center">
        {t('version')} {__APP_VERSION__}
      </p>
    </div>
  )
}

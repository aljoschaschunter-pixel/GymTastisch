import { useI18n } from '../i18n'
import { applyUpdate, useUpdateReady } from '../update'

/** Slides down from the top once a new version is ready. */
export function UpdateBanner() {
  const { t } = useI18n()
  const ready = useUpdateReady()
  if (!ready) return null
  return (
    <div className="update-banner" role="status">
      <span className="grow">{t('updateReady')}</span>
      <button className="btn primary small" onClick={() => void applyUpdate()}>
        {t('reloadApp')}
      </button>
    </div>
  )
}

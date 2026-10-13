import { useEffect, useState, type ReactNode } from 'react'
import { useI18n, type Lang } from '../i18n'

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  )
}

export function Photo({ blob, className, alt = '' }: { blob?: Blob; className?: string; alt?: string }) {
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    if (!blob) return setUrl(undefined)
    const u = URL.createObjectURL(blob)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [blob])
  if (!url) return null
  return <img src={url} className={className} alt={alt} />
}

export function Stepper({
  value,
  onChange,
  step,
  label,
  min = 0,
}: {
  value: number
  onChange: (v: number) => void
  step: number
  label: string
  min?: number
}) {
  const { lang } = useI18n()
  const [text, setText] = useState(fmt(value, lang))
  useEffect(() => setText(fmt(value, lang)), [value, lang])
  const commit = (s: string) => {
    const n = parseFloat(s.replace(',', '.'))
    if (!Number.isNaN(n) && n >= min) onChange(round(n))
    else setText(fmt(value, lang))
  }
  return (
    <div className="stepper">
      <span className="stepper-label">{label}</span>
      <div className="stepper-row">
        <button type="button" onClick={() => onChange(round(Math.max(min, value - step)))} aria-label={`${label} −`}>
          −
        </button>
        <input
          inputMode="decimal"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          onFocus={(e) => e.target.select()}
          aria-label={label}
        />
        <button type="button" onClick={() => onChange(round(value + step))} aria-label={`${label} +`}>
          +
        </button>
      </div>
    </div>
  )
}

const round = (n: number) => Math.round(n * 100) / 100
export const fmt = (n: number, lang: Lang) => (lang === 'de' ? String(round(n)).replace('.', ',') : String(round(n)))

/** Downscale a camera photo so the database stays small. */
export async function shrinkImage(file: File, max = 1200): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file)
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bmp.width * scale)
    canvas.height = Math.round(bmp.height * scale)
    canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height)
    return await new Promise((res) => canvas.toBlob((b) => res(b ?? file), 'image/jpeg', 0.82))
  } catch {
    return file
  }
}

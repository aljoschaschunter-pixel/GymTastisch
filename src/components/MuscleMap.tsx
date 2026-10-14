import { useI18n, type Key } from '../i18n'
import type { Muscle } from '../muscles'

/** 0 = not trained, 1 = only a trace (under one set per week), 2–4 = little / solid / a lot. */
export type Level = 0 | 1 | 2 | 3 | 4

type Part = { d: string; muscle?: Muscle }

// Left half of each figure (viewer's left) in a 120 × 222 box; the right half is mirrored.
// Later parts are drawn on top of earlier ones (side delts over the shoulder cap, adductors over the thigh).
const FRONT: Part[] = [
  { d: 'M54,30 L66,30 L67,40 L53,40 Z' },
  { muscle: 'front_delts', d: 'M45,41 C37,41 30,46 29,55 L30,63 C34,57 39,53 46,51 Z' },
  { muscle: 'side_delts', d: 'M37,42.5 C32.5,44.5 29.5,49 29,55 L30,63 C31.2,58.5 33,55.5 35.5,53.5 Z' },
  { muscle: 'chest', d: 'M48,42 L59,43 L59,66 C53,69 46,68 41,63 C40,55 43,47 48,42 Z' },
  { muscle: 'biceps', d: 'M29,66 C27,74 26,82 27,90 L34,90 C36,82 38,74 39,66 C36,63 31,63 29,66 Z' },
  { muscle: 'forearms', d: 'M27,93 C25,103 24,112 25,120 L30,120 C32,112 34,102 34,93 Z' },
  { muscle: 'abs', d: 'M50,70 L59,70 L59,108 C55,110 52,108 50,104 Z' },
  { muscle: 'obliques', d: 'M41,67 C44,69 47,70 48,72 L48,103 C44,99 42,93 41,86 C40,79 40,73 41,67 Z' },
  { muscle: 'quads', d: 'M41,108 C46,111 54,115 58,121 L57,158 C53,164 47,164 44,160 C40,146 39,126 41,108 Z' },
  { muscle: 'adductors', d: 'M50.5,115.5 C54,117 56.5,119 58,121 L57.5,146 C54,139 51.5,128 50.5,115.5 Z' },
  { muscle: 'calves', d: 'M44,169 C47,167 52,167 55,169 L54,203 C51,206 48,206 46,203 C43,193 42,181 44,169 Z' },
  { d: 'M44,162 C47,166 53,166 57,161 L55,167 C51,165 48,165 44,167 Z' },
]

const BACK: Part[] = [
  { d: 'M54,30 L66,30 L66,34 L54,34 Z' },
  { muscle: 'traps', d: 'M53,33 L60,31 L60,58 C54,52 47,46 43,43 C47,40 51,38 53,33 Z' },
  { muscle: 'rear_delts', d: 'M42,44 C35,44 30,49 29,57 L30,64 C34,58 38,55 44,53 Z' },
  { muscle: 'side_delts', d: 'M35.5,45 C32,47 29.5,51.5 29,57 L30,64 C31.2,59.5 33,56.5 35.5,54.5 Z' },
  { muscle: 'lats', d: 'M45,55 C50,57 55,60 59,62 L59,92 C52,90 47,84 43,76 C42,68 42,60 45,55 Z' },
  { muscle: 'lower_back', d: 'M51,95 L59,96 L59,107 L50,105 Z' },
  { muscle: 'triceps', d: 'M29,67 C27,75 26,82 27,90 L34,90 C36,82 38,75 39,67 C36,64 31,64 29,67 Z' },
  { muscle: 'forearms', d: 'M27,93 C25,103 24,112 25,120 L30,120 C32,112 34,102 34,93 Z' },
  { muscle: 'glutes', d: 'M42,109 C48,107 55,108 59,111 L59,128 C53,132 46,131 42,126 C40,120 40,114 42,109 Z' },
  { muscle: 'hamstrings', d: 'M42,131 C47,135 53,135 57,133 L56,159 C52,164 47,164 44,160 C41,150 41,140 42,131 Z' },
  { muscle: 'calves', d: 'M44,167 C48,165 53,165 55,168 C56,180 55,192 53,203 L47,203 C44,192 42,180 44,167 Z' },
]

function Figure({ parts, levels, x }: { parts: Part[]; levels: Record<Muscle, Level>; x: number }) {
  const shapes = parts.map((p, i) => (
    <path key={i} d={p.d} className={p.muscle ? `mm-muscle mm-l${levels[p.muscle]}` : 'mm-neutral'} />
  ))
  return (
    <g transform={`translate(${x},0)`}>
      <ellipse cx="60" cy="16" rx="10" ry="12.5" className="mm-neutral" />
      <ellipse cx="27.5" cy="126" rx="3.5" ry="5" className="mm-neutral" />
      <ellipse cx="92.5" cy="126" rx="3.5" ry="5" className="mm-neutral" />
      <ellipse cx="50" cy="210" rx="5.5" ry="4" className="mm-neutral" />
      <ellipse cx="70" cy="210" rx="5.5" ry="4" className="mm-neutral" />
      {shapes}
      <g transform="translate(120,0) scale(-1,1)">{shapes}</g>
    </g>
  )
}

/** Front and back view with each muscle shaded by how much it was trained. */
export function MuscleMap({ levels }: { levels: Record<Muscle, Level> }) {
  const { t } = useI18n()
  const label = Object.entries(levels)
    .map(([m, l]) => `${t(`muscle_${m}` as Key)}: ${l}/4`)
    .join(', ')
  return (
    <svg className="muscle-map" viewBox="0 0 250 222" role="img" aria-label={label}>
      <Figure parts={FRONT} levels={levels} x={0} />
      <Figure parts={BACK} levels={levels} x={130} />
    </svg>
  )
}

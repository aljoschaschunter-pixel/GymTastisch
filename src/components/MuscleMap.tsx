import { useI18n, type Key } from '../i18n'
import type { Muscle } from '../muscles'

/** 0 = not trained, 1 = only a trace (under one set per week), 2–4 = little / solid / a lot. */
export type Level = 0 | 1 | 2 | 3 | 4

type Part = { d: string; muscle?: Muscle }

// Left half of each figure (viewer's left) in a 120 × 222 box; the right half is mirrored.
// Later parts are drawn on top of earlier ones.
const FRONT: Part[] = [
  // neck, knee, shin
  { d: 'M54,29 L66,29 L67,39 L53,39 Z' },
  { d: 'M44,161 C47,165 53,165 57,160 L55.5,168 C51,166 48,166 44.5,168 Z' },
  { d: 'M46.5,170 C48,169 50,169 51,170 L50.5,201 L47.5,201 Z' },

  { muscle: 'traps_upper', d: 'M53.5,32 C51,36.5 46.5,39.5 41,41 C44,41.6 47,41.8 49.5,41.6 C52,39.5 54,37 55,34.5 Z' },
  { muscle: 'front_delts', d: 'M41,41.5 C35,42.5 31,46.5 30,53 L31,61 C34,55 38.5,51 45,49.5 C44,46.5 43,44 41,41.5 Z' },
  { muscle: 'side_delts', d: 'M36.5,42.6 C32,44.6 29.2,49 28.6,55 L29.6,64 C30.3,58.5 31.6,54.5 34,51.5 C34.3,48 35,45 36.5,42.6 Z' },
  { muscle: 'chest_upper', d: 'M47,42.3 C51,42 55,42.2 59.2,42.8 L59.2,51.5 C54,51.2 48,51.6 42.6,53.6 C42.5,48.8 44.2,45 47,42.3 Z' },
  { muscle: 'chest_lower', d: 'M42.4,55.3 C47.5,53.3 53.5,53 59.2,53.2 L59.2,65.5 C53,68.8 46,68 41,63 C40.6,60 41.2,57.5 42.4,55.3 Z' },

  { muscle: 'biceps_long', d: 'M30.4,63 C31.8,62 33,61.8 34.2,62 C33.3,70 33,79 32.5,88.5 L29.8,88 C28.3,80 28.4,71 30.4,63 Z' },
  { muscle: 'biceps_short', d: 'M34.2,62 C36.8,62.8 38.8,65.5 39.2,69.5 C38.4,76.5 36.6,82.8 34.4,88.8 L32.5,88.5 C33,79 33.3,70 34.2,62 Z' },
  { muscle: 'brachialis', d: 'M29.2,75 C28.6,80 28.8,85.5 29.8,90.5 L27.2,91 C26.6,85.5 27.4,79.5 29.2,75 Z' },
  { muscle: 'brachialis', d: 'M38.4,77 C38.2,82 37.2,87 35.6,90.5 L34.4,88.8 C36,85 37.4,81 38.4,77 Z' },
  { muscle: 'forearm_extensors', d: 'M27.2,92.5 C25,99.5 24,108.5 24.4,120.5 L27,120.5 C27.2,110.5 28.4,100.5 30.4,93 Z' },
  { muscle: 'forearm_flexors', d: 'M30.4,93 C32.8,92.6 35,93.4 35.5,95.6 C34.7,104 32.5,112.5 30,120.5 L27,120.5 C27.2,110.5 28.4,100.5 30.4,93 Z' },

  { muscle: 'obliques', d: 'M41.8,66 C44.8,68 47.6,69.2 49,70 L49,102.5 C45.6,99.6 43.4,94.6 42.2,88.2 C41.2,81 41,72.6 41.8,66 Z' },
  { muscle: 'abs', d: 'M50.4,69.2 L59.2,69.2 L59.2,78.6 L50.4,79.2 Z' },
  { muscle: 'abs', d: 'M50.4,80.6 L59.2,80.1 L59.2,89 L50.4,89.4 Z' },
  { muscle: 'abs', d: 'M50.4,90.8 L59.2,90.4 L59.2,99 L50.4,99.4 Z' },
  { muscle: 'abs', d: 'M50.4,100.8 L59.2,100.4 L59.2,109 C55.2,110.2 52.2,108.4 50.4,104.6 Z' },

  { muscle: 'adductors', d: 'M52.6,113.6 C55.6,115.4 57.8,117.8 59,121 L58.6,141 C57,137.4 55.6,131 54.8,124.4 C54.2,120.4 53.6,117 52.6,113.6 Z' },
  { muscle: 'vastus_lateralis', d: 'M41,109.5 C43.6,111.6 45.8,114 47,117.6 C46.2,131.6 46,145.6 46.4,158.4 C44.4,158.4 43.2,156 42.2,152 C39.2,140 39,124 41,109.5 Z' },
  { muscle: 'rectus_femoris', d: 'M47,116 C49.8,115.6 52.6,117.4 54.6,121.4 C55.4,134 54.4,146.6 52.2,155.6 C50.4,157.8 48.4,158 46.8,157 C46.4,143.6 46.4,129.6 47,116 Z' },
  { muscle: 'vastus_medialis', d: 'M54.6,137 C56.6,141.4 58.2,148 57.8,155.6 C56.4,160.6 53.4,162.6 50.2,161 C52.4,156.4 54.2,147.6 54.6,137 Z' },

  { muscle: 'gastrocnemius', d: 'M44.4,170 C45.2,169.6 46,169.8 46.5,170.6 L46.8,194 C44.4,189.4 43.2,181.6 44.4,170 Z' },
  { muscle: 'gastrocnemius', d: 'M51,169.6 C54,170.4 56,174.4 56,182 C55.4,187.8 53.4,191.4 51,193.4 Z' },
  { muscle: 'soleus', d: 'M51,195.2 C52.8,194.2 54.4,191.8 55.2,188.6 L54,202 L51,202 Z' },
]

const BACK: Part[] = [
  { d: 'M54,29 L66,29 L66,33 L54,33 Z' },
  { d: 'M44,161 C47,164.4 53,164.4 56.4,160.4 L55.4,166.4 C51,165 48,165 44.4,166.6 Z' },

  { muscle: 'traps_upper', d: 'M54.2,30.4 L60,29.6 L60,40.6 C54.6,41.2 48,42 42,43 C47,40.2 51.8,36.2 54.2,30.4 Z' },
  { muscle: 'traps_mid', d: 'M43.6,44.6 C49.2,43.6 54.6,42.6 60,42 L60,73 C57.4,67 54.2,59.6 50.4,53.6 C48,50 45.8,47 43.6,44.6 Z' },
  { muscle: 'rear_delts', d: 'M41,43.6 C35,44.4 31,48.4 30,55 L31,62 C34,56 38.4,52 44.6,50.4 C43.6,47.8 42.6,45.6 41,43.6 Z' },
  { muscle: 'side_delts', d: 'M36.4,44.4 C32,46.4 29.2,50.6 28.6,56.6 L29.6,64 C30.3,58.8 31.6,55 34,52 C34.3,49 35,46.4 36.4,44.4 Z' },
  { muscle: 'lats', d: 'M44.6,52.4 C47.4,53.6 49.6,55.6 51.6,58.6 C54.6,64.6 57,69.8 60,74.2 L60,92.6 C53.2,91.6 47.4,86.8 43.4,79 C41.4,70.6 41.6,60.6 44.6,52.4 Z' },
  { muscle: 'obliques', d: 'M42.2,82 C45,87.6 48,91.6 51.4,94.6 L51.4,104 C47.6,103 44.4,100 42.4,96 C41.8,91.6 41.8,86.6 42.2,82 Z' },
  { muscle: 'lower_back', d: 'M53.4,79.6 C55.4,82 57.6,83.6 60,84.6 L60,108 L52.4,106.4 C51.6,98 51.8,88.4 53.4,79.6 Z' },

  { muscle: 'triceps_lateral', d: 'M30.2,62.4 C31.8,61.4 33.4,61.2 35,61.8 C34.2,70 33.6,78 33.2,85.6 L30,84 C28.2,78 28.2,70 30.2,62.4 Z' },
  { muscle: 'triceps_long', d: 'M35,61.8 C37.8,62.6 39.8,65.6 40.2,69.8 C39.4,77 37.4,83 35.2,88.2 L33.2,85.6 C33.6,78 34.2,70 35,61.8 Z' },
  { muscle: 'triceps_medial', d: 'M30,84.6 L33.2,86.4 L35.2,88.6 C34.2,90.4 32.2,91.4 30.2,91.2 C29.2,89.2 29.2,86.6 30,84.6 Z' },
  { muscle: 'forearm_extensors', d: 'M27.2,92.6 C25,99.6 24,108.6 24.4,120.6 L27,120.6 C27.2,110.6 28.4,100.6 30.6,93.2 Z' },
  { muscle: 'forearm_flexors', d: 'M30.6,93.2 C33,92.8 35.2,93.6 35.6,95.8 C34.8,104 32.6,112.6 30,120.6 L27,120.6 C27.2,110.6 28.4,100.6 30.6,93.2 Z' },

  { muscle: 'glute_med', d: 'M42.4,105.4 C46.4,103.6 50.8,103.4 54.4,104.6 C50.4,107.4 46.4,110 43,113.4 C42.2,110.6 42,108 42.4,105.4 Z' },
  { muscle: 'glute_max', d: 'M43.4,114.4 C47.4,110.2 53,107.2 59.2,107.8 L59.2,128.4 C53,132.2 46.2,131.2 42.2,126.4 C41.4,122 41.8,117.8 43.4,114.4 Z' },
  { muscle: 'hamstrings_lateral', d: 'M42.2,131.2 C45,133.2 47.8,134.2 50,134.4 L49.6,160 C47.4,161.8 45.2,161.6 44,159.8 C41.4,150 41.2,140.4 42.2,131.2 Z' },
  { muscle: 'hamstrings_medial', d: 'M50,134.4 C52.8,134.4 55,134 57.2,133 L56.2,158.4 C54.2,161.6 51.6,161.8 49.6,160 Z' },

  { muscle: 'soleus', d: 'M45,184 C46.8,189 48.6,191 50.6,191.4 C52.6,191 54.4,189 55.4,185 L53.6,203.4 L47,203.4 C46,197 45.2,190.6 45,184 Z' },
  { muscle: 'gastrocnemius', d: 'M44.2,167.4 C46.6,165.6 49,165.2 50.4,166 L50.4,188.6 C47.2,188.4 45.2,184.6 44.2,178.6 C43.8,174.8 43.8,171 44.2,167.4 Z' },
  { muscle: 'gastrocnemius', d: 'M50.8,166 C53.2,165.2 55.2,166.2 56,169.2 C56.6,176.6 55,184.6 50.8,190 Z' },
]

function Figure({ parts, levels, x }: { parts: Part[]; levels: Record<Muscle, Level>; x: number }) {
  const shapes = parts.map((p, i) => (
    <path key={i} d={p.d} className={p.muscle ? `mm-muscle mm-l${levels[p.muscle]}` : 'mm-neutral'} />
  ))
  return (
    <g transform={`translate(${x},0)`}>
      <ellipse cx="60" cy="16" rx="10" ry="12.5" className="mm-neutral" />
      <ellipse cx="27.4" cy="126.4" rx="3.6" ry="5.2" className="mm-neutral" />
      <ellipse cx="92.6" cy="126.4" rx="3.6" ry="5.2" className="mm-neutral" />
      <ellipse cx="49.6" cy="209.6" rx="5.6" ry="4" className="mm-neutral" />
      <ellipse cx="70.4" cy="209.6" rx="5.6" ry="4" className="mm-neutral" />
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

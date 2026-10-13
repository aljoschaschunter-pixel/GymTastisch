interface Point {
  x: number
  y: number
  label: string
}

/** Minimal line chart: one point per session, evenly spaced. */
export function Chart({ points, format }: { points: Point[]; format: (v: number) => string }) {
  const W = 340
  const H = 170
  const pad = { l: 40, r: 12, t: 14, b: 26 }
  if (!points.length) return null

  const ys = points.map((p) => p.y)
  let min = Math.min(...ys)
  let max = Math.max(...ys)
  if (max === min) {
    min = Math.max(0, min - 5)
    max = max + 5
  }
  const span = max - min
  min = Math.max(0, min - span * 0.1)
  max = max + span * 0.1

  const x = (i: number) =>
    points.length === 1 ? (pad.l + W - pad.r) / 2 : pad.l + (i * (W - pad.l - pad.r)) / (points.length - 1)
  const y = (v: number) => pad.t + (1 - (v - min) / (max - min)) * (H - pad.t - pad.b)
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.y).toFixed(1)}`).join(' ')
  const area = `${path} L${x(points.length - 1).toFixed(1)},${H - pad.b} L${x(0).toFixed(1)},${H - pad.b} Z`
  const ticks = [min, (min + max) / 2, max]
  const bestIdx = ys.indexOf(Math.max(...ys))

  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img">
      <defs>
        <linearGradient id="chart-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="var(--accent)" stopOpacity="0.35" />
          <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {ticks.map((v) => (
        <g key={v}>
          <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} className="chart-grid" />
          <text x={pad.l - 6} y={y(v) + 4} textAnchor="end" className="chart-label">
            {format(v)}
          </text>
        </g>
      ))}
      {points.length > 1 && <path d={area} fill="url(#chart-fill)" />}
      <path d={path} className="chart-line" />
      {points.map((p, i) => (
        <circle key={i} cx={x(i)} cy={y(p.y)} r={i === bestIdx ? 5 : 3.5} className={i === bestIdx ? 'chart-dot best' : 'chart-dot'} />
      ))}
      <text x={x(0)} y={H - 6} textAnchor={points.length === 1 ? 'middle' : 'start'} className="chart-label">
        {points[0].label}
      </text>
      {points.length > 1 && (
        <text x={x(points.length - 1)} y={H - 6} textAnchor="end" className="chart-label">
          {points[points.length - 1].label}
        </text>
      )}
    </svg>
  )
}

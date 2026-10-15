import type { Exercise } from './db'

export type WeightUnit = 'kg' | 'lb'

export const KG_PER_LB = 0.45359237

/** Steps offered for exercises weighed in pounds; weight stacks usually move in 10 lb. */
export const LB_STEP_OPTIONS = [2.5, 5, 10, 15, 20]
export const DEFAULT_LB_STEP = 10

/** Built-in machines with a pin-loaded weight stack, which is usually labelled in pounds. */
const STACK_MACHINES = new Set([
  'chest_press_machine',
  'incline_chest_press_machine',
  'butterfly',
  'reverse_fly',
  'lat_pulldown',
  'close_grip_pulldown',
  'seated_row',
  'row_machine',
  'leg_extension',
  'leg_curl',
  'lying_leg_curl',
  'abductor',
  'adductor',
  'shoulder_press_machine',
  'lateral_raise_machine',
  'biceps_curl_machine',
  'triceps_machine',
  'ab_machine',
])

/** The unit an exercise is shown in. Weights are always stored in kg. */
export const unitFor = (e: Exercise): WeightUnit =>
  e.unit ?? (e.builtin && STACK_MACHINES.has(e.builtin) ? 'lb' : 'kg')

/** Stored kg to the exercise's unit; pounds are rounded to 0.1. */
export const toUnit = (kg: number, unit: WeightUnit) =>
  unit === 'lb' ? Math.round((kg / KG_PER_LB) * 10) / 10 : kg

/** A value in the exercise's unit back to kg for storage. */
export const fromUnit = (value: number, unit: WeightUnit) => (unit === 'lb' ? value * KG_PER_LB : value)

/** Nearest step on the equipment's grid, e.g. 61.7 lb on a 10 lb stack is 60 lb. */
export const snapToStep = (value: number, step: number) =>
  step > 0 ? Math.round(Math.round(value / step) * step * 100) / 100 : value

const EPS = 1e-6
/** Next position on the step grid above the value: 20 → 30, 35 → 40 with 10 lb steps. */
export const stepAbove = (value: number, step: number) => (Math.floor(value / step + EPS) + 1) * step
/** Next position on the step grid below the value: 30 → 20, 35 → 30 with 10 lb steps. */
export const stepBelow = (value: number, step: number) => Math.max(0, (Math.ceil(value / step - EPS) - 1) * step)

/** Weight with its unit, e.g. "30 lb" or "60 kg". */
export const formatWeight = (kg: number, unit: WeightUnit, lang: 'de' | 'en') => {
  const n = String(Math.round(toUnit(kg, unit) * 100) / 100)
  return `${lang === 'de' ? n.replace('.', ',') : n} ${unit}`
}

/** True when a stored kg value doesn't sit on a 2.5 lb grid, i.e. it was entered in kg. */
export const offPoundGrid = (kg: number) => {
  const q = toUnit(kg, 'lb') / 2.5
  return Math.abs(q - Math.round(q)) > 0.05
}

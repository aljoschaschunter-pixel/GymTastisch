import type { Exercise, MuscleGroup } from './db'

/** Individual muscles shown on the body map. */
export const MUSCLES = [
  'chest',
  'front_delts',
  'side_delts',
  'rear_delts',
  'biceps',
  'triceps',
  'forearms',
  'traps',
  'lats',
  'lower_back',
  'abs',
  'obliques',
  'glutes',
  'quads',
  'hamstrings',
  'adductors',
  'calves',
] as const
export type Muscle = (typeof MUSCLES)[number]

/** Share of a set that counts for a muscle: 1 = target muscle, below 1 = assisting or stabilising muscle. */
export type MuscleShares = Partial<Record<Muscle, number>>

// Assisting muscles count less than the target, roughly following how much they work:
// 0.5 = strong synergist (e.g. triceps in pressing, biceps in pulling),
// 0.25 = clearly involved, 0.1 = mainly stabilising.
const PRESS: MuscleShares = { chest: 1, front_delts: 0.5, triceps: 0.5 }
const FLY: MuscleShares = { chest: 1, front_delts: 0.25 }
const ROW: MuscleShares = { lats: 1, traps: 1, rear_delts: 0.5, biceps: 0.5, forearms: 0.25, lower_back: 0.1 }
const PULLDOWN: MuscleShares = { lats: 1, biceps: 0.5, traps: 0.25, rear_delts: 0.25, forearms: 0.25 }
const SQUAT: MuscleShares = { quads: 1, glutes: 1, adductors: 0.5, hamstrings: 0.1, lower_back: 0.25, abs: 0.1 }
const LEG_CURL: MuscleShares = { hamstrings: 1, calves: 0.1 }
const OVERHEAD: MuscleShares = { front_delts: 1, side_delts: 0.5, triceps: 0.5, traps: 0.1 }
const LATERAL: MuscleShares = { side_delts: 1, traps: 0.25 }
const REAR: MuscleShares = { rear_delts: 1, traps: 0.5 }
const CURL: MuscleShares = { biceps: 1, forearms: 0.25 }
const TRICEPS: MuscleShares = { triceps: 1 }
const CRUNCH: MuscleShares = { abs: 1, obliques: 0.25 }

export const BUILTIN_MUSCLES: Record<string, MuscleShares> = {
  bench_press: PRESS,
  db_bench_press: PRESS,
  incline_bench_press: { ...PRESS, front_delts: 0.75 },
  incline_db_press: { ...PRESS, front_delts: 0.75 },
  chest_press_machine: PRESS,
  incline_chest_press_machine: { ...PRESS, front_delts: 0.75 },
  push_up: { ...PRESS, abs: 0.1 },
  butterfly: FLY,
  cable_fly: FLY,
  pec_fly_db: FLY,
  dips: { triceps: 1, chest: 1, front_delts: 0.5 },

  deadlift: {
    glutes: 1,
    hamstrings: 1,
    lower_back: 1,
    quads: 0.5,
    traps: 0.5,
    adductors: 0.5,
    forearms: 0.5,
    lats: 0.25,
    abs: 0.1,
  },
  romanian_deadlift: { hamstrings: 1, glutes: 1, lower_back: 0.5, adductors: 0.25, forearms: 0.25 },
  back_extension: { lower_back: 1, glutes: 0.5, hamstrings: 0.5 },
  seated_row: ROW,
  barbell_row: { ...ROW, lower_back: 0.25 },
  db_row: ROW,
  row_machine: ROW,
  lat_pulldown: PULLDOWN,
  close_grip_pulldown: PULLDOWN,
  pull_up: { ...PULLDOWN, abs: 0.1 },
  assisted_pull_up: PULLDOWN,

  squat: SQUAT,
  hack_squat: { ...SQUAT, lower_back: 0.1 },
  goblet_squat: { ...SQUAT, abs: 0.25 },
  leg_press: { quads: 1, glutes: 0.5, adductors: 0.5, hamstrings: 0.1 },
  lunge: { quads: 1, glutes: 1, adductors: 0.5, hamstrings: 0.25, calves: 0.1 },
  bulgarian_split_squat: { quads: 1, glutes: 1, adductors: 0.5, hamstrings: 0.25, calves: 0.1 },
  leg_extension: { quads: 1 },
  leg_curl: LEG_CURL,
  lying_leg_curl: LEG_CURL,
  hip_thrust: { glutes: 1, hamstrings: 0.25, quads: 0.25, adductors: 0.25 },
  glute_kickback: { glutes: 1, hamstrings: 0.25 },
  abductor: { glutes: 1 },
  adductor: { adductors: 1 },
  calf_raise: { calves: 1 },
  seated_calf_raise: { calves: 1 },

  overhead_press: { ...OVERHEAD, abs: 0.1 },
  db_shoulder_press: OVERHEAD,
  shoulder_press_machine: OVERHEAD,
  lateral_raise: LATERAL,
  lateral_raise_machine: LATERAL,
  cable_lateral_raise: LATERAL,
  reverse_fly: REAR,
  face_pull: { ...REAR, side_delts: 0.25 },

  biceps_curl: CURL,
  barbell_curl: CURL,
  cable_curl: CURL,
  preacher_curl: CURL,
  biceps_curl_machine: CURL,
  hammer_curl: { biceps: 1, forearms: 0.5 },
  triceps_pushdown: TRICEPS,
  triceps_machine: TRICEPS,
  skull_crusher: TRICEPS,
  overhead_triceps_extension: TRICEPS,

  crunch: CRUNCH,
  cable_crunch: CRUNCH,
  ab_machine: CRUNCH,
  plank: { abs: 1, obliques: 0.5, front_delts: 0.1, glutes: 0.1 },
  hanging_leg_raise: { abs: 1, obliques: 0.5, forearms: 0.25, lats: 0.1 },
  leg_raise: { abs: 1, obliques: 0.25 },
  russian_twist: { obliques: 1, abs: 0.5 },
}

/** Best guess for custom exercises, from their category. */
const GROUP_MUSCLES: Record<MuscleGroup, MuscleShares> = {
  chest: PRESS,
  back: ROW,
  legs: { quads: 1, glutes: 1, hamstrings: 0.5, adductors: 0.25 },
  shoulders: OVERHEAD,
  arms: { biceps: 0.5, triceps: 0.5, forearms: 0.25 },
  core: CRUNCH,
  cardio: {},
  other: {},
}

export const exerciseMuscles = (e: Exercise): MuscleShares =>
  (e.builtin && e.group !== 'cardio' && BUILTIN_MUSCLES[e.builtin]) || GROUP_MUSCLES[e.group]

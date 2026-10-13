import { createContext, useContext } from 'react'
import type { Lang } from './i18n'

export interface Settings {
  lang: 'auto' | Lang
  defaultRest: number
  sound: boolean
  keepAwake: boolean
  weightStep: number
}

export const DEFAULT_SETTINGS: Settings = {
  lang: 'auto',
  defaultRest: 120,
  sound: true,
  keepAwake: true,
  weightStep: 2.5,
}

const KEY = 'gymtastisch.settings'

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch {
    // storage unavailable or corrupt
  }
  return DEFAULT_SETTINGS
}

export function saveSettings(s: Settings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    // ignore
  }
}

export const SettingsContext = createContext<{
  settings: Settings
  update: (patch: Partial<Settings>) => void
}>({ settings: DEFAULT_SETTINGS, update: () => {} })

export const useSettings = () => useContext(SettingsContext)

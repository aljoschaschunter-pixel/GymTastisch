import { createContext, useContext } from 'react'

export type Tab = 'workout' | 'exercises' | 'history' | 'settings'

export const NavContext = createContext<{
  tab: Tab
  setTab: (t: Tab) => void
  openExercise: (id: string) => void
}>({ tab: 'workout', setTab: () => {}, openExercise: () => {} })

export const useNav = () => useContext(NavContext)

import { useSyncExternalStore } from 'react'
import { registerSW } from 'virtual:pwa-register'
import cat from './assets/reload-cat.webp'

let updateReady = false
const listeners = new Set<() => void>()

const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    updateReady = true
    listeners.forEach((l) => l())
  },
  // Home-screen apps are often resumed instead of reopened, so also look for
  // an update whenever the app comes to the foreground.
  onRegisteredSW(_url, registration) {
    if (!registration) return
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') void registration.update()
    })
  },
})

/** True once a new version is installed and waiting for a reload. */
export function useUpdateReady() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => updateReady,
  )
}

/** Short full-screen animation shown before the app reloads. */
function playReloadAnimation() {
  const overlay = document.createElement('div')
  overlay.className = 'reload-splash'
  overlay.setAttribute('aria-hidden', 'true')
  const img = document.createElement('img')
  img.src = cat
  img.alt = ''
  overlay.append(img)
  document.body.append(overlay)
  const ms = matchMedia('(prefers-reduced-motion: reduce)').matches ? 400 : 1600
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

/** Switch to the waiting version. */
export async function applyUpdate() {
  await playReloadAnimation()
  await updateSW(true)
  // The new version reloads the page once it takes over; reload anyway if that does not happen.
  setTimeout(() => location.reload(), 3000)
}

/** Fetch the latest version: drop the offline copy and load the app again. Workout data is kept. */
export async function reloadApp() {
  await playReloadAnimation()
  try {
    const regs = (await navigator.serviceWorker?.getRegistrations()) ?? []
    await Promise.all(regs.map((r) => r.unregister()))
    const keys = (await window.caches?.keys()) ?? []
    await Promise.all(keys.map((k) => caches.delete(k)))
  } catch {
    // reload anyway
  }
  location.reload()
}

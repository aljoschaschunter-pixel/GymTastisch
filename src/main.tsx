import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { registerSW } from 'virtual:pwa-register'

// Load new versions right away. Home-screen apps are often resumed instead of
// reopened, so also look for an update whenever the app comes to the foreground.
registerSW({
  immediate: true,
  onRegisteredSW(_url, registration) {
    if (!registration) return
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') void registration.update()
    })
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

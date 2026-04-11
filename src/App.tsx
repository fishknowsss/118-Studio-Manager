import React, { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { getLegacyAppShell } from './legacy/appShell'
import { Dashboard } from './views/Dashboard'
import { Calendar }  from './views/Calendar'
import { Projects }  from './views/Projects'
import { Tasks }     from './views/Tasks'
import { People }    from './views/People'
import { Settings }  from './views/Settings'

const VIEWS: Record<string, () => React.ReactElement> = {
  dashboard: Dashboard,
  calendar:  Calendar,
  projects:  Projects,
  tasks:     Tasks,
  people:    People,
  settings:  Settings,
}

function getHashView() {
  const h = window.location.hash.slice(1)
  return h in VIEWS ? h : 'dashboard'
}

export default function App() {
  const hostRef   = useRef<HTMLDivElement | null>(null)
  const slotRef   = useRef<HTMLDivElement | null>(null)
  const rootRef   = useRef<ReturnType<typeof createRoot> | null>(null)
  const [view, setView] = useState(getHashView)
  const [ready, setReady] = useState(false)

  // Boot legacy shell + DB/store init once
  useEffect(() => {
    let dispose: (() => void) | undefined

    async function boot() {
      const host = hostRef.current
      if (!host) return
      host.innerHTML = getLegacyAppShell()

      // Create React slot inside #view-container
      const vc = host.querySelector('#view-container') as HTMLElement
      const slot = document.createElement('div')
      slot.style.cssText = 'display:flex;flex-direction:column;height:100%;'
      vc.appendChild(slot)
      slotRef.current = slot
      rootRef.current = createRoot(slot)

      // Boot legacy only for DB + store (routing handled by React)
      const mod = await import('../js/app.js') as { disposeLegacyApp?: () => void }
      dispose = mod.disposeLegacyApp

      setReady(true)
    }

    void boot()

    return () => {
      dispose?.()
      rootRef.current?.unmount()
      if (hostRef.current) hostRef.current.innerHTML = ''
    }
  }, [])

  // Track hash changes
  useEffect(() => {
    const onHash = () => setView(getHashView())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  // Sync nav active state + render React view
  useEffect(() => {
    if (!ready || !slotRef.current) return

    // Update sidebar active class
    document.querySelectorAll('.nav-item').forEach(item => {
      const el = item as HTMLElement
      el.classList.toggle('active', el.dataset.view === view)
    })

    const View = VIEWS[view]
    rootRef.current?.render(<View />)
  }, [view, ready])

  return <div ref={hostRef} style={{ height: '100%' }} />
}

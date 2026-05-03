import React, { useEffect, useRef, useState } from 'react'
import { ConfirmProvider } from './components/feedback/ConfirmProvider'
import { ToastProvider } from './components/feedback/ToastProvider'
import { PlannerProvider } from './features/planner/PlannerProvider'
import { CloudSyncProvider } from './features/sync/SyncProvider'
import { initializeAppData } from './legacy/bootstrap'
import { Dashboard } from './views/Dashboard'
import { Materials } from './views/Materials'
import { Productivity } from './views/Productivity'
import { Graph } from './views/Graph'
import { ShortDrama } from './views/ShortDrama'
import { Tools } from './views/Tools'
import { Settings } from './views/Settings'

const VIEWS: Record<string, React.ComponentType> = {
  dashboard: Dashboard,
  materials: Materials,
  productivity: Productivity,
  shortDrama: ShortDrama,
  graph: Graph,
  tools: Tools,
  settings: Settings,
}

const LEGACY_VIEW_ALIASES: Record<string, string> = {
  people: 'graph',
  calendar: 'dashboard',
}

const KONAMI_SEQUENCE = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a'] as const

function normalizeKonamiKey(key: string) {
  const normalized = key.toLowerCase()
  if (normalized.startsWith('arrow')) return normalized
  if (normalized.length === 1) return normalized
  return null
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  if (target.closest('[contenteditable="true"]')) return true
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}

function getHashView() {
  const raw = window.location.hash.slice(1)
  const normalized = LEGACY_VIEW_ALIASES[raw] || raw
  return normalized in VIEWS ? normalized : 'dashboard'
}

export default function App() {
  const [view, setView] = useState(getHashView)
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light')
  const [easterMode, setEasterMode] = useState(false)
  const [entryFlashVisible, setEntryFlashVisible] = useState(false)
  const [ready, setReady] = useState(false)
  const [initError, setInitError] = useState<string | null>(null)
  const konamiIndexRef = useRef(0)
  const entryFlashTimerRef = useRef<number | null>(null)

  useEffect(() => {
    async function init() {
      try {
        await initializeAppData()
        setReady(true)
      } catch (error) {
        console.error('[118SM] 初始化失败:', error)
        setInitError(error instanceof Error ? error.message : '未知错误')
      }
    }
    void init()
  }, [])

  useEffect(() => {
    localStorage.setItem('theme', theme)
  }, [theme])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', easterMode ? 'light' : theme)
  }, [easterMode, theme])

  useEffect(() => {
    const onHash = () => setView(getHashView())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  useEffect(() => {
    const nextValue = easterMode ? 'konami' : null
    const targets = [document.documentElement, document.body]

    for (const target of targets) {
      if (nextValue) {
        target.setAttribute('data-easter-mode', nextValue)
      } else {
        target.removeAttribute('data-easter-mode')
      }
    }

    return () => {
      for (const target of targets) {
        target.removeAttribute('data-easter-mode')
      }
    }
  }, [easterMode])

  useEffect(() => {
    if (view !== 'dashboard' || easterMode) {
      konamiIndexRef.current = 0
      return
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) {
        konamiIndexRef.current = 0
        return
      }

      const key = normalizeKonamiKey(event.key)
      if (!key) {
        konamiIndexRef.current = 0
        return
      }

      const nextIndex = konamiIndexRef.current
      if (key === KONAMI_SEQUENCE[nextIndex]) {
        if (nextIndex === KONAMI_SEQUENCE.length - 1) {
          konamiIndexRef.current = 0
          if (entryFlashTimerRef.current) {
            window.clearTimeout(entryFlashTimerRef.current)
            entryFlashTimerRef.current = null
          }
          setEntryFlashVisible(true)
          entryFlashTimerRef.current = window.setTimeout(() => {
            setEntryFlashVisible(false)
            entryFlashTimerRef.current = null
          }, 2400)
          setEasterMode(true)
          return
        }

        konamiIndexRef.current = nextIndex + 1
        return
      }

      konamiIndexRef.current = key === KONAMI_SEQUENCE[0] ? 1 : 0
    }

    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [easterMode, view])

  useEffect(() => {
    return () => {
      if (entryFlashTimerRef.current) {
        window.clearTimeout(entryFlashTimerRef.current)
        entryFlashTimerRef.current = null
      }
    }
  }, [])

  if (initError) {
    return (
      <div className="app-init-error">
        <strong>启动失败</strong>
        <div>请确认浏览器支持 IndexedDB，并通过 HTTP 访问页面。</div>
        <code>{initError}</code>
      </div>
    )
  }

  if (!ready) return null

  const CurrentView = VIEWS[view]

  return (
    <ToastProvider>
      <ConfirmProvider>
        <CloudSyncProvider>
          <PlannerProvider>
            <div id="app" className="app-shell" data-easter-mode={easterMode ? 'konami' : undefined}>
              {entryFlashVisible ? (
                <div className="konami-entry-flash" aria-live="polite">
                  <div className="konami-entry-flash-backdrop" />
                  <div className="konami-entry-flash-stage">
                    <span className="konami-entry-flash-text" data-text="Noclipping into the Backrooms">
                      Noclipping into the Backrooms
                    </span>
                  </div>
                </div>
              ) : null}
              <nav className="sidebar">
                <SidebarBrand easterMode={easterMode} />

                <ul className="nav-list">
                  <NavItem label="首页" active={view === 'dashboard'} onClick={() => window.location.hash = '#dashboard'}>
                    <rect x="3" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="3" width="7" height="7" rx="1" />
                    <rect x="3" y="14" width="7" height="7" rx="1" />
                    <rect x="14" y="14" width="7" height="7" rx="1" />
                  </NavItem>
                  <NavItem label="资料" active={view === 'materials'} onClick={() => window.location.hash = '#materials'}>
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                  </NavItem>
                  <NavItem label="工效" active={view === 'productivity'} onClick={() => window.location.hash = '#productivity'}>
                    <path d="M3 19l7-7 3 3 7-8" />
                    <path d="M14 7h6v6" />
                  </NavItem>
                  <NavItem label="短剧" active={view === 'shortDrama'} onClick={() => window.location.hash = '#shortDrama'}>
                    <rect x="4" y="5" width="16" height="14" rx="2" />
                    <path d="M5 7h14" />
                    <path d="M8 11h8" />
                    <path d="M8 15h5" />
                  </NavItem>
                  <NavItem label="图谱" active={view === 'graph'} onClick={() => window.location.hash = '#graph'}>
                    <circle cx="5" cy="12" r="2" />
                    <circle cx="12" cy="5" r="2" />
                    <circle cx="19" cy="12" r="2" />
                    <circle cx="12" cy="19" r="2" />
                    <line x1="7" y1="12" x2="10" y2="6" />
                    <line x1="14" y1="6" x2="17" y2="12" />
                    <line x1="17" y1="12" x2="14" y2="18" />
                    <line x1="10" y1="18" x2="7" y2="12" />
                  </NavItem>
                  <NavItem label="工具" active={view === 'tools'} onClick={() => window.location.hash = '#tools'}>
                    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                  </NavItem>
                </ul>

                <div className="sidebar-footer">
                  <FooterModeButton
                    easterMode={easterMode}
                    theme={theme}
                    onExitEasterMode={() => {
                      if (entryFlashTimerRef.current) {
                        window.clearTimeout(entryFlashTimerRef.current)
                        entryFlashTimerRef.current = null
                      }
                      setEntryFlashVisible(false)
                      setEasterMode(false)
                    }}
                    onToggleTheme={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')}
                  />
                  <NavItem label="设置" active={view === 'settings'} onClick={() => window.location.hash = '#settings'}>
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </NavItem>
                </div>
              </nav>

              <main className="main-content">
                <div id="view-container">
                  <CurrentView />
                </div>
              </main>
            </div>
          </PlannerProvider>
        </CloudSyncProvider>
      </ConfirmProvider>
    </ToastProvider>
  )
}

function SidebarBrand({ easterMode }: { easterMode: boolean }) {
  return (
    <div className={`sidebar-brand${easterMode ? ' is-easter' : ''}`}>
      {easterMode ? (
        <span className="brand-chaos" data-text="烧粥幺幺捌">
          烧粥幺幺捌
        </span>
      ) : (
        <>
          <img src="/favicon.svg" className="brand-icon" alt="" />
          <span className="brand-sub">Studio</span>
        </>
      )}
    </div>
  )
}

function FooterModeButton({
  easterMode,
  theme,
  onExitEasterMode,
  onToggleTheme,
}: {
  easterMode: boolean
  theme: string
  onExitEasterMode: () => void
  onToggleTheme: () => void
}) {
  return (
    <button className={`nav-item nav-button${easterMode ? ' is-easter-toggle' : ''}`} type="button" onClick={easterMode ? onExitEasterMode : onToggleTheme}>
      <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        {easterMode ? (
          <>
            <path d="M5 5l14 14" />
            <path d="M19 5L5 19" />
          </>
        ) : (
          <>
            <circle cx="12" cy="12" r="5" />
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
          </>
        )}
      </svg>
      <span className="nav-label">{easterMode ? '退出异象' : theme === 'dark' ? '浅色模式' : '深色模式'}</span>
    </button>
  )
}

function NavItem({
  active,
  badge,
  children,
  label,
  onClick,
}: {
  active: boolean
  badge?: number
  children: React.ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <li>
      <button className={`nav-item nav-button ${active ? 'active' : ''}`} type="button" onClick={onClick}>
        <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          {children}
        </svg>
        <span className="nav-label">{label}</span>
        {badge ? <span className="nav-badge">{badge}</span> : null}
      </button>
    </li>
  )
}

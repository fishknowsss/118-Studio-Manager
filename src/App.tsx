import React, { useEffect, useMemo, useState } from 'react'
import { ConfirmProvider } from './components/feedback/ConfirmProvider'
import { ToastProvider } from './components/feedback/ToastProvider'
import { PlannerProvider } from './features/planner/PlannerProvider'
import { CloudSyncProvider } from './features/sync/SyncProvider'
import { initializeAppData } from './legacy/bootstrap'
import { daysUntil } from './legacy/utils'
import { useLegacyStoreSnapshot } from './legacy/useLegacyStore'
import { Dashboard } from './views/Dashboard'
import { Repository } from './views/Repository'
import { Graph } from './views/Graph'
import { Tools } from './views/Tools'
import { Settings }  from './views/Settings'

const VIEWS: Record<string, React.ComponentType> = {
  dashboard: Dashboard,
  repository: Repository,
  graph: Graph,
  tools: Tools,
  settings:  Settings,
}

const LEGACY_VIEW_ALIASES: Record<string, string> = {
  projects: 'repository',
  tasks: 'repository',
  people: 'graph',
  calendar: 'dashboard',
}

function getHashView() {
  const raw = window.location.hash.slice(1)
  const normalized = LEGACY_VIEW_ALIASES[raw] || raw
  return normalized in VIEWS ? normalized : 'dashboard'
}

export default function App() {
  const store = useLegacyStoreSnapshot()
  const [view, setView] = useState(getHashView)
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light')
  const [ready, setReady] = useState(false)
  const [initError, setInitError] = useState<string | null>(null)

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
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  useEffect(() => {
    const onHash = () => setView(getHashView())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const urgentCount = useMemo(() => store.projects.filter(p => {
    if (p.status === 'completed' || p.status === 'cancelled') return false
    const days = daysUntil(p.ddl)
    return days !== null && days <= 3
  }).length, [store.projects])

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
            <div id="app" className="app-shell">
              <nav className="sidebar">
                <div className="sidebar-brand">
                  <span className="brand-num">118</span>
                  <span className="brand-sub">Studio</span>
                </div>

                <ul className="nav-list">
                  <NavItem label="首页" active={view === 'dashboard'} onClick={() => window.location.hash = '#dashboard'}>
                    <rect x="3" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="3" width="7" height="7" rx="1" />
                    <rect x="3" y="14" width="7" height="7" rx="1" />
                    <rect x="14" y="14" width="7" height="7" rx="1" />
                  </NavItem>
                  <NavItem label="仓库" active={view === 'repository'} badge={urgentCount} onClick={() => window.location.hash = '#repository'}>
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
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
                    <circle cx="7" cy="7" r="2" />
                    <circle cx="17" cy="7" r="2" />
                    <circle cx="7" cy="17" r="2" />
                    <circle cx="17" cy="17" r="2" />
                    <line x1="9" y1="7" x2="15" y2="7" />
                    <line x1="7" y1="9" x2="7" y2="15" />
                    <line x1="9" y1="17" x2="15" y2="17" />
                    <line x1="17" y1="9" x2="17" y2="15" />
                  </NavItem>
                </ul>

                <div className="sidebar-footer">
                  <button className="nav-item nav-button" type="button" onClick={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')}>
                    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="5" />
                      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                    </svg>
                    <span className="nav-label">{theme === 'dark' ? '浅色模式' : '深色模式'}</span>
                  </button>
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

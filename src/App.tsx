import React, { useEffect, useState, useSyncExternalStore, useMemo } from 'react'
import { store } from './legacy/store'
import { Dashboard } from './views/Dashboard'
import { Calendar }  from './views/Calendar'
import { Projects }  from './views/Projects'
import { Tasks }     from './views/Tasks'
import { People }    from './views/People'
import { Settings }  from './views/Settings'

const VIEWS: Record<string, React.ComponentType> = {
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
  useSyncExternalStore(store.subscribe, () => store.getSnapshot())
  const [view, setView] = useState(getHashView)
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light')
  const [ready, setReady] = useState(false)

  // Initialize App
  useEffect(() => {
    async function init() {
      // Import legacy app.js to initialize DB and Store
      await import('../js/app.js')
      setReady(true)
    }
    init()
  }, [])

  // Sync theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  // Hash navigation
  useEffect(() => {
    const onHash = () => setView(getHashView())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  // Calculate project badge (urgent projects)
  const urgentCount = useMemo(() => {
    return store.projects.filter(p => {
      if (p.status === 'completed' || p.status === 'cancelled') return false
      if (!p.ddl) return false
      const d = Math.round((new Date(p.ddl + 'T00:00:00').getTime() - new Date().setHours(0,0,0,0)) / 86400000)
      return d < 0 || d <= 3
    }).length
  }, [(store as any).version])

  if (!ready) return null

  const CurrentView = VIEWS[view]

  return (
    <div id="app" className="app-shell">
      <nav className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-num">118</span>
          <span className="brand-sub">Studio</span>
        </div>
        
        <ul className="nav-list">
          <li className={`nav-item ${view === 'dashboard' ? 'active' : ''}`} onClick={() => window.location.hash = '#dashboard'}>
            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
            <span className="nav-label">今日</span>
          </li>
          <li className={`nav-item ${view === 'projects' ? 'active' : ''}`} onClick={() => window.location.hash = '#projects'}>
            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
            <span className="nav-label">项目</span>
            {urgentCount > 0 && <span className="nav-badge">{urgentCount}</span>}
          </li>
          <li className={`nav-item ${view === 'tasks' ? 'active' : ''}`} onClick={() => window.location.hash = '#tasks'}>
            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
            <span className="nav-label">任务</span>
          </li>
          <li className={`nav-item ${view === 'people' ? 'active' : ''}`} onClick={() => window.location.hash = '#people'}>
            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            <span className="nav-label">人员</span>
          </li>
          <li className={`nav-item ${view === 'calendar' ? 'active' : ''}`} onClick={() => window.location.hash = '#calendar'}>
            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            <span className="nav-label">日历</span>
          </li>
        </ul>

        <div className="sidebar-footer">
          <div className="nav-item" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}>
            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
            </svg>
            <span className="nav-label">{theme === 'dark' ? '浅色模式' : '深色模式'}</span>
          </div>
          <li className={`nav-item ${view === 'settings' ? 'active' : ''}`} onClick={() => window.location.hash = '#settings'}>
            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            <span className="nav-label">设置</span>
          </li>
        </div>
      </nav>

      <main className="main-content">
        <div id="view-container">
          <CurrentView />
        </div>
      </main>

      {/* Legacy Portals Placeholder */}
      <dialog id="app-modal" className="app-modal">
        <div className="modal-inner">
          <div className="modal-header">
            <h3 className="modal-title" id="modal-title"></h3>
            <button className="modal-close" id="modal-close" aria-label="关闭">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div className="modal-body" id="modal-body"></div>
          <div className="modal-footer" id="modal-footer"></div>
        </div>
      </dialog>
      <div id="toast-root" className="toast-root"></div>
      <div id="planner-panel" className="planner-panel">
        <div className="planner-overlay" id="planner-overlay"></div>
        <div className="planner-content" id="planner-content"></div>
      </div>
    </div>
  )
}

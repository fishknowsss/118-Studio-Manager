export type AppTheme = 'light' | 'dark'

const THEME_STORAGE_KEY = 'theme'
const THEME_SWITCHING_CLASS = 'theme-switching'
/** 足够覆盖一帧样式结算，避免 transition 拖慢主题切换观感 */
const THEME_SWITCHING_MS = 150

const listeners = new Set<() => void>()

let theme: AppTheme = readStoredTheme()
let easterForcesLight = false
let switchingTimer: ReturnType<typeof setTimeout> | null = null

function readStoredTheme(): AppTheme {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

function persistTheme(next: AppTheme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, next)
  } catch {
    // ignore quota / private mode failures
  }
}

function effectiveDocumentTheme(): AppTheme {
  return easterForcesLight ? 'light' : theme
}

function beginThemeSwitching() {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.classList.add(THEME_SWITCHING_CLASS)
  if (switchingTimer !== null) {
    clearTimeout(switchingTimer)
  }
  switchingTimer = setTimeout(() => {
    root.classList.remove(THEME_SWITCHING_CLASS)
    switchingTimer = null
  }, THEME_SWITCHING_MS)
}

function applyDocumentTheme() {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-theme', effectiveDocumentTheme())
}

function notifyThemeListeners() {
  for (const listener of listeners) listener()
}

/** 模块加载时立刻落到 DOM，避免首屏闪白/闪黑 */
if (typeof document !== 'undefined') {
  applyDocumentTheme()
}

export function getTheme(): AppTheme {
  return theme
}

export function getServerThemeSnapshot(): AppTheme {
  return 'light'
}

export function subscribeTheme(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** 从 localStorage 重新同步（App 挂载 / 测试场景），不强制触发 switching 动画 */
export function hydrateThemeFromStorage() {
  const next = readStoredTheme()
  const changed = next !== theme
  theme = next
  applyDocumentTheme()
  if (changed) notifyThemeListeners()
}

/**
 * 写入用户主题偏好。
 * 只通知订阅者（侧栏按钮等），不依赖 App 顶层 state，避免首页整树 React 重渲染。
 */
export function setTheme(next: AppTheme | ((current: AppTheme) => AppTheme)) {
  const resolved = typeof next === 'function' ? next(theme) : next
  if (resolved !== 'light' && resolved !== 'dark') return
  if (resolved === theme) return

  beginThemeSwitching()
  theme = resolved
  persistTheme(theme)
  applyDocumentTheme()
  notifyThemeListeners()
}

export function toggleTheme() {
  setTheme((current) => (current === 'dark' ? 'light' : 'dark'))
}

/**
 * 异象模式强制浅色表面；退出后恢复用户主题偏好。
 * 由 App 的 easterMode 副作用调用，不写入 localStorage。
 */
export function setEasterThemeOverride(active: boolean) {
  if (easterForcesLight === active) {
    applyDocumentTheme()
    return
  }
  beginThemeSwitching()
  easterForcesLight = active
  applyDocumentTheme()
}

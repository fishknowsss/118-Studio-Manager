export type AppTheme = 'light' | 'dark'

const THEME_STORAGE_KEY = 'theme'
const listeners = new Set<() => void>()

let theme: AppTheme = readStoredTheme()
let easterForcesLight = false

function readStoredTheme(): AppTheme {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

function applyDocumentTheme() {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.theme = easterForcesLight ? 'light' : theme
}

function notifyThemeListeners() {
  for (const listener of listeners) listener()
}

export function getTheme() {
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

export function hydrateThemeFromStorage() {
  const next = readStoredTheme()
  const changed = next !== theme
  theme = next
  applyDocumentTheme()
  if (changed) notifyThemeListeners()
}

export function setTheme(next: AppTheme | ((current: AppTheme) => AppTheme)) {
  const resolved = typeof next === 'function' ? next(theme) : next
  if (resolved === theme) return

  theme = resolved
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // localStorage 不可用时仍保留当前会话主题。
  }
  applyDocumentTheme()
  notifyThemeListeners()
}

export function toggleTheme() {
  setTheme((current) => current === 'dark' ? 'light' : 'dark')
}

export function setEasterThemeOverride(active: boolean) {
  easterForcesLight = active
  applyDocumentTheme()
}

export const DATABASE_CHANGE_KEY = '118sm:database-change'

export function publishDatabaseChange() {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(DATABASE_CHANGE_KEY, crypto.randomUUID())
  } catch (error) {
    console.warn('[118SM] 跨页面通知不可用:', error)
  }
}

export function subscribeDatabaseChanges(listener: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === DATABASE_CHANGE_KEY && event.newValue) listener()
  }
  window.addEventListener('storage', onStorage)
  return () => window.removeEventListener('storage', onStorage)
}

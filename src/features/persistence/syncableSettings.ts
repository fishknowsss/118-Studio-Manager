import { db } from '../../legacy/db'

type SyncableSettingsRecord<T> = {
  key: string
  value: T
  updatedAt: string
}

type SyncableStoreOptions<T> = {
  key: string
  legacyKey?: string
  emptyValue: T
  sanitize: (raw: unknown) => T
}

function emitSyncableDataUpdated(key: string) {
  if (typeof document === 'undefined') return
  document.dispatchEvent(new CustomEvent('syncableDataUpdated', {
    detail: { key },
  }))
}

function canUseLocalStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

async function persistValue<T>(key: string, value: T) {
  await db.put('settings', {
    key,
    value,
    updatedAt: new Date().toISOString(),
  } satisfies SyncableSettingsRecord<T>)
}

export function createSyncableSettingsStore<T>({
  key,
  legacyKey,
  emptyValue,
  sanitize,
}: SyncableStoreOptions<T>) {
  let currentValue = sanitize(emptyValue)
  const listeners = new Set<() => void>()

  const notify = () => {
    listeners.forEach((listener) => listener())
  }

  const readLegacyValue = () => {
    if (!legacyKey || !canUseLocalStorage()) return null
    const raw = window.localStorage.getItem(legacyKey)
    if (!raw) return null

    try {
      return JSON.parse(raw) as unknown
    } catch {
      return null
    }
  }

  const setCurrentValue = (nextValue: unknown) => {
    currentValue = sanitize(nextValue)
    notify()
    return currentValue
  }

  const readStoredValue = async () => {
    const record = await db.get('settings', key) as SyncableSettingsRecord<T> | undefined
    if (!record || record.key !== key) return null
    return sanitize(record.value)
  }

  return {
    read() {
      return currentValue
    },

    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },

    write(nextValue: T) {
      const sanitized = setCurrentValue(nextValue)
      void persistValue(key, sanitized).catch((error) => {
        console.error(`[syncable-settings] 保存 ${key} 失败`, error)
      })
      emitSyncableDataUpdated(key)
    },

    async initialize() {
      const storedValue = await readStoredValue()
      if (storedValue !== null) {
        setCurrentValue(storedValue)
        return
      }

      const legacyValue = readLegacyValue()
      if (legacyValue !== null) {
        const sanitized = setCurrentValue(legacyValue)
        void persistValue(key, sanitized).catch((error) => {
          console.error(`[syncable-settings] 迁移 ${key} 失败`, error)
        })
        if (legacyKey && canUseLocalStorage()) {
          window.localStorage.removeItem(legacyKey)
        }
        return
      }

      setCurrentValue(emptyValue)
    },

    async reloadFromDB() {
      const storedValue = await readStoredValue()
      if (storedValue === null) {
        setCurrentValue(emptyValue)
        return
      }

      setCurrentValue(storedValue)
    },

    resetForTests() {
      currentValue = sanitize(emptyValue)
    },
  }
}

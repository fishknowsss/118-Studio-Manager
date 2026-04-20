import { db } from '../../legacy/db'

const pendingWrites = new Map<string, Promise<void>>()

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

function trackPendingWrite(key: string, promise: Promise<void>) {
  pendingWrites.set(key, promise)
  void promise.finally(() => {
    if (pendingWrites.get(key) === promise) {
      pendingWrites.delete(key)
    }
  })
}

export async function waitForSyncableSettingsWrites() {
  while (pendingWrites.size > 0) {
    await Promise.all([...new Set(pendingWrites.values())])
  }
}

export function createSyncableSettingsStore<T>({
  key,
  legacyKey,
  emptyValue,
  sanitize,
}: SyncableStoreOptions<T>) {
  let currentValue = sanitize(emptyValue)
  const listeners = new Set<() => void>()
  let writeChain = Promise.resolve()

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
      const sanitized = sanitize(nextValue)
      writeChain = writeChain
        .catch(() => undefined)
        .then(async () => {
          await persistValue(key, sanitized)
          setCurrentValue(sanitized)
          emitSyncableDataUpdated(key)
        })
        .catch((error) => {
          console.error(`[syncable-settings] 保存 ${key} 失败`, error)
        })
      trackPendingWrite(key, writeChain)
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
        try {
          await persistValue(key, sanitized)
          if (legacyKey && canUseLocalStorage()) {
            window.localStorage.removeItem(legacyKey)
          }
        } catch (error) {
          console.error(`[syncable-settings] 迁移 ${key} 失败`, error)
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
      pendingWrites.delete(key)
      writeChain = Promise.resolve()
      currentValue = sanitize(emptyValue)
    },
  }
}

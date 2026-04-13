const STORAGE_KEY = 'cloud-sync-state-v1'

export type PersistedCloudSyncState = {
  lastCompletedSyncAt: string | null
  lastAppliedVersion: string | null
}

export function readPersistedCloudSyncState(): PersistedCloudSyncState {
  if (typeof window === 'undefined') {
    return { lastCompletedSyncAt: null, lastAppliedVersion: null }
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return { lastCompletedSyncAt: null, lastAppliedVersion: null }
    const parsed = JSON.parse(raw) as Partial<PersistedCloudSyncState>
    return {
      lastCompletedSyncAt: typeof parsed.lastCompletedSyncAt === 'string' ? parsed.lastCompletedSyncAt : null,
      lastAppliedVersion: typeof parsed.lastAppliedVersion === 'string' ? parsed.lastAppliedVersion : null,
    }
  } catch {
    return { lastCompletedSyncAt: null, lastAppliedVersion: null }
  }
}

export function writePersistedCloudSyncState(next: PersistedCloudSyncState) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
}

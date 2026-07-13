export const CLOUD_SYNC_STATE_STORAGE_KEY = 'cloud-sync-state-v1'

export type PersistedCloudSyncState = {
  lastCompletedSyncAt: string | null
  lastAppliedVersion: string | null
  pendingLocalChanges: boolean
}

const EMPTY_SYNC_STATE: PersistedCloudSyncState = {
  lastCompletedSyncAt: null,
  lastAppliedVersion: null,
  pendingLocalChanges: false,
}

export function readPersistedCloudSyncState(): PersistedCloudSyncState {
  if (typeof window === 'undefined') {
    return EMPTY_SYNC_STATE
  }

  try {
    const raw = window.localStorage.getItem(CLOUD_SYNC_STATE_STORAGE_KEY)
    if (!raw) return EMPTY_SYNC_STATE
    const parsed = JSON.parse(raw) as Partial<PersistedCloudSyncState>
    return {
      lastCompletedSyncAt: typeof parsed.lastCompletedSyncAt === 'string' ? parsed.lastCompletedSyncAt : null,
      lastAppliedVersion: typeof parsed.lastAppliedVersion === 'string' ? parsed.lastAppliedVersion : null,
      pendingLocalChanges: parsed.pendingLocalChanges === true,
    }
  } catch {
    return EMPTY_SYNC_STATE
  }
}

export function writePersistedCloudSyncState(next: PersistedCloudSyncState) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(CLOUD_SYNC_STATE_STORAGE_KEY, JSON.stringify(next))
}

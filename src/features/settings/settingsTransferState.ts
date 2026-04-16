type TransferAction = 'clear' | 'export' | 'import'

export type PersistedTransferState = {
  action: TransferAction
  summary: {
    projectCount: number
    taskCount: number
    personCount: number
    logCount: number
    settingsCount: number
    leaveRecordCount: number
  }
}

const STORAGE_KEY = 'settings-transfer-state-v1'

function emptyState() {
  return null
}

export function readPersistedTransferState(): PersistedTransferState | null {
  if (typeof window === 'undefined') return emptyState()

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyState()
    const parsed = JSON.parse(raw) as Partial<PersistedTransferState>

    if (parsed.action !== 'clear' && parsed.action !== 'export' && parsed.action !== 'import') {
      return emptyState()
    }

    return {
      action: parsed.action,
      summary: {
        projectCount: Number(parsed.summary?.projectCount) || 0,
        taskCount: Number(parsed.summary?.taskCount) || 0,
        personCount: Number(parsed.summary?.personCount) || 0,
        logCount: Number(parsed.summary?.logCount) || 0,
        settingsCount: Number(parsed.summary?.settingsCount) || 0,
        leaveRecordCount: Number(parsed.summary?.leaveRecordCount) || 0,
      },
    }
  } catch {
    return emptyState()
  }
}

export function writePersistedTransferState(next: PersistedTransferState | null) {
  if (typeof window === 'undefined') return
  if (!next) {
    window.localStorage.removeItem(STORAGE_KEY)
    return
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
}

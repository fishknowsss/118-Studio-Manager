import { beforeEach, describe, expect, it } from 'vitest'
import {
  readPersistedTransferState,
  writePersistedTransferState,
} from '../src/features/settings/settingsTransferState'

function createStorage() {
  const data = new Map<string, string>()
  return {
    clear() {
      data.clear()
    },
    getItem(key: string) {
      return data.has(key) ? data.get(key)! : null
    },
    setItem(key: string, value: string) {
      data.set(key, value)
    },
    removeItem(key: string) {
      data.delete(key)
    },
  }
}

describe('settings transfer state persistence', () => {
  beforeEach(() => {
    ;(globalThis as typeof globalThis & { window?: { localStorage: ReturnType<typeof createStorage> } }).window = {
      localStorage: createStorage(),
    }
  })

  it('reads back the last persisted transfer summary', () => {
    writePersistedTransferState({
      action: 'export',
      summary: {
        projectCount: 3,
        taskCount: 8,
        personCount: 4,
        logCount: 8,
        settingsCount: 0,
        leaveRecordCount: 0,
        classScheduleCount: 14,
      },
    })

    expect(readPersistedTransferState()).toEqual({
      action: 'export',
      summary: {
        projectCount: 3,
        taskCount: 8,
        personCount: 4,
        logCount: 8,
        settingsCount: 0,
        leaveRecordCount: 0,
        classScheduleCount: 14,
      },
    })
  })

  it('ignores invalid persisted content', () => {
    globalThis.window!.localStorage.setItem('settings-transfer-state-v1', JSON.stringify({
      action: 'oops',
      summary: {},
    }))

    expect(readPersistedTransferState()).toBeNull()
  })
})

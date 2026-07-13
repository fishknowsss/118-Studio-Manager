// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest'
import {
  readPersistedCloudSyncState,
  writePersistedCloudSyncState,
} from '../src/features/sync/syncClientState'

describe('persisted cloud sync state', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('defaults pending local changes to false for legacy state', () => {
    window.localStorage.setItem('cloud-sync-state-v1', JSON.stringify({
      lastCompletedSyncAt: '2026-07-13T10:00:00.000Z',
      lastAppliedVersion: 'remote-v1',
    }))

    expect(readPersistedCloudSyncState().pendingLocalChanges).toBe(false)
  })

  it('persists pending local changes across a page restart', () => {
    writePersistedCloudSyncState({
      lastCompletedSyncAt: null,
      lastAppliedVersion: 'remote-v1',
      pendingLocalChanges: true,
    })

    expect(readPersistedCloudSyncState().pendingLocalChanges).toBe(true)
  })
})

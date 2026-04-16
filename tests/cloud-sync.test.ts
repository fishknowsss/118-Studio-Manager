import { describe, expect, it } from 'vitest'
import {
  applyRemoteWrite,
  shouldApplyRemoteCurrent,
} from '../src/features/sync/syncShared'
import type { BackupPayload } from '../src/legacy/utils'

function buildPayload(exportedAt: string, suffix: string): BackupPayload {
  return {
    schemaVersion: 2,
    exportedAt,
    projects: [{ id: `project-${suffix}` }],
    tasks: [],
    people: [],
    logs: [],
    settings: [],
    leaveRecords: [],
  }
}

describe('cloud sync helpers', () => {
  it('writes a single latest cloud snapshot for both auto and manual sync', () => {
    const autoWrite = applyRemoteWrite({
      payload: buildPayload('2026-04-13T21:00:00+08:00', 'auto'),
      source: 'auto',
      timestamp: '2026-04-13T21:00:00+08:00',
      version: 'v1',
    })

    const manualWrite = applyRemoteWrite({
      payload: buildPayload('2026-04-13T21:20:00+08:00', 'manual'),
      source: 'manual',
      timestamp: '2026-04-13T21:20:00+08:00',
      version: 'v2',
    })

    expect(autoWrite.data.projects).toEqual([{ id: 'project-auto' }])
    expect(autoWrite.meta.source).toBe('auto')
    expect(manualWrite.data.projects).toEqual([{ id: 'project-manual' }])
    expect(manualWrite.meta.version).toBe('v2')
  })

  it('only auto-applies remote data when local state is safe to replace', () => {
    expect(shouldApplyRemoteCurrent({
      hasLocalData: false,
      pendingLocalChanges: false,
      remoteVersion: 'remote-v1',
      localAppliedVersion: null,
    })).toBe(true)

    expect(shouldApplyRemoteCurrent({
      hasLocalData: true,
      pendingLocalChanges: false,
      remoteVersion: 'remote-v2',
      localAppliedVersion: null,
    })).toBe(false)

    expect(shouldApplyRemoteCurrent({
      hasLocalData: true,
      pendingLocalChanges: true,
      remoteVersion: 'remote-v2',
      localAppliedVersion: 'remote-v1',
    })).toBe(false)

    expect(shouldApplyRemoteCurrent({
      hasLocalData: true,
      pendingLocalChanges: false,
      remoteVersion: 'remote-v2',
      localAppliedVersion: 'remote-v1',
    })).toBe(true)
  })
})

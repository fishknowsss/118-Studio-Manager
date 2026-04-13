import { describe, expect, it } from 'vitest'
import {
  applyRemoteWrite,
  shouldApplyRemoteCurrent,
  type SyncEnvelope,
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
  }
}

describe('cloud sync helpers', () => {
  it('overwrites the latest manual backup when a newer manual sync runs', () => {
    const firstPayload = buildPayload('2026-04-13T21:00:00+08:00', 'first')
    const secondPayload = buildPayload('2026-04-13T21:20:00+08:00', 'second')

    const firstWrite = applyRemoteWrite({
      payload: firstPayload,
      previousBackup: null,
      source: 'manual',
      timestamp: '2026-04-13T21:00:00+08:00',
      version: 'v1',
      createBackup: true,
    })

    const secondWrite = applyRemoteWrite({
      payload: secondPayload,
      previousBackup: firstWrite.manualBackup,
      source: 'manual',
      timestamp: '2026-04-13T21:20:00+08:00',
      version: 'v2',
      createBackup: true,
    })

    expect(firstWrite.manualBackup?.data.projects).toEqual([{ id: 'project-first' }])
    expect(secondWrite.manualBackup?.data.projects).toEqual([{ id: 'project-second' }])
    expect(secondWrite.manualBackup?.meta.version).toBe('v2')
  })

  it('keeps the previous manual backup when auto sync runs', () => {
    const backup: SyncEnvelope = {
      meta: {
        version: 'backup-v1',
        updatedAt: '2026-04-13T21:05:00+08:00',
        source: 'manual',
      },
      data: buildPayload('2026-04-13T21:05:00+08:00', 'backup'),
    }

    const write = applyRemoteWrite({
      payload: buildPayload('2026-04-13T21:25:00+08:00', 'auto'),
      previousBackup: backup,
      source: 'auto',
      timestamp: '2026-04-13T21:25:00+08:00',
      version: 'auto-v2',
      createBackup: false,
    })

    expect(write.manualBackup).toEqual(backup)
    expect(write.current.meta.source).toBe('auto')
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

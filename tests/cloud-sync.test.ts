import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  applyRemoteWrite,
  hasBackupContent,
  shouldApplyRemoteCurrent,
} from '../src/features/sync/syncShared'
import type { BackupPayload } from '../src/legacy/utils'

const syncEnv = import.meta as ImportMeta & {
  env: Record<string, string | undefined>
}

const originalSyncApiUrl = syncEnv.env.VITE_SYNC_API_URL

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
    classSchedules: [],
    shortDramas: [],
    shortDramaGroups: [],
    shortDramaAssignments: [],
  }
}

beforeEach(() => {
  vi.resetModules()
  syncEnv.env.VITE_SYNC_API_URL = 'https://sync.example.com'
})

afterEach(() => {
  syncEnv.env.VITE_SYNC_API_URL = originalSyncApiUrl
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

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

  it('treats leave-only and settings-only snapshots as non-empty backups', () => {
    expect(hasBackupContent({
      schemaVersion: 3,
      exportedAt: '2026-04-17T16:00:00+08:00',
      projects: [],
      tasks: [],
      people: [],
      logs: [],
      settings: [],
      leaveRecords: [{ id: 'leave-1' }],
      classSchedules: [],
      shortDramas: [],
      shortDramaGroups: [],
      shortDramaAssignments: [],
    })).toBe(true)

    expect(hasBackupContent({
      schemaVersion: 3,
      exportedAt: '2026-04-17T16:00:00+08:00',
      projects: [],
      tasks: [],
      people: [],
      logs: [],
      settings: [{ key: 'materials:briefs', value: [] }],
      leaveRecords: [],
      classSchedules: [],
      shortDramas: [],
      shortDramaGroups: [],
      shortDramaAssignments: [],
    })).toBe(true)

    expect(hasBackupContent({
      schemaVersion: 3,
      exportedAt: '2026-04-17T16:00:00+08:00',
      projects: [],
      tasks: [],
      people: [],
      logs: [],
      settings: [],
      leaveRecords: [],
      classSchedules: [],
      shortDramas: [{ id: 'drama-1' }],
      shortDramaGroups: [],
      shortDramaAssignments: [],
    })).toBe(true)

    expect(hasBackupContent({
      schemaVersion: 5,
      exportedAt: '2026-05-02T16:00:00+08:00',
      projects: [],
      tasks: [],
      people: [],
      logs: [],
      settings: [],
      leaveRecords: [],
      classSchedules: [],
      shortDramas: [],
      shortDramaGroups: [],
      shortDramaAssignments: [],
    })).toBe(false)
  })

  it('includes cross-origin credentials when checking cloud sync meta', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      hasData: false,
      current: null,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }))
    vi.stubGlobal('fetch', fetchMock)

    const { fetchCloudSyncMeta } = await import('../src/features/sync/syncApi')
    await fetchCloudSyncMeta()

    expect(fetchMock).toHaveBeenCalledWith('https://sync.example.com/meta', expect.objectContaining({
      method: 'GET',
      credentials: 'include',
    }))
    expect(fetchMock.mock.calls[0]?.[1]).not.toHaveProperty('headers.Content-Type')
  })

  it('uses a simple credentialed POST when pushing cloud sync data', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      current: {
        meta: {
          version: 'v1',
          updatedAt: '2026-04-17T14:00:00+08:00',
          source: 'manual',
        },
        data: buildPayload('2026-04-17T14:00:00+08:00', 'manual'),
      },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }))
    vi.stubGlobal('fetch', fetchMock)

    const { pushCloudSyncData } = await import('../src/features/sync/syncApi')
    await pushCloudSyncData({
      payload: buildPayload('2026-04-17T14:00:00+08:00', 'manual'),
      source: 'manual',
    })

    expect(fetchMock).toHaveBeenCalledWith('https://sync.example.com/data', expect.objectContaining({
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'text/plain',
      },
    }))
    expect(JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string)).toEqual({
      payload: buildPayload('2026-04-17T14:00:00+08:00', 'manual'),
      source: 'manual',
    })
  })

  it('turns fetch failures into a Cloudflare Access hint', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    vi.stubGlobal('fetch', fetchMock)

    const { fetchCloudSyncMeta } = await import('../src/features/sync/syncApi')

    await expect(fetchCloudSyncMeta()).rejects.toThrow('Cloudflare Access')
    await expect(fetchCloudSyncMeta()).rejects.toThrow('https://sync.example.com')
  })

  it('treats HTML login responses as Cloudflare Access failures', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('<html>login</html>', {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    }))
    vi.stubGlobal('fetch', fetchMock)

    const { fetchCloudSyncMeta } = await import('../src/features/sync/syncApi')

    await expect(fetchCloudSyncMeta()).rejects.toThrow('Cloudflare Access')
  })

  it('does not seed demo data when configured cloud boot restore fails', async () => {
    const savePerson = vi.fn()
    const saveProject = vi.fn()
    const saveTask = vi.fn()
    const addLog = vi.fn()

    vi.doMock('../src/legacy/db', () => ({
      openDB: vi.fn(),
      db: {
        exportAll: vi.fn().mockResolvedValue({
          schemaVersion: 5,
          exportedAt: '2026-05-03T10:00:00+08:00',
          projects: [],
          tasks: [],
          people: [],
          logs: [],
          settings: [],
          leaveRecords: [],
          classSchedules: [],
          shortDramas: [],
          shortDramaGroups: [],
          shortDramaAssignments: [],
        }),
      },
    }))
    vi.doMock('../src/legacy/store', () => ({
      store: {
        loadAll: vi.fn(),
        savePerson,
        saveProject,
        saveTask,
        addLog,
      },
    }))
    vi.doMock('../src/features/sync/bootstrapSync', () => ({
      restoreCloudSnapshotOnBoot: vi.fn().mockRejectedValue(new Error('Access required')),
    }))
    vi.doMock('../src/features/sync/syncApi', () => ({
      isCloudSyncConfigured: () => true,
    }))
    vi.doMock('../src/features/persistence/syncableViewState', () => ({
      initializeSyncableViewState: vi.fn(),
    }))
    vi.stubGlobal('window', { location: { hash: '' } })

    const { initializeAppData } = await import('../src/legacy/bootstrap')
    await initializeAppData()

    expect(savePerson).not.toHaveBeenCalled()
    expect(saveProject).not.toHaveBeenCalled()
    expect(saveTask).not.toHaveBeenCalled()
    expect(addLog).not.toHaveBeenCalledWith('加载了演示数据')
  })
})

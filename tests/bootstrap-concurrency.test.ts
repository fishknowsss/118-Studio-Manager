// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildBackupPayload } from '../src/legacy/utils'

afterEach(() => {
  vi.resetModules()
  vi.restoreAllMocks()
  vi.clearAllMocks()
  window.localStorage.clear()
})

describe('application bootstrap', () => {
  it('makes concurrent callers wait for the same initialization', async () => {
    let finishOpening: (() => void) | undefined
    const openDB = vi.fn(() => new Promise<void>((resolve) => {
      finishOpening = resolve
    }))
    const loadAll = vi.fn().mockResolvedValue(undefined)
    const initializeSyncableViewState = vi.fn().mockResolvedValue(undefined)

    vi.doMock('../src/legacy/db', () => ({
      openDB,
      db: {
        exportAll: vi.fn().mockResolvedValue(buildBackupPayload({
          projects: [{ id: 'project-1' }],
        })),
      },
    }))
    vi.doMock('../src/legacy/store', () => ({
      store: { loadAll },
    }))
    vi.doMock('../src/features/sync/bootstrapSync', () => ({
      restoreCloudSnapshotOnBoot: vi.fn(),
    }))
    vi.doMock('../src/features/sync/syncApi', () => ({
      isCloudSyncConfigured: () => false,
    }))
    vi.doMock('../src/features/persistence/syncableViewState', () => ({
      initializeSyncableViewState,
    }))

    const { initializeAppData } = await import('../src/legacy/bootstrap')
    const first = initializeAppData()
    const second = initializeAppData()
    let secondFinished = false
    void second.then(() => {
      secondFinished = true
    })

    await Promise.resolve()
    expect(secondFinished).toBe(false)
    expect(openDB).toHaveBeenCalledTimes(1)

    finishOpening?.()
    await Promise.all([first, second])

    expect(loadAll).toHaveBeenCalledTimes(2)
    expect(initializeSyncableViewState).toHaveBeenCalledTimes(1)
  })

  it('keeps an intentionally cleared local snapshot when unsynced changes are pending', async () => {
    window.localStorage.setItem('cloud-sync-state-v1', JSON.stringify({
      lastCompletedSyncAt: '2026-07-13T10:00:00.000Z',
      lastAppliedVersion: 'remote-v1',
      pendingLocalChanges: true,
    }))
    const restoreCloudSnapshotOnBoot = vi.fn()
    const saveProject = vi.fn()

    vi.doMock('../src/legacy/db', () => ({
      openDB: vi.fn(),
      db: {
        exportAll: vi.fn().mockResolvedValue(buildBackupPayload({})),
      },
    }))
    vi.doMock('../src/legacy/store', () => ({
      store: {
        loadAll: vi.fn().mockResolvedValue(undefined),
        savePerson: vi.fn(),
        saveProject,
        saveTask: vi.fn(),
        addLog: vi.fn(),
      },
    }))
    vi.doMock('../src/features/sync/bootstrapSync', () => ({
      restoreCloudSnapshotOnBoot,
    }))
    vi.doMock('../src/features/sync/syncApi', () => ({
      isCloudSyncConfigured: () => true,
    }))
    vi.doMock('../src/features/persistence/syncableViewState', () => ({
      initializeSyncableViewState: vi.fn().mockResolvedValue(undefined),
    }))

    const { initializeAppData } = await import('../src/legacy/bootstrap')
    await initializeAppData()

    expect(restoreCloudSnapshotOnBoot).not.toHaveBeenCalled()
    expect(saveProject).not.toHaveBeenCalled()
  })

  it('preserves real records mixed with older demo project names', async () => {
    const clearAll = vi.fn()
    const saveProject = vi.fn()
    vi.doMock('../src/legacy/db', () => ({
      openDB: vi.fn(),
      db: {
        clearAll,
        exportAll: vi.fn().mockResolvedValue(buildBackupPayload({
          projects: ['品牌宣传片 · 第三季', '线下活动视觉设计', '社交媒体内容 · 4月'].map((name, i) => ({ id: `project-${i}`, name })),
          tasks: [{ id: 'real-task', title: '实际制作任务' }],
          people: [{ id: 'real-person', name: '实际成员' }],
        })),
      },
    }))
    vi.doMock('../src/legacy/store', () => ({ store: { loadAll: vi.fn(), saveProject } }))
    vi.doMock('../src/features/sync/syncApi', () => ({ isCloudSyncConfigured: () => false }))
    vi.doMock('../src/features/persistence/syncableViewState', () => ({ initializeSyncableViewState: vi.fn() }))

    const { initializeAppData } = await import('../src/legacy/bootstrap')
    await initializeAppData()
    expect(clearAll).not.toHaveBeenCalled()
    expect(saveProject).not.toHaveBeenCalled()
  })

})

// @vitest-environment jsdom

import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi, type Mock } from 'vitest'
import { buildBackupPayload } from '../src/legacy/utils'

const successfulSync = {
  current: {
    meta: {
      version: 'remote-v2',
      updatedAt: '2026-07-13T10:00:00.000Z',
      source: 'auto' as const,
    },
    data: buildBackupPayload({ projects: [{ id: 'project-1' }] }),
  },
}

async function renderProvider({
  fetchData = vi.fn(),
  fetchMeta = vi.fn().mockResolvedValue({ hasData: false, current: null }),
  flush = vi.fn().mockResolvedValue(undefined),
  importAll = vi.fn().mockResolvedValue(undefined),
  push = vi.fn().mockResolvedValue(successfulSync),
  waitForStoreWrites = vi.fn().mockResolvedValue(undefined),
  exportAll = vi.fn().mockResolvedValue(buildBackupPayload({
    projects: [{ id: 'project-1' }],
  })),
}: {
  fetchData?: Mock
  fetchMeta?: Mock
  flush?: Mock
  importAll?: Mock
  push?: Mock
  waitForStoreWrites?: Mock
  exportAll?: Mock
} = {}) {
  let notifyStoreChanged: (() => void) | undefined
  let notifyStoreWriteStarted: (() => void) | undefined

  vi.doMock('../src/legacy/db', () => ({
    db: {
      exportAll,
      importAll,
    },
  }))
  vi.doMock('../src/legacy/store', () => ({
    subscribeStoreWriteStarted: vi.fn((listener: () => void) => {
      notifyStoreWriteStarted = listener
      return () => undefined
    }),
    store: {
      subscribe: vi.fn((listener: () => void) => {
        notifyStoreChanged = listener
        return () => undefined
      }),
      loadAll: vi.fn().mockResolvedValue(undefined),
    },
    waitForStoreWrites,
  }))
  vi.doMock('../src/features/sync/syncApi', () => ({
    isCloudSyncConfigured: () => true,
    fetchCloudSyncMeta: fetchMeta,
    fetchCloudSyncData: fetchData,
    pushCloudSyncData: push,
  }))
  vi.doMock('../src/features/persistence/syncableViewState', () => ({
    flushSyncableViewStatePersistence: flush,
    reloadSyncableViewStateFromDB: vi.fn().mockResolvedValue(undefined),
  }))

  const { CloudSyncProvider, useCloudSync } = await import('../src/features/sync/SyncProvider')
  function Harness() {
    const { manualSync, refreshRemoteMeta, restoreCloudToLocal, state } = useCloudSync()
    return (
      <>
        <output>{state.phase}:{state.message}</output>
        <button type="button" data-action="sync" onClick={() => void manualSync().catch(() => undefined)}>同步</button>
        <button type="button" data-action="restore" onClick={() => void restoreCloudToLocal().catch(() => undefined)}>恢复</button>
        <button type="button" data-action="refresh" onClick={() => void refreshRemoteMeta().catch(() => undefined)}>刷新</button>
      </>
    )
  }

  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  await act(async () => {
    root.render(<CloudSyncProvider><Harness /></CloudSyncProvider>)
    await Promise.resolve()
  })

  return {
    container,
    notifyStoreChanged() {
      act(() => notifyStoreChanged?.())
    },
    notifyStoreWriteStarted() {
      act(() => notifyStoreWriteStarted?.())
    },
    cleanup() {
      act(() => root.unmount())
      container.remove()
    },
  }
}

afterEach(() => {
  vi.useRealTimers()
  vi.resetModules()
  vi.restoreAllMocks()
  window.localStorage.clear()
})

describe('cloud sync provider', () => {
  it('reports an automatic sync failure without leaving an unhandled rejection', async () => {
    vi.useFakeTimers()
    const view = await renderProvider({
      push: vi.fn().mockRejectedValue(new Error('网络暂时不可用')),
    })

    view.notifyStoreChanged()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2 * 60_000)
    })

    expect(view.container.querySelector('output')?.textContent).toBe('error:网络暂时不可用')
    expect(JSON.parse(window.localStorage.getItem('cloud-sync-state-v1') || '{}')).toMatchObject({
      pendingLocalChanges: true,
    })
    view.cleanup()
  })

  it('reschedules an automatic sync after reloading with pending local changes', async () => {
    vi.useFakeTimers()
    window.localStorage.setItem('cloud-sync-state-v1', JSON.stringify({
      lastCompletedSyncAt: null,
      lastAppliedVersion: 'remote-v1',
      pendingLocalChanges: true,
    }))
    const push = vi.fn().mockResolvedValue(successfulSync)
    const view = await renderProvider({ push })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2 * 60_000)
    })

    expect(push).toHaveBeenCalledTimes(1)
    expect(JSON.parse(window.localStorage.getItem('cloud-sync-state-v1') || '{}')).toMatchObject({
      pendingLocalChanges: false,
      lastAppliedVersion: 'remote-v2',
    })
    view.cleanup()
  })

  it('keeps newer edits pending when an older upload finishes', async () => {
    vi.useFakeTimers()
    let finishPush: ((value: typeof successfulSync) => void) | undefined
    const push = vi.fn(() => new Promise<typeof successfulSync>((resolve) => {
      finishPush = resolve
    }))
    const view = await renderProvider({ push })

    view.notifyStoreChanged()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2 * 60_000)
    })
    expect(push).toHaveBeenCalledTimes(1)

    view.notifyStoreChanged()
    await act(async () => {
      finishPush?.(successfulSync)
      await Promise.resolve()
    })

    expect(JSON.parse(window.localStorage.getItem('cloud-sync-state-v1') || '{}')).toMatchObject({
      pendingLocalChanges: true,
    })
    view.cleanup()
  })

  it('clears a queued automatic upload after a successful manual sync', async () => {
    vi.useFakeTimers()
    const push = vi.fn().mockResolvedValue(successfulSync)
    const view = await renderProvider({ push })

    view.notifyStoreChanged()
    await act(async () => {
      view.container.querySelector<HTMLButtonElement>('[data-action="sync"]')?.click()
      await Promise.resolve()
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2 * 60_000)
    })

    expect(push).toHaveBeenCalledTimes(1)
    view.cleanup()
  })

  it('moves to an error state when restoring cloud data fails', async () => {
    const view = await renderProvider({
      fetchData: vi.fn().mockRejectedValue(new Error('无法读取云端备份')),
    })

    await act(async () => {
      view.container.querySelector<HTMLButtonElement>('[data-action="restore"]')?.click()
      await Promise.resolve()
    })

    expect(view.container.querySelector('output')?.textContent).toBe('error:无法读取云端备份')
    view.cleanup()
  })

  it('waits for an active upload before restoring cloud data', async () => {
    let finishPush: ((value: typeof successfulSync) => void) | undefined
    const push = vi.fn(() => new Promise<typeof successfulSync>((resolve) => {
      finishPush = resolve
    }))
    const fetchData = vi.fn().mockResolvedValue(successfulSync)
    const view = await renderProvider({ fetchData, push })

    act(() => {
      view.container.querySelector<HTMLButtonElement>('[data-action="sync"]')?.click()
      view.container.querySelector<HTMLButtonElement>('[data-action="restore"]')?.click()
    })
    await act(async () => Promise.resolve())
    expect(fetchData).not.toHaveBeenCalled()

    await act(async () => {
      finishPush?.(successfulSync)
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(fetchData).toHaveBeenCalledTimes(1)
    view.cleanup()
  })

  it('releases the restore lock when the active upload fails', async () => {
    const fetchData = vi.fn().mockResolvedValue(successfulSync)
    const importAll = vi.fn().mockResolvedValue(undefined)
    const view = await renderProvider({
      fetchData,
      importAll,
      push: vi.fn().mockRejectedValue(new Error('上传失败')),
    })

    await act(async () => {
      view.container.querySelector<HTMLButtonElement>('[data-action="sync"]')?.click()
      view.container.querySelector<HTMLButtonElement>('[data-action="restore"]')?.click()
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(view.container.querySelector('output')?.textContent).toBe('error:上传失败')

    await act(async () => {
      view.container.querySelector<HTMLButtonElement>('[data-action="restore"]')?.click()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(fetchData).toHaveBeenCalledTimes(1)
    expect(importAll).toHaveBeenCalledTimes(1)
    expect(view.container.querySelector('output')?.textContent).toBe('ready:')
    view.cleanup()
  })

  it('does not let a forced restore overwrite an edit made after restore starts', async () => {
    let finishFetch: ((value: typeof successfulSync) => void) | undefined
    const fetchData = vi.fn(() => new Promise<typeof successfulSync>((resolve) => {
      finishFetch = resolve
    }))
    const importAll = vi.fn().mockResolvedValue(undefined)
    const view = await renderProvider({ fetchData, importAll })

    act(() => view.container.querySelector<HTMLButtonElement>('[data-action="restore"]')?.click())
    await vi.waitFor(() => expect(fetchData).toHaveBeenCalledTimes(1))
    view.notifyStoreChanged()
    await act(async () => {
      finishFetch?.(successfulSync)
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(importAll).not.toHaveBeenCalled()
    expect(JSON.parse(window.localStorage.getItem('cloud-sync-state-v1') || '{}')).toMatchObject({
      pendingLocalChanges: true,
    })
    view.cleanup()
  })

  it('aborts automatic restore when a local edit arrives after the remote check', async () => {
    let finishFlush: (() => void) | undefined
    const flush = vi.fn(() => new Promise<void>((resolve) => {
      finishFlush = resolve
    }))
    const importAll = vi.fn().mockResolvedValue(undefined)
    const push = vi.fn().mockResolvedValue(successfulSync)
    const view = await renderProvider({
      exportAll: vi.fn().mockResolvedValue(buildBackupPayload({})),
      fetchData: vi.fn().mockResolvedValue(successfulSync),
      fetchMeta: vi.fn().mockResolvedValue({ hasData: true, current: successfulSync.current.meta }),
      flush,
      importAll,
      push,
    })

    await vi.waitFor(() => expect(flush).toHaveBeenCalledTimes(1))
    view.notifyStoreChanged()
    await act(async () => {
      finishFlush?.()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(importAll).not.toHaveBeenCalled()
    expect(push).not.toHaveBeenCalled()
    expect(JSON.parse(window.localStorage.getItem('cloud-sync-state-v1') || '{}')).toMatchObject({
      pendingLocalChanges: true,
    })
    view.cleanup()
  })

  it('waits for legacy writes and aborts restore when one starts before its store event', async () => {
    let finishStoreWrites: (() => void) | undefined
    const waitForStoreWrites = vi.fn(() => new Promise<void>((resolve) => {
      finishStoreWrites = resolve
    }))
    const importAll = vi.fn().mockResolvedValue(undefined)
    const view = await renderProvider({
      exportAll: vi.fn().mockResolvedValue(buildBackupPayload({})),
      fetchData: vi.fn().mockResolvedValue(successfulSync),
      fetchMeta: vi.fn().mockResolvedValue({ hasData: true, current: successfulSync.current.meta }),
      importAll,
      waitForStoreWrites,
    })

    await vi.waitFor(() => expect(waitForStoreWrites).toHaveBeenCalledTimes(1))
    view.notifyStoreWriteStarted()
    await act(async () => {
      finishStoreWrites?.()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(importAll).not.toHaveBeenCalled()
    expect(JSON.parse(window.localStorage.getItem('cloud-sync-state-v1') || '{}')).toMatchObject({
      pendingLocalChanges: true,
    })
    view.cleanup()
  })

  it('blocks uploads while an automatic restore owns the restore lock', async () => {
    let finishFetch: ((value: typeof successfulSync) => void) | undefined
    const fetchData = vi.fn(() => new Promise<typeof successfulSync>((resolve) => {
      finishFetch = resolve
    }))
    const push = vi.fn().mockResolvedValue(successfulSync)
    const view = await renderProvider({
      exportAll: vi.fn().mockResolvedValue(buildBackupPayload({})),
      fetchData,
      fetchMeta: vi.fn().mockResolvedValue({ hasData: true, current: successfulSync.current.meta }),
      push,
    })

    await vi.waitFor(() => expect(fetchData).toHaveBeenCalledTimes(1))
    act(() => view.container.querySelector<HTMLButtonElement>('[data-action="sync"]')?.click())
    await act(async () => Promise.resolve())
    expect(push).not.toHaveBeenCalled()

    await act(async () => {
      finishFetch?.(successfulSync)
      await Promise.resolve()
      await Promise.resolve()
    })
    view.cleanup()
  })

  it('requeues an edit whose automatic upload timer fires during a slow restore', async () => {
    vi.useFakeTimers()
    let finishFetch: ((value: typeof successfulSync) => void) | undefined
    const fetchData = vi.fn(() => new Promise<typeof successfulSync>((resolve) => {
      finishFetch = resolve
    }))
    const push = vi.fn().mockResolvedValue(successfulSync)
    const view = await renderProvider({
      exportAll: vi.fn().mockResolvedValue(buildBackupPayload({})),
      fetchData,
      fetchMeta: vi.fn().mockResolvedValue({ hasData: true, current: successfulSync.current.meta }),
      push,
    })

    await vi.waitFor(() => expect(fetchData).toHaveBeenCalledTimes(1))
    view.notifyStoreChanged()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2 * 60_000)
    })
    expect(push).not.toHaveBeenCalled()

    await act(async () => {
      finishFetch?.(successfulSync)
      await Promise.resolve()
      await Promise.resolve()
      await vi.advanceTimersByTimeAsync(2 * 60_000)
    })

    expect(push).toHaveBeenCalledTimes(1)
    view.cleanup()
  })

  it('schedules shared IndexedDB changes reported by another tab', async () => {
    vi.useFakeTimers()
    const push = vi.fn().mockResolvedValue(successfulSync)
    const view = await renderProvider({ push })
    const nextState = JSON.stringify({
      lastCompletedSyncAt: null,
      lastAppliedVersion: null,
      pendingLocalChanges: true,
    })
    window.localStorage.setItem('cloud-sync-state-v1', nextState)

    act(() => window.dispatchEvent(new StorageEvent('storage', {
      key: 'cloud-sync-state-v1',
      newValue: nextState,
    })))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2 * 60_000)
    })

    expect(push).toHaveBeenCalledTimes(1)
    view.cleanup()
  })

  it('deduplicates metadata refreshes and does not overwrite an active sync phase', async () => {
    let finishMeta: ((value: { hasData: false; current: null }) => void) | undefined
    let finishPush: ((value: typeof successfulSync) => void) | undefined
    const fetchMeta = vi.fn(() => new Promise<{ hasData: false; current: null }>((resolve) => {
      finishMeta = resolve
    }))
    const push = vi.fn(() => new Promise<typeof successfulSync>((resolve) => {
      finishPush = resolve
    }))
    const view = await renderProvider({ fetchMeta, push })

    await vi.waitFor(() => expect(fetchMeta).toHaveBeenCalledTimes(1))
    act(() => {
      view.container.querySelector<HTMLButtonElement>('[data-action="refresh"]')?.click()
      view.container.querySelector<HTMLButtonElement>('[data-action="refresh"]')?.click()
      view.container.querySelector<HTMLButtonElement>('[data-action="sync"]')?.click()
    })
    expect(fetchMeta).toHaveBeenCalledTimes(1)
    expect(view.container.querySelector('output')?.textContent).toBe('syncing:正在同步到云端')

    await act(async () => {
      finishMeta?.({ hasData: false, current: null })
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(view.container.querySelector('output')?.textContent).toBe('syncing:正在同步到云端')

    await act(async () => {
      finishPush?.(successfulSync)
      await Promise.resolve()
    })
    expect(view.container.querySelector('output')?.textContent).toBe('ready:')
    view.cleanup()
  })
})

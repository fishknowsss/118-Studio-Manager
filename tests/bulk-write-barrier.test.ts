// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildBackupPayload } from '../src/legacy/utils'

const backup = buildBackupPayload({
  projects: [{ id: 'project-1', name: '测试项目' }],
})

async function setupDelayedImport() {
  let finishImport: (() => void) | undefined
  const importAll = vi.fn(() => new Promise<void>((resolve) => {
    finishImport = resolve
  }))
  const exportAll = vi.fn().mockResolvedValue(backup)

  vi.doMock('../src/legacy/db', () => ({
    db: {
      clearAll: vi.fn().mockResolvedValue(undefined),
      exportAll,
      importAll,
    },
  }))
  vi.doMock('../src/features/persistence/syncableViewState', () => ({
    flushSyncableViewStatePersistence: vi.fn().mockResolvedValue(undefined),
    reloadSyncableViewStateFromDB: vi.fn().mockResolvedValue(undefined),
  }))

  const storeModule = await import('../src/legacy/store')
  vi.spyOn(storeModule.store, 'loadAll').mockResolvedValue(undefined)

  return {
    ...storeModule,
    exportAll,
    finishImport() {
      finishImport?.()
    },
    importAll,
  }
}

afterEach(() => {
  vi.resetModules()
  vi.restoreAllMocks()
})

describe('bulk local write barrier', () => {
  it('keeps JSON import inside the barrier until IndexedDB and in-memory reload finish', async () => {
    const setup = await setupDelayedImport()
    const { importBackupText } = await import('../src/legacy/actions')
    const onWriteStarted = vi.fn()
    const unsubscribe = setup.subscribeStoreWriteStarted(onWriteStarted)

    const operation = importBackupText(JSON.stringify(backup))
    await vi.waitFor(() => expect(onWriteStarted).toHaveBeenCalledTimes(1))

    let barrierResolved = false
    const barrier = setup.waitForStoreWrites().then(() => {
      barrierResolved = true
    })
    await Promise.resolve()
    expect(barrierResolved).toBe(false)

    setup.finishImport()
    await Promise.all([operation, barrier])
    expect(setup.importAll).toHaveBeenCalledWith(expect.objectContaining({ schemaVersion: backup.schemaVersion }))
    expect(setup.store.loadAll).toHaveBeenCalledTimes(1)
    expect(barrierResolved).toBe(true)

    unsubscribe()
  })

  it('keeps an undo snapshot restore inside the same barrier', async () => {
    const setup = await setupDelayedImport()
    const { pushUndoCheckpoint, undoLastEdit } = await import('../src/legacy/editUndo')
    await pushUndoCheckpoint('编辑项目')
    const onWriteStarted = vi.fn()
    const unsubscribe = setup.subscribeStoreWriteStarted(onWriteStarted)

    const operation = undoLastEdit()
    await vi.waitFor(() => expect(onWriteStarted).toHaveBeenCalledTimes(1))
    const barrier = setup.waitForStoreWrites()

    setup.finishImport()
    const [result] = await Promise.all([operation, barrier])
    expect(result).toMatchObject({ label: '编辑项目', revertedCount: 1 })
    expect(setup.importAll).toHaveBeenCalledWith(backup)
    expect(setup.store.loadAll).toHaveBeenCalledTimes(1)

    unsubscribe()
  })
})

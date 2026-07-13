// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.resetModules()
  vi.restoreAllMocks()
})

describe('legacy store write barrier', () => {
  it('notifies synchronously and waits for writes added while the barrier is pending', async () => {
    const resolvers: Array<() => void> = []
    const put = vi.fn(() => new Promise<void>((resolve) => {
      resolvers.push(resolve)
    }))
    vi.doMock('../src/legacy/db', () => ({
      db: { put },
    }))

    const {
      store,
      subscribeStoreWriteStarted,
      waitForStoreWrites,
    } = await import('../src/legacy/store')
    const onWriteStarted = vi.fn()
    const unsubscribe = subscribeStoreWriteStarted(onWriteStarted)

    const firstWrite = store.saveProject({ id: 'project-1' })
    expect(onWriteStarted).toHaveBeenCalledTimes(1)

    let barrierResolved = false
    const barrier = waitForStoreWrites().then(() => {
      barrierResolved = true
    })
    await Promise.resolve()
    expect(barrierResolved).toBe(false)

    const secondWrite = store.saveProject({ id: 'project-2' })
    expect(onWriteStarted).toHaveBeenCalledTimes(2)
    resolvers[0]?.()
    await firstWrite
    await Promise.resolve()
    expect(barrierResolved).toBe(false)

    resolvers[1]?.()
    await Promise.all([secondWrite, barrier])
    expect(barrierResolved).toBe(true)

    unsubscribe()
  })

  it('settles the barrier when a tracked write fails while preserving the caller error', async () => {
    vi.doMock('../src/legacy/db', () => ({
      db: {
        put: vi.fn().mockRejectedValue(new Error('写入失败')),
      },
    }))

    const { store, waitForStoreWrites } = await import('../src/legacy/store')
    const write = store.saveTask({ id: 'task-1' })
    const barrier = waitForStoreWrites()

    await expect(write).rejects.toThrow('写入失败')
    await expect(barrier).resolves.toBeUndefined()
  })
})

// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'

const { dbGetMock, dbPutMock } = vi.hoisted(() => ({
  dbGetMock: vi.fn(),
  dbPutMock: vi.fn(),
}))

vi.mock('../src/legacy/db', () => ({
  db: {
    get: dbGetMock,
    put: dbPutMock,
  },
}))

import {
  __resetMaterialsStateForTests,
  initializeMaterialsState,
  readBriefs,
  readFolders,
  reloadMaterialsStateFromDB,
  writeFolders,
} from '../src/features/materials/materialsState'
import { flushSyncableViewStatePersistence } from '../src/features/persistence/syncableViewState'

async function flushMicrotasks() {
  await new Promise((resolve) => setTimeout(resolve, 0))
}

describe('syncable view state', () => {
  beforeEach(() => {
    dbGetMock.mockReset()
    dbPutMock.mockReset()
    localStorage.clear()
    __resetMaterialsStateForTests()
  })

  it('migrates materials data from legacy localStorage into syncable settings storage', async () => {
    localStorage.setItem('materials-briefs-v1', JSON.stringify([
      {
        id: 'brief-1',
        clientName: '甲方 A',
        requirements: '改资料页',
        referenceUrls: [],
      },
    ]))
    localStorage.setItem('materials-accounts-v1', JSON.stringify([
      {
        id: 'acc-1',
        platform: 'Figma',
        account: 'team@example.com',
        password: 'secret',
        category: 'design',
      },
    ]))

    dbGetMock.mockResolvedValue(undefined)

    await initializeMaterialsState()

    expect(readBriefs()).toEqual([
      expect.objectContaining({
        id: 'brief-1',
        clientName: '甲方 A',
        requirements: '改资料页',
      }),
    ])
    expect(dbPutMock).toHaveBeenCalledWith('settings', expect.objectContaining({
      key: 'materials:briefs',
      value: expect.arrayContaining([
        expect.objectContaining({ id: 'brief-1' }),
      ]),
    }))
    expect(dbPutMock).toHaveBeenCalledWith('settings', expect.objectContaining({
      key: 'materials:accounts',
      value: expect.arrayContaining([
        expect.objectContaining({ id: 'acc-1', platform: 'Figma' }),
      ]),
    }))
  })

  it('reloads materials data from synced settings records', async () => {
    dbGetMock.mockImplementation(async (_store: string, key: string) => {
      if (key === 'materials:briefs') {
        return {
          key,
          value: [
            {
              id: 'brief-cloud',
              clientName: '云端甲方',
              requirements: '云端内容',
              referenceUrls: [],
            },
          ],
        }
      }

      return undefined
    })

    await reloadMaterialsStateFromDB()

    expect(readBriefs()).toEqual([
      expect.objectContaining({
        id: 'brief-cloud',
        clientName: '云端甲方',
      }),
    ])
  })

  it('keeps legacy localStorage data when migration persistence fails', async () => {
    localStorage.setItem('materials-briefs-v1', JSON.stringify([
      {
        id: 'brief-1',
        clientName: '甲方 A',
        requirements: '改资料页',
        referenceUrls: [],
      },
    ]))

    dbGetMock.mockResolvedValue(undefined)
    dbPutMock.mockRejectedValueOnce(new Error('disk full'))
    vi.spyOn(console, 'error').mockImplementation(() => {})

    await initializeMaterialsState()

    expect(readBriefs()).toEqual([
      expect.objectContaining({
        id: 'brief-1',
        clientName: '甲方 A',
      }),
    ])
    expect(localStorage.getItem('materials-briefs-v1')).not.toBeNull()
  })

  it('persists materials folders through syncable settings and emits a sync event on local edits', async () => {
    const handler = vi.fn()
    document.addEventListener('syncableDataUpdated', handler)

    writeFolders(['设计协作', '云盘归档'])
    await flushMicrotasks()

    expect(readFolders()).toEqual(['设计协作', '云盘归档'])
    expect(dbPutMock).toHaveBeenCalledWith('settings', expect.objectContaining({
      key: 'materials:folders',
      value: ['设计协作', '云盘归档'],
    }))
    expect(handler).toHaveBeenCalledTimes(1)
    expect((handler.mock.calls[0]?.[0] as CustomEvent).detail).toEqual({ key: 'materials:folders' })

    document.removeEventListener('syncableDataUpdated', handler)
  })

  it('does not update local settings state or emit sync events before persistence succeeds', async () => {
    const handler = vi.fn()
    document.addEventListener('syncableDataUpdated', handler)
    dbPutMock.mockRejectedValueOnce(new Error('write failed'))
    vi.spyOn(console, 'error').mockImplementation(() => {})

    writeFolders(['设计协作'])
    await flushMicrotasks()

    expect(readFolders()).toEqual([])
    expect(handler).not.toHaveBeenCalled()

    document.removeEventListener('syncableDataUpdated', handler)
  })

  it('waits for pending syncable settings writes before continuing persistence-sensitive flows', async () => {
    let resolveWrite: (() => void) | null = null
    dbPutMock.mockReturnValueOnce(new Promise<void>((resolve) => {
      resolveWrite = resolve
    }))

    writeFolders(['设计协作'])

    let flushed = false
    const flushPromise = flushSyncableViewStatePersistence().then(() => {
      flushed = true
    })

    await flushMicrotasks()
    expect(flushed).toBe(false)
    expect(readFolders()).toEqual([])

    resolveWrite?.()
    await flushPromise

    expect(flushed).toBe(true)
    expect(readFolders()).toEqual(['设计协作'])
  })
})

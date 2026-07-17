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
  __resetQuoteLibraryStateForTests,
  initializeQuoteLibraryState,
  readCustomMotivations,
  readCustomQuotes,
  reloadQuoteLibraryStateFromDB,
  writeCustomMotivations,
  writeCustomQuotes,
} from '../src/features/dashboard/quoteLibraryState'
import { flushSyncableViewStatePersistence } from '../src/features/persistence/syncableViewState'

describe('quote library persistence', () => {
  beforeEach(() => {
    dbGetMock.mockReset()
    dbPutMock.mockReset()
    dbPutMock.mockResolvedValue(undefined)
    localStorage.clear()
    __resetQuoteLibraryStateForTests()
  })

  it('migrates the legacy localStorage quote library into backup settings', async () => {
    localStorage.setItem('118studio:custom-quotes', JSON.stringify([
      { text: '旧格言', src: '旧来源' },
    ]))
    localStorage.setItem('118studio:custom-motivations', JSON.stringify(['旧激励语']))
    dbGetMock.mockResolvedValue(undefined)

    await initializeQuoteLibraryState()

    expect(readCustomQuotes()).toEqual([{ text: '旧格言', src: '旧来源' }])
    expect(readCustomMotivations()).toEqual(['旧激励语'])
    expect(dbPutMock).toHaveBeenCalledWith('settings', expect.objectContaining({
      key: 'dashboard:custom-quotes',
      value: [{ text: '旧格言', src: '旧来源' }],
    }))
    expect(dbPutMock).toHaveBeenCalledWith('settings', expect.objectContaining({
      key: 'dashboard:custom-motivations',
      value: ['旧激励语'],
    }))
    expect(localStorage.getItem('118studio:custom-quotes')).toBeNull()
    expect(localStorage.getItem('118studio:custom-motivations')).toBeNull()
  })

  it('persists edits in the settings collection used by JSON export and cloud sync', async () => {
    writeCustomQuotes([{ text: '同步格言', src: '测试' }])
    writeCustomMotivations(['同步激励语'])
    await flushSyncableViewStatePersistence()

    expect(readCustomQuotes()).toEqual([{ text: '同步格言', src: '测试' }])
    expect(readCustomMotivations()).toEqual(['同步激励语'])
    expect(dbPutMock).toHaveBeenCalledWith('settings', expect.objectContaining({
      key: 'dashboard:custom-quotes',
    }))
    expect(dbPutMock).toHaveBeenCalledWith('settings', expect.objectContaining({
      key: 'dashboard:custom-motivations',
    }))
  })

  it('reloads the quote library from settings restored by JSON import', async () => {
    dbGetMock.mockImplementation(async (_store: string, key: string) => ({
      key,
      value: key === 'dashboard:custom-quotes'
        ? [{ text: '恢复格言', src: '备份' }]
        : ['恢复激励语'],
    }))

    await reloadQuoteLibraryStateFromDB()

    expect(readCustomQuotes()).toEqual([{ text: '恢复格言', src: '备份' }])
    expect(readCustomMotivations()).toEqual(['恢复激励语'])
  })
})

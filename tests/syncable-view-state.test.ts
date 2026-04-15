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
  reloadMaterialsStateFromDB,
  writeBriefs,
} from '../src/features/materials/materialsState'
import {
  __resetRepositoryLinksStateForTests,
  initializeRepositoryLinksState,
  readRepositoryLinks,
  writeRepositoryLinks,
} from '../src/features/repository/repositoryLinksState'

describe('syncable view state', () => {
  beforeEach(() => {
    dbGetMock.mockReset()
    dbPutMock.mockReset()
    localStorage.clear()
    __resetMaterialsStateForTests()
    __resetRepositoryLinksStateForTests()
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

  it('persists repository links through syncable settings and emits a sync event on local edits', () => {
    const handler = vi.fn()
    document.addEventListener('syncableDataUpdated', handler)

    writeRepositoryLinks([
      {
        id: 'link-1',
        targetType: 'project',
        targetId: 'project-1',
        title: 'Notion',
        url: 'https://notion.so/demo',
        note: '',
        createdAt: '2026-04-15T10:00:00.000Z',
        updatedAt: '2026-04-15T10:00:00.000Z',
      },
    ])

    expect(readRepositoryLinks()).toEqual([
      expect.objectContaining({
        id: 'link-1',
        title: 'Notion',
      }),
    ])
    expect(dbPutMock).toHaveBeenCalledWith('settings', expect.objectContaining({
      key: 'repository:links',
      value: expect.arrayContaining([
        expect.objectContaining({ id: 'link-1' }),
      ]),
    }))
    expect(handler).toHaveBeenCalledTimes(1)
    expect((handler.mock.calls[0]?.[0] as CustomEvent).detail).toEqual({ key: 'repository:links' })

    document.removeEventListener('syncableDataUpdated', handler)
  })

  it('migrates repository links from legacy localStorage when no synced copy exists', async () => {
    localStorage.setItem('repository-links-v1', JSON.stringify([
      {
        id: 'link-old',
        targetType: 'task',
        targetId: 'task-1',
        title: 'Drive',
        url: 'https://drive.google.com/demo',
        note: '',
      },
    ]))

    dbGetMock.mockResolvedValue(undefined)

    await initializeRepositoryLinksState()

    expect(readRepositoryLinks()).toEqual([
      expect.objectContaining({
        id: 'link-old',
        targetType: 'task',
      }),
    ])
    expect(dbPutMock).toHaveBeenCalledWith('settings', expect.objectContaining({
      key: 'repository:links',
      value: expect.arrayContaining([
        expect.objectContaining({ id: 'link-old' }),
      ]),
    }))
  })
})

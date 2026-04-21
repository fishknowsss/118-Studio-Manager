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
  __resetDashboardPersonPanelStateForTests,
  readDashboardPersonPanelState,
  reorderDashboardPersonIds,
  writeDashboardPersonOrder,
  writeDashboardPersonPresence,
} from '../src/features/dashboard/personPanelState'
import {
  initializeSyncableViewState,
  reloadSyncableViewStateFromDB,
} from '../src/features/persistence/syncableViewState'

async function flushMicrotasks() {
  await new Promise((resolve) => setTimeout(resolve, 0))
}

describe('dashboard person panel state', () => {
  beforeEach(() => {
    dbGetMock.mockReset()
    dbPutMock.mockReset()
    localStorage.clear()
    __resetDashboardPersonPanelStateForTests()
  })

  it('loads dashboard people memory through syncable view state initialization and reload', async () => {
    dbGetMock.mockImplementation(async (_store: string, key: string) => {
      if (key !== 'dashboard:people-panel') return undefined
      return {
        key,
        value: {
          order: ['person-3', '', 'person-1', 'person-3'],
          presenceByPersonId: {
            'person-1': 'present',
            'person-2': 'default',
            'person-4': 'offline',
          },
        },
      }
    })

    await initializeSyncableViewState()

    expect(readDashboardPersonPanelState()).toEqual({
      order: ['person-3', 'person-1'],
      presenceByPersonId: {
        'person-1': 'present',
      },
    })

    dbGetMock.mockImplementation(async (_store: string, key: string) => {
      if (key !== 'dashboard:people-panel') return undefined
      return {
        key,
        value: {
          order: ['person-2', 'person-5'],
          presenceByPersonId: {
            'person-5': 'present',
          },
        },
      }
    })

    await reloadSyncableViewStateFromDB()

    expect(readDashboardPersonPanelState()).toEqual({
      order: ['person-2', 'person-5'],
      presenceByPersonId: {
        'person-5': 'present',
      },
    })
  })

  it('persists order and presence as syncable settings records', async () => {
    const handler = vi.fn()
    document.addEventListener('syncableDataUpdated', handler)

    writeDashboardPersonOrder(['person-2', 'person-1', 'person-2'])
    await flushMicrotasks()

    expect(readDashboardPersonPanelState()).toEqual({
      order: ['person-2', 'person-1'],
      presenceByPersonId: {},
    })
    expect(dbPutMock).toHaveBeenCalledWith('settings', expect.objectContaining({
      key: 'dashboard:people-panel',
      value: {
        order: ['person-2', 'person-1'],
        presenceByPersonId: {},
      },
    }))

    writeDashboardPersonPresence('person-1', 'present')
    await flushMicrotasks()

    expect(readDashboardPersonPanelState()).toEqual({
      order: ['person-2', 'person-1'],
      presenceByPersonId: {
        'person-1': 'present',
      },
    })

    writeDashboardPersonPresence('person-1', 'default')
    await flushMicrotasks()

    expect(readDashboardPersonPanelState()).toEqual({
      order: ['person-2', 'person-1'],
      presenceByPersonId: {},
    })
    expect(handler).toHaveBeenCalledTimes(3)

    document.removeEventListener('syncableDataUpdated', handler)
  })

  it('reorders dashboard people ids by swapping the dragged and target positions', () => {
    expect(reorderDashboardPersonIds(['person-1', 'person-2', 'person-3'], 'person-3', 'person-1'))
      .toEqual(['person-3', 'person-2', 'person-1'])

    expect(reorderDashboardPersonIds(['person-1', 'person-2', 'person-3'], 'person-1', 'person-3'))
      .toEqual(['person-3', 'person-2', 'person-1'])

    expect(reorderDashboardPersonIds(['person-1', 'person-2'], 'person-1', 'person-2'))
      .toEqual(['person-2', 'person-1'])

    expect(reorderDashboardPersonIds(['person-1', 'person-2'], 'person-2', 'person-2'))
      .toEqual(['person-1', 'person-2'])
  })
})

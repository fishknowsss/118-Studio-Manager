import { describe, expect, it, vi } from 'vitest'
import { ensureClassSchedulesStore, ensureShortDramaStores } from '../src/legacy/db'

function createUpgradeDb(existingStores: string[]) {
  const names = [...existingStores]
  const createdIndexes: Array<[string, string, IDBIndexParameters]> = []
  const createObjectStore = vi.fn((name: string) => {
    names.push(name)
    return {
      createIndex: vi.fn((indexName: string, keyPath: string, options: IDBIndexParameters) => {
        createdIndexes.push([indexName, keyPath, options])
      }),
    }
  })

  return {
    db: {
      objectStoreNames: {
        contains: (name: string) => names.includes(name),
      },
      createObjectStore,
    } as unknown as IDBDatabase,
    createObjectStore,
    createdIndexes,
  }
}

describe('IndexedDB migrations', () => {
  it('creates classSchedules when upgrading from a v4 database that missed the store', () => {
    const upgradeDb = createUpgradeDb(['projects', 'tasks', 'people', 'logs', 'settings', 'leaveRecords'])

    ensureClassSchedulesStore(upgradeDb.db)

    expect(upgradeDb.createObjectStore).toHaveBeenCalledWith('classSchedules', { keyPath: 'id' })
    expect(upgradeDb.createdIndexes).toEqual([
      ['personId', 'personId', { unique: false }],
      ['dayOfWeek', 'dayOfWeek', { unique: false }],
    ])
  })

  it('does not recreate classSchedules when the store already exists', () => {
    const upgradeDb = createUpgradeDb(['classSchedules'])

    ensureClassSchedulesStore(upgradeDb.db)

    expect(upgradeDb.createObjectStore).not.toHaveBeenCalled()
  })

  it('creates short drama stores with lookup indexes', () => {
    const upgradeDb = createUpgradeDb(['projects', 'tasks', 'people'])

    ensureShortDramaStores(upgradeDb.db)

    expect(upgradeDb.createObjectStore).toHaveBeenCalledWith('shortDramas', { keyPath: 'id' })
    expect(upgradeDb.createObjectStore).toHaveBeenCalledWith('shortDramaGroups', { keyPath: 'id' })
    expect(upgradeDb.createObjectStore).toHaveBeenCalledWith('shortDramaAssignments', { keyPath: 'id' })
    expect(upgradeDb.createdIndexes).toEqual([
      ['status', 'status', { unique: false }],
      ['dramaId', 'dramaId', { unique: false }],
      ['leaderId', 'leaderId', { unique: false }],
      ['dramaId', 'dramaId', { unique: false }],
      ['groupId', 'groupId', { unique: false }],
      ['status', 'status', { unique: false }],
    ])
  })
})

import { buildBackupPayload, BACKUP_COLLECTION_NAMES, normalizeImportedBackup, type BackupPayload } from './utils'

const DB_NAME = 'studio118db'
const DB_VERSION = 6

let dbInstance: IDBDatabase | null = null

export function ensureClassSchedulesStore(db: IDBDatabase) {
  if (db.objectStoreNames.contains('classSchedules')) return null

  const scheduleStore = db.createObjectStore('classSchedules', { keyPath: 'id' })
  scheduleStore.createIndex('personId', 'personId', { unique: false })
  scheduleStore.createIndex('dayOfWeek', 'dayOfWeek', { unique: false })
  return scheduleStore
}

export function ensureShortDramaStores(db: IDBDatabase) {
  if (!db.objectStoreNames.contains('shortDramas')) {
    const dramaStore = db.createObjectStore('shortDramas', { keyPath: 'id' })
    dramaStore.createIndex('status', 'status', { unique: false })
  }

  if (!db.objectStoreNames.contains('shortDramaGroups')) {
    const groupStore = db.createObjectStore('shortDramaGroups', { keyPath: 'id' })
    groupStore.createIndex('dramaId', 'dramaId', { unique: false })
    groupStore.createIndex('leaderId', 'leaderId', { unique: false })
  }

  if (!db.objectStoreNames.contains('shortDramaAssignments')) {
    const assignmentStore = db.createObjectStore('shortDramaAssignments', { keyPath: 'id' })
    assignmentStore.createIndex('dramaId', 'dramaId', { unique: false })
    assignmentStore.createIndex('groupId', 'groupId', { unique: false })
    assignmentStore.createIndex('status', 'status', { unique: false })
  }
}

export async function openDB() {
  if (dbInstance) return dbInstance

  return await new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)

    req.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      const tx = (event.target as IDBOpenDBRequest).transaction!
      const oldVersion = event.oldVersion

      if (oldVersion < 1) {
        const projectsStore = db.createObjectStore('projects', { keyPath: 'id' })
        projectsStore.createIndex('status', 'status', { unique: false })
        projectsStore.createIndex('ddl', 'ddl', { unique: false })

        // 新安装直接跳到 v2，不创建已废弃的 assigneeId 索引
        const tasksStore = db.createObjectStore('tasks', { keyPath: 'id' })
        tasksStore.createIndex('projectId', 'projectId', { unique: false })
        tasksStore.createIndex('status', 'status', { unique: false })
        tasksStore.createIndex('scheduledDate', 'scheduledDate', { unique: false })

        const peopleStore = db.createObjectStore('people', { keyPath: 'id' })
        peopleStore.createIndex('status', 'status', { unique: false })

        const logsStore = db.createObjectStore('logs', { keyPath: 'id' })
        logsStore.createIndex('ts', 'ts', { unique: false })

        db.createObjectStore('settings', { keyPath: 'key' })
      }

      if (oldVersion >= 1 && oldVersion < 2) {
        // v1 → v2：移除已废弃的 assigneeId 索引（已迁移为 assigneeIds）
        const tasksStore = tx.objectStore('tasks')
        if (tasksStore.indexNames.contains('assigneeId')) {
          tasksStore.deleteIndex('assigneeId')
        }
      }

      if (oldVersion < 3) {
        // v2/v1/v0 → v3：新增 leaveRecords 存储
        const leaveStore = db.createObjectStore('leaveRecords', { keyPath: 'id' })
        leaveStore.createIndex('date', 'date', { unique: false })
        leaveStore.createIndex('personId', 'personId', { unique: false })
      }

      ensureClassSchedulesStore(db)
      ensureShortDramaStores(db)

      if (oldVersion >= 4 && oldVersion < 5 && db.objectStoreNames.contains('productivityRecords')) {
        db.deleteObjectStore('productivityRecords')
      }
    }

    req.onsuccess = (event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result
      resolve(dbInstance)
    }

    req.onerror = () => reject(req.error)
  })
}

function getStore(name: string, mode: IDBTransactionMode = 'readonly') {
  if (!dbInstance) throw new Error('Database is not opened yet')
  return dbInstance.transaction(name, mode).objectStore(name)
}

function fromRequest<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export const db = {
  getAll: (name: string) => fromRequest(getStore(name).getAll()),
  get: (name: string, id: string) => fromRequest(getStore(name).get(id)),
  put: (name: string, value: unknown) => fromRequest(getStore(name, 'readwrite').put(value)),
  delete: (name: string, id: string) => fromRequest(getStore(name, 'readwrite').delete(id)),
  clear: (name: string) => fromRequest(getStore(name, 'readwrite').clear()),
  getAllByIndex(name: string, indexName: string, value: IDBValidKey | IDBKeyRange) {
    return fromRequest(getStore(name).index(indexName).getAll(value))
  },
  runTransaction(
    storeNames: string[],
    mode: IDBTransactionMode,
    callback: (stores: Record<string, IDBObjectStore>) => void,
  ): Promise<void> {
    if (!dbInstance) throw new Error('Database is not opened yet')
    const tx = dbInstance.transaction(storeNames, mode)
    const stores = Object.fromEntries(storeNames.map(name => [name, tx.objectStore(name)]))
    callback(stores)
    return new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)
    })
  },
  async clearAll() {
    const names = [...BACKUP_COLLECTION_NAMES]
    await this.runTransaction(names, 'readwrite', (stores) => {
      for (const name of names) stores[name].clear()
    })
  },
  async exportAll() {
    const entries = await Promise.all(
      BACKUP_COLLECTION_NAMES.map(async (name) => [name, await this.getAll(name)] as const),
    )
    const data = Object.fromEntries(entries) as Record<string, BackupPayload[keyof BackupPayload]>
    return buildBackupPayload(data as Partial<BackupPayload>)
  },
  async importAll(data: unknown) {
    const backup = normalizeImportedBackup(data)
    const names = [...BACKUP_COLLECTION_NAMES]
    await this.runTransaction(names, 'readwrite', (stores) => {
      for (const name of names) stores[name].clear()
      for (const name of names) {
        for (const record of backup[name]) stores[name].put(record)
      }
    })
  },
}

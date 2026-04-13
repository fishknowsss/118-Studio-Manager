import { buildBackupPayload, normalizeImportedBackup, type BackupPayload } from './utils'

const DB_NAME = 'studio118db'
const DB_VERSION = 1

let dbInstance: IDBDatabase | null = null

export async function openDB() {
  if (dbInstance) return dbInstance

  return await new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)

    req.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      if (!db.objectStoreNames.contains('projects')) {
        const store = db.createObjectStore('projects', { keyPath: 'id' })
        store.createIndex('status', 'status', { unique: false })
        store.createIndex('ddl', 'ddl', { unique: false })
      }

      if (!db.objectStoreNames.contains('tasks')) {
        const store = db.createObjectStore('tasks', { keyPath: 'id' })
        store.createIndex('projectId', 'projectId', { unique: false })
        store.createIndex('assigneeId', 'assigneeId', { unique: false })
        store.createIndex('status', 'status', { unique: false })
        store.createIndex('scheduledDate', 'scheduledDate', { unique: false })
      }

      if (!db.objectStoreNames.contains('people')) {
        const store = db.createObjectStore('people', { keyPath: 'id' })
        store.createIndex('status', 'status', { unique: false })
      }

      if (!db.objectStoreNames.contains('logs')) {
        const store = db.createObjectStore('logs', { keyPath: 'id' })
        store.createIndex('ts', 'ts', { unique: false })
      }

      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' })
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
    const names = ['projects', 'tasks', 'people', 'logs', 'settings']
    await this.runTransaction(names, 'readwrite', (stores) => {
      for (const name of names) stores[name].clear()
    })
  },
  async exportAll() {
    const [projects, tasks, people, logs, settings] = await Promise.all([
      this.getAll('projects'),
      this.getAll('tasks'),
      this.getAll('people'),
      this.getAll('logs'),
      this.getAll('settings'),
    ])
    return buildBackupPayload({
      projects: projects as BackupPayload['projects'],
      tasks: tasks as BackupPayload['tasks'],
      people: people as BackupPayload['people'],
      logs: logs as BackupPayload['logs'],
      settings: settings as BackupPayload['settings'],
    })
  },
  async importAll(data: unknown) {
    const backup = normalizeImportedBackup(data)
    const names = ['projects', 'tasks', 'people', 'logs', 'settings']
    await this.runTransaction(names, 'readwrite', (stores) => {
      for (const name of names) stores[name].clear()
      for (const project of backup.projects) stores.projects.put(project)
      for (const task of backup.tasks) stores.tasks.put(task)
      for (const person of backup.people) stores.people.put(person)
      for (const log of backup.logs) stores.logs.put(log)
      for (const setting of backup.settings) stores.settings.put(setting)
    })
  },
}

/**
 * IndexedDB wrapper – promise-based, single source of truth.
 */

const DB_NAME = 'studio118db';
const DB_VERSION = 1;

let _db = null;

export async function openDB() {
  if (_db) return _db;
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = e.target.result;

      // Projects
      if (!db.objectStoreNames.contains('projects')) {
        const s = db.createObjectStore('projects', { keyPath: 'id' });
        s.createIndex('status', 'status', { unique: false });
        s.createIndex('ddl', 'ddl', { unique: false });
      }
      // Tasks
      if (!db.objectStoreNames.contains('tasks')) {
        const s = db.createObjectStore('tasks', { keyPath: 'id' });
        s.createIndex('projectId', 'projectId', { unique: false });
        s.createIndex('assigneeId', 'assigneeId', { unique: false });
        s.createIndex('status', 'status', { unique: false });
        s.createIndex('scheduledDate', 'scheduledDate', { unique: false });
      }
      // People
      if (!db.objectStoreNames.contains('people')) {
        const s = db.createObjectStore('people', { keyPath: 'id' });
        s.createIndex('status', 'status', { unique: false });
      }
      // Logs
      if (!db.objectStoreNames.contains('logs')) {
        const s = db.createObjectStore('logs', { keyPath: 'id' });
        s.createIndex('ts', 'ts', { unique: false });
      }
      // Settings
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    };

    req.onsuccess = (e) => { _db = e.target.result; resolve(_db); };
    req.onerror  = ()  => reject(req.error);
  });
}

function store(name, mode = 'readonly') {
  return _db.transaction(name, mode).objectStore(name);
}

function p(req) {
  return new Promise((res, rej) => {
    req.onsuccess = () => res(req.result);
    req.onerror   = () => rej(req.error);
  });
}

export const db = {
  getAll:   (name)     => p(store(name).getAll()),
  get:      (name, id) => p(store(name).get(id)),
  put:      (name, obj)=> p(store(name, 'readwrite').put(obj)),
  delete:   (name, id) => p(store(name, 'readwrite').delete(id)),
  clear:    (name)     => p(store(name, 'readwrite').clear()),

  getAllByIndex(name, idx, val) {
    return p(store(name).index(idx).getAll(val));
  },

  async clearAll() {
    for (const name of ['projects','tasks','people','logs']) {
      await this.clear(name);
    }
  },

  async exportAll() {
    const [projects, tasks, people] = await Promise.all([
      this.getAll('projects'),
      this.getAll('tasks'),
      this.getAll('people'),
    ]);
    return { projects, tasks, people, exportedAt: new Date().toISOString() };
  },

  async importAll(data) {
    await this.clearAll();
    for (const p of (data.projects || [])) await this.put('projects', p);
    for (const t of (data.tasks    || [])) await this.put('tasks', t);
    for (const m of (data.people   || [])) await this.put('people', m);
  },
};

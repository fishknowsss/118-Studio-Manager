import { db } from './db'

export const PROJECT_STATUSES = ['active', 'paused', 'completed', 'cancelled'] as const
export const PROJECT_PRIORITIES = ['urgent', 'high', 'medium', 'low'] as const
export const TASK_STATUSES = ['todo', 'in-progress', 'done', 'blocked'] as const
export const PERSON_STATUSES = ['active', 'inactive'] as const
export const PERSON_GENDERS = ['male', 'female', 'other'] as const

export type ProjectStatus = (typeof PROJECT_STATUSES)[number]
export type ProjectPriority = (typeof PROJECT_PRIORITIES)[number]
export type TaskStatus = (typeof TASK_STATUSES)[number]
export type TaskPriority = ProjectPriority
export type PersonStatus = (typeof PERSON_STATUSES)[number]
export type PersonGender = (typeof PERSON_GENDERS)[number]

export type LegacyEntity = {
  id: string
  createdAt?: string
  updatedAt?: string
}

export type LegacyMilestone = {
  id: string
  title?: string
  date?: string | null
  completed?: boolean
}

export type LegacyProject = LegacyEntity & {
  name?: string
  status?: ProjectStatus
  priority?: ProjectPriority
  ddl?: string | null
  description?: string
  milestones?: LegacyMilestone[]
}

export type LegacyTask = LegacyEntity & {
  title?: string
  projectId?: string | null
  status?: TaskStatus
  priority?: TaskPriority
  assigneeId?: string | null
  scheduledDate?: string | null
  startDate?: string | null
  endDate?: string | null
  estimatedHours?: number | null
  description?: string
}

export type LegacyPerson = LegacyEntity & {
  name?: string
  gender?: PersonGender | ''
  status?: PersonStatus
  skills?: string[]
  notes?: string
}

export type LegacyLog = {
  id: string
  text: string
  ts: string
}

const listeners: Set<() => void> = new Set()

function emitStoreUpdated(detail: Record<string, unknown> = {}) {
  store.version++
  document.dispatchEvent(new CustomEvent('storeUpdated', { detail }))
  listeners.forEach(l => l())
}

export const store = {
  projects: [] as LegacyProject[],
  tasks: [] as LegacyTask[],
  people: [] as LegacyPerson[],
  logs: [] as LegacyLog[],
  version: 0,

  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },

  getSnapshot() {
    return this.version
  },

  async loadAll() {
    ;[this.projects, this.tasks, this.people, this.logs] = await Promise.all([
      db.getAll('projects') as Promise<LegacyProject[]>,
      db.getAll('tasks') as Promise<LegacyTask[]>,
      db.getAll('people') as Promise<LegacyPerson[]>,
      db.getAll('logs') as Promise<LegacyLog[]>,
    ])
    emitStoreUpdated()
  },

  async saveProject(project: LegacyProject) {
    await db.put('projects', project)
    const index = this.projects.findIndex(item => item.id === project.id)
    if (index >= 0) this.projects = this.projects.map(p => p.id === project.id ? project : p)
    else this.projects = [...this.projects, project]
    emitStoreUpdated({ type: 'project', action: 'save', id: project.id })
  },

  async deleteProject(id: string) {
    const relatedIds = this.tasks.filter(task => task.projectId === id).map(task => task.id)
    await db.runTransaction(['projects', 'tasks'], 'readwrite', (stores) => {
      stores.projects.delete(id)
      for (const taskId of relatedIds) stores.tasks.delete(taskId)
    })
    this.tasks = this.tasks.filter(task => task.projectId !== id)
    this.projects = this.projects.filter(project => project.id !== id)
    emitStoreUpdated({ type: 'project', action: 'delete', id })
  },

  getProject(id: string) {
    return this.projects.find(project => project.id === id)
  },

  async saveTask(task: LegacyTask) {
    await db.put('tasks', task)
    const index = this.tasks.findIndex(item => item.id === task.id)
    if (index >= 0) this.tasks = this.tasks.map(t => t.id === task.id ? task : t)
    else this.tasks = [...this.tasks, task]
    emitStoreUpdated({ type: 'task', action: 'save', id: task.id })
  },

  async deleteTask(id: string) {
    await db.delete('tasks', id)
    this.tasks = this.tasks.filter(task => task.id !== id)
    emitStoreUpdated({ type: 'task', action: 'delete', id })
  },

  getTask(id: string) {
    return this.tasks.find(task => task.id === id)
  },

  tasksForProject(projectId: string) {
    return this.tasks.filter(task => task.projectId === projectId)
  },

  tasksForDate(dateStr: string) {
    return this.tasks.filter(task => task.scheduledDate === dateStr)
  },

  tasksForPerson(personId: string) {
    return this.tasks.filter(task => task.assigneeId === personId && task.status !== 'done')
  },

  async savePerson(person: LegacyPerson) {
    await db.put('people', person)
    const index = this.people.findIndex(item => item.id === person.id)
    if (index >= 0) this.people = this.people.map(p => p.id === person.id ? person : p)
    else this.people = [...this.people, person]
    emitStoreUpdated({ type: 'person', action: 'save', id: person.id })
  },

  async deletePerson(id: string) {
    const updatedTasks = this.tasks
      .filter(item => item.assigneeId === id)
      .map(t => ({ ...t, assigneeId: null as string | null }))
    await db.runTransaction(['people', 'tasks'], 'readwrite', (stores) => {
      stores.people.delete(id)
      for (const task of updatedTasks) stores.tasks.put(task)
    })
    this.tasks = this.tasks.map(t => t.assigneeId === id ? { ...t, assigneeId: null } : t)
    this.people = this.people.filter(person => person.id !== id)
    emitStoreUpdated({ type: 'person', action: 'delete', id })
  },

  getPerson(id: string) {
    return this.people.find(person => person.id === id)
  },

  activePeople() {
    return this.people.filter(person => person.status === 'active')
  },

  async addLog(text: string) {
    const log = { id: crypto.randomUUID(), text, ts: new Date().toISOString() }
    await db.put('logs', log)
    let newLogs = [log, ...this.logs]
    if (newLogs.length > 50) {
      const removed = newLogs.slice(50)
      newLogs = newLogs.slice(0, 50)
      for (const entry of removed) await db.delete('logs', entry.id)
    }
    this.logs = newLogs
    emitStoreUpdated()
  },
}

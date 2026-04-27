import { db } from './db'
import { now } from './utils'

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

export type LegacyProject = LegacyEntity & {
  name?: string
  status?: ProjectStatus
  priority?: ProjectPriority
  ddl?: string | null
  description?: string
}

export type LegacyTask = LegacyEntity & {
  title?: string
  projectId?: string | null
  status?: TaskStatus
  priority?: TaskPriority
  /** @deprecated use assigneeIds */
  assigneeId?: string | null
  assigneeIds?: string[]
  scheduledDate?: string | null
  startDate?: string | null
  endDate?: string | null
  estimatedHours?: number | null
  description?: string
}

/** 读取任务负责人列表，兼容旧字段 assigneeId */
export function getTaskAssigneeIds(task: LegacyTask): string[] {
  if (task.assigneeIds && task.assigneeIds.length > 0) return task.assigneeIds
  if (task.assigneeId) return [task.assigneeId]
  return []
}

export function syncTaskStatusWithAssignees(
  previousTask: LegacyTask | null,
  nextTask: LegacyTask,
  hasExplicitStatusChange = false,
): LegacyTask {
  if (hasExplicitStatusChange) return nextTask

  const previousAssigneeCount = previousTask ? getTaskAssigneeIds(previousTask).length : 0
  const nextAssigneeCount = getTaskAssigneeIds(nextTask).length

  if (previousAssigneeCount === 0 && nextAssigneeCount > 0) {
    return { ...nextTask, status: 'in-progress' }
  }

  if (previousAssigneeCount > 0 && nextAssigneeCount === 0) {
    return { ...nextTask, status: 'todo' }
  }

  return nextTask
}

export type LegacyPerson = LegacyEntity & {
  name?: string
  className?: string
  studentNo?: string
  email?: string
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

export type LeaveRecord = {
  id: string
  personId: string
  date: string   // 'YYYY-MM-DD'
  reason?: string
}

export type ClassScheduleEntry = LegacyEntity & {
  personId: string
  personName: string
  studentNo?: string
  className?: string
  courseName: string
  dayOfWeek: number
  startSection: number
  endSection: number
  weeksText: string
  location?: string
  teacher?: string
  sourceFileName?: string
}

export function buildPersonDeletionPatch(
  personId: string,
  tasks: LegacyTask[],
  leaveRecords: LeaveRecord[],
  classSchedules: ClassScheduleEntry[],
) {
  const updatedTasks: LegacyTask[] = []
  const nextTasks = tasks.map((task) => {
    const ids = getTaskAssigneeIds(task)
    if (!ids.includes(personId)) return task
    const updated = syncTaskStatusWithAssignees(task, {
      ...task,
      assigneeIds: ids.filter((assigneeId) => assigneeId !== personId),
      updatedAt: now(),
    })
    updatedTasks.push(updated)
    return updated
  })
  const leaveRecordIds = leaveRecords
    .filter((record) => record.personId === personId)
    .map((record) => record.id)
  const classScheduleIds = classSchedules
    .filter((entry) => entry.personId === personId)
    .map((entry) => entry.id)

  return {
    classScheduleIds,
    leaveRecordIds,
    nextTasks,
    updatedTasks,
  }
}

type ProjectRecord = LegacyProject & Record<string, unknown>

const PROJECT_RECORD_KEYS = new Set(['createdAt', 'ddl', 'description', 'id', 'name', 'priority', 'status', 'updatedAt'])

function projectNeedsNormalization(project: ProjectRecord) {
  return Object.keys(project).some((key) => !PROJECT_RECORD_KEYS.has(key))
}

function sanitizeProjectRecord(project: ProjectRecord): LegacyProject {
  return Object.fromEntries(
    Object.entries(project).filter(([key]) => PROJECT_RECORD_KEYS.has(key)),
  ) as LegacyProject
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
  leaveRecords: [] as LeaveRecord[],
  classSchedules: [] as ClassScheduleEntry[],
  version: 0,

  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },

  getSnapshot() {
    return this.version
  },

  async loadAll() {
    const [rawProjects, rawTasks, people, logs, leaveRecords, classSchedules] = await Promise.all([
      db.getAll('projects') as Promise<ProjectRecord[]>,
      db.getAll('tasks') as Promise<LegacyTask[]>,
      db.getAll('people') as Promise<LegacyPerson[]>,
      db.getAll('logs') as Promise<LegacyLog[]>,
      db.getAll('leaveRecords') as Promise<LeaveRecord[]>,
      db.getAll('classSchedules') as Promise<ClassScheduleEntry[]>,
    ])
    const projects = rawProjects.map((project) => sanitizeProjectRecord(project))
    const projectsNeedCleanup = rawProjects.some((project) => projectNeedsNormalization(project))
    if (projectsNeedCleanup) {
      await Promise.all(rawProjects.map((project, index) => {
        if (!projectNeedsNormalization(project)) return Promise.resolve(undefined)
        return db.put('projects', projects[index])
      }))
    }
    // 迁移旧字段：assigneeId → assigneeIds
    this.projects = projects
    this.tasks = rawTasks.map((t) =>
      t.assigneeIds ? t : { ...t, assigneeIds: t.assigneeId ? [t.assigneeId] : [] },
    )
    this.people = people
    this.logs = logs
    this.leaveRecords = leaveRecords
    this.classSchedules = classSchedules
    emitStoreUpdated()
  },

  async saveProject(project: LegacyProject) {
    const sanitizedProject = sanitizeProjectRecord(project as ProjectRecord)
    await db.put('projects', sanitizedProject)
    const index = this.projects.findIndex(item => item.id === sanitizedProject.id)
    if (index >= 0) {
      const next = [...this.projects]
      next[index] = sanitizedProject
      this.projects = next
    } else {
      this.projects = [...this.projects, sanitizedProject]
    }
    emitStoreUpdated({ type: 'project', action: 'save', id: sanitizedProject.id })
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
    if (index >= 0) {
      const next = [...this.tasks]
      next[index] = task
      this.tasks = next
    } else {
      this.tasks = [...this.tasks, task]
    }
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
    return this.tasks.filter(task => getTaskAssigneeIds(task).includes(personId) && task.status !== 'done')
  },

  async savePerson(person: LegacyPerson) {
    await db.put('people', person)
    const index = this.people.findIndex(item => item.id === person.id)
    if (index >= 0) {
      const next = [...this.people]
      next[index] = person
      this.people = next
    } else {
      this.people = [...this.people, person]
    }
    emitStoreUpdated({ type: 'person', action: 'save', id: person.id })
  },

  async deletePerson(id: string) {
    const patch = buildPersonDeletionPatch(id, this.tasks, this.leaveRecords, this.classSchedules)
    await db.runTransaction(['people', 'tasks', 'leaveRecords', 'classSchedules'], 'readwrite', (stores) => {
      stores.people.delete(id)
      for (const task of patch.updatedTasks) stores.tasks.put(task)
      for (const leaveId of patch.leaveRecordIds) stores.leaveRecords.delete(leaveId)
      for (const scheduleId of patch.classScheduleIds) stores.classSchedules.delete(scheduleId)
    })
    this.tasks = patch.nextTasks
    this.people = this.people.filter(person => person.id !== id)
    this.leaveRecords = this.leaveRecords.filter((record) => record.personId !== id)
    this.classSchedules = this.classSchedules.filter((entry) => entry.personId !== id)
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

  async saveLeaveRecord(record: LeaveRecord) {
    await db.put('leaveRecords', record)
    const index = this.leaveRecords.findIndex((r) => r.id === record.id)
    if (index >= 0) {
      const next = [...this.leaveRecords]
      next[index] = record
      this.leaveRecords = next
    } else {
      this.leaveRecords = [...this.leaveRecords, record]
    }
    emitStoreUpdated({ type: 'leaveRecord', action: 'save', id: record.id })
  },

  async deleteLeaveRecord(id: string) {
    await db.delete('leaveRecords', id)
    this.leaveRecords = this.leaveRecords.filter((r) => r.id !== id)
    emitStoreUpdated({ type: 'leaveRecord', action: 'delete', id })
  },

  leaveRecordsForDate(date: string) {
    return this.leaveRecords.filter((r) => r.date === date)
  },

  async replaceClassSchedulesForPerson(personId: string, entries: ClassScheduleEntry[]) {
    const staleIds = this.classSchedules
      .filter((entry) => entry.personId === personId)
      .map((entry) => entry.id)

    await db.runTransaction(['classSchedules'], 'readwrite', (stores) => {
      for (const id of staleIds) stores.classSchedules.delete(id)
      for (const entry of entries) stores.classSchedules.put(entry)
    })

    this.classSchedules = [
      ...this.classSchedules.filter((entry) => entry.personId !== personId),
      ...entries,
    ]
    emitStoreUpdated({ type: 'classSchedule', action: 'replace', id: personId })
  },

  async saveClassScheduleEntry(entry: ClassScheduleEntry) {
    await db.put('classSchedules', entry)
    const index = this.classSchedules.findIndex((item) => item.id === entry.id)
    if (index >= 0) {
      const next = [...this.classSchedules]
      next[index] = entry
      this.classSchedules = next
    } else {
      this.classSchedules = [...this.classSchedules, entry]
    }
    emitStoreUpdated({ type: 'classSchedule', action: 'save', id: entry.id })
  },

  async deleteClassSchedule(id: string) {
    await db.delete('classSchedules', id)
    this.classSchedules = this.classSchedules.filter((entry) => entry.id !== id)
    emitStoreUpdated({ type: 'classSchedule', action: 'delete', id })
  },

  async deleteClassSchedulesForPerson(personId: string) {
    const staleIds = this.classSchedules
      .filter((entry) => entry.personId === personId)
      .map((entry) => entry.id)

    await db.runTransaction(['classSchedules'], 'readwrite', (stores) => {
      for (const id of staleIds) stores.classSchedules.delete(id)
    })

    this.classSchedules = this.classSchedules.filter((entry) => entry.personId !== personId)
    emitStoreUpdated({ type: 'classSchedule', action: 'delete-person', id: personId })
  },
}

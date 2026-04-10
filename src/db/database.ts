import Dexie, { type Table } from 'dexie'
import type { Project } from '../types/project'
import type { Person } from '../types/person'
import type { Task } from '../types/task'
import type { Milestone } from '../types/milestone'
import type { Assignment } from '../types/assignment'
import type { Log } from '../types/log'
import type { Setting } from '../types/setting'

export class StudioManagerDB extends Dexie {
  projects!: Table<Project, string>
  people!: Table<Person, string>
  tasks!: Table<Task, string>
  milestones!: Table<Milestone, string>
  assignments!: Table<Assignment, string>
  logs!: Table<Log, string>
  settings!: Table<Setting, string>

  constructor() {
    super('studio_manager_db')

    this.version(1).stores({
      projects: 'id, name, status, priority, deadline, createdAt',
      people: 'id, name, isActive, createdAt',
      tasks: 'id, projectId, status, priority, dueDate, createdAt',
      milestones: 'id, projectId, date, createdAt',
      assignments: 'id, taskId, personId, date, projectId, createdAt',
      logs: 'id, type, targetType, targetId, createdAt',
      settings: 'id',
    })

    this.version(2).stores({
      projects: 'id, name, status, priority, deadline, createdAt',
      people: 'id, name, isActive, createdAt',
      tasks: 'id, projectId, status, priority, dueDate, createdAt',
      milestones: 'id, projectId, date, createdAt',
      assignments: 'id, taskId, personId, date, projectId, createdAt, [date+taskId], [date+personId+taskId]',
      logs: 'id, type, targetType, targetId, createdAt',
      settings: 'id',
    })

    this.version(3).stores({
      projects: 'id, name, status, priority, deadline, createdAt',
      people: 'id, name, gender, isActive, createdAt',
      tasks: 'id, projectId, status, priority, dueDate, createdAt',
      milestones: 'id, projectId, date, createdAt',
      assignments: 'id, taskId, personId, date, projectId, createdAt, [date+taskId], [date+personId+taskId]',
      logs: 'id, type, targetType, targetId, createdAt',
      settings: 'id',
    }).upgrade(async tx => {
      await tx.table('people').toCollection().modify(person => {
        if (!person.gender) {
          person.gender = 'unspecified'
        }
      })
    })
  }
}

export const db = new StudioManagerDB()

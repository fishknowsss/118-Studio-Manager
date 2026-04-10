import { db } from '../db/database'
import { now, today } from '../utils/date'
import { validateBackupData } from '../utils/validation'
import { addLog } from './logService'
import type { Project } from '../types/project'
import type { Person } from '../types/person'
import type { Task } from '../types/task'
import type { Milestone } from '../types/milestone'
import type { Assignment } from '../types/assignment'
import type { Log } from '../types/log'
import type { Setting } from '../types/setting'

const APP_VERSION = '2.0.0'
const SCHEMA_VERSION = 2

function normalizePersonRecord(person: Record<string, unknown>): Person {
  return {
    id: String(person.id ?? ''),
    name: typeof person.name === 'string' ? person.name : '',
    role: typeof person.role === 'string' ? person.role : '',
    gender: person.gender === 'male' || person.gender === 'female' ? person.gender : 'unspecified',
    skills: Array.isArray(person.skills) ? person.skills.filter((skill): skill is string => typeof skill === 'string') : [],
    note: typeof person.note === 'string' ? person.note : '',
    isActive: typeof person.isActive === 'boolean' ? person.isActive : true,
    createdAt: typeof person.createdAt === 'string' ? person.createdAt : now(),
    updatedAt: typeof person.updatedAt === 'string' ? person.updatedAt : now(),
  }
}

function normalizeSettingRecord(setting: Record<string, unknown>): Setting {
  return {
    id: String(setting.id ?? 'default'),
    studioName: typeof setting.studioName === 'string' && setting.studioName.trim()
      ? setting.studioName
      : '118StudioManager',
    defaultView: 'dashboard',
    lastOpenedDate: typeof setting.lastOpenedDate === 'string' && setting.lastOpenedDate
      ? setting.lastOpenedDate
      : today(),
    lastBackupAt: typeof setting.lastBackupAt === 'string' ? setting.lastBackupAt : '',
    backupReminderDays: typeof setting.backupReminderDays === 'number' ? setting.backupReminderDays : 7,
    createdAt: typeof setting.createdAt === 'string' ? setting.createdAt : now(),
    updatedAt: typeof setting.updatedAt === 'string' ? setting.updatedAt : now(),
  }
}

export async function exportFullJSON(): Promise<string> {
  const [projects, people, tasks, milestones, assignments, logs, settings] = await Promise.all([
    db.projects.toArray(),
    db.people.toArray(),
    db.tasks.toArray(),
    db.milestones.toArray(),
    db.assignments.toArray(),
    db.logs.toArray(),
    db.settings.toArray(),
  ])

  const backup = {
    appVersion: APP_VERSION,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: now(),
    data: { projects, people, tasks, milestones, assignments, logs, settings },
  }

  await addLog('export', 'system', '', '导出完整 JSON 备份')

  return JSON.stringify(backup, null, 2)
}

export interface ImportSummary {
  projects: number
  people: number
  tasks: number
  milestones: number
  assignments: number
  logs: number
  settings: number
}

export async function parseImportFile(jsonStr: string): Promise<{ summary: ImportSummary; rawData: string } | { error: string }> {
  let parsed: unknown
  try {
    parsed = JSON.parse(jsonStr)
  } catch {
    return { error: 'JSON 格式无效，无法解析' }
  }

  const result = validateBackupData(parsed)
  if (!result.valid || !result.data) {
    return { error: result.error || '数据校验失败' }
  }

  const d = result.data.data
  return {
    summary: {
      projects: d.projects.length,
      people: d.people.length,
      tasks: d.tasks.length,
      milestones: d.milestones.length,
      assignments: d.assignments.length,
      logs: d.logs.length,
      settings: d.settings.length,
    },
    rawData: jsonStr,
  }
}

export async function importFullJSON(jsonStr: string): Promise<void> {
  const parsed = JSON.parse(jsonStr)
  const result = validateBackupData(parsed)
  if (!result.valid || !result.data) {
    throw new Error(result.error || '数据校验失败')
  }

  const d = result.data.data
  const people = d.people.map(person => normalizePersonRecord(person as Record<string, unknown>))
  const settings = d.settings.length > 0
    ? d.settings.map(setting => normalizeSettingRecord(setting as Record<string, unknown>))
    : [normalizeSettingRecord({ id: 'default' })]

  await db.transaction('rw', [db.projects, db.people, db.tasks, db.milestones, db.assignments, db.logs, db.settings], async () => {
    await db.projects.clear()
    await db.people.clear()
    await db.tasks.clear()
    await db.milestones.clear()
    await db.assignments.clear()
    await db.logs.clear()
    await db.settings.clear()

    await db.projects.bulkAdd(d.projects as Project[])
    await db.people.bulkAdd(people)
    await db.tasks.bulkAdd(d.tasks as Task[])
    await db.milestones.bulkAdd(d.milestones as Milestone[])
    await db.assignments.bulkAdd(d.assignments as Assignment[])
    await db.logs.bulkAdd(d.logs as Log[])
    await db.settings.bulkAdd(settings)
  })

  await addLog('import', 'system', '', '从 JSON 备份恢复数据')
}

export function downloadJSON(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'application/json;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

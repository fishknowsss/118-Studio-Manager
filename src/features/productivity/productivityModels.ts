import type { ClassScheduleEntry, LegacyPerson, LegacyTask } from '../../legacy/store'
import { getTaskAssigneeIds } from '../../legacy/store'
import { parseLocalDateKey } from '../../legacy/utils'

export type ProductivityPersonModel = {
  id: string
  name: string
  className: string
  studentNo: string
  email: string
  skills: string[]
  notes: string
  openTaskCount: number
  urgentTaskCount: number
  loadScore: number
  loadLabel: string
  loadTone: 'calm' | 'steady' | 'busy' | 'tight'
}

export type ScheduleOwnerSummary = {
  personId: string
  personName: string
  className: string
  studentNo: string
  courseCount: number
  entryCount: number
  sourceFileNames: string[]
  updatedAt: string
}

function daysFromReference(dateStr: string | null | undefined, referenceDate: string) {
  if (!dateStr) return null
  const target = parseLocalDateKey(dateStr)
  const reference = parseLocalDateKey(referenceDate)
  if (!target || !reference) return null
  return Math.round((target.getTime() - reference.getTime()) / 86400000)
}

function getTaskLoadWeight(task: LegacyTask, referenceDate: string) {
  if (task.status === 'done') return 0

  const daysLeft = daysFromReference(task.endDate || task.scheduledDate || null, referenceDate)
  const priorityWeight = task.priority === 'urgent' ? 2.4 : task.priority === 'high' ? 1.8 : task.priority === 'medium' ? 1.2 : 0.8
  const urgencyWeight = daysLeft === null
    ? 0.4
    : daysLeft < 0
      ? 3
      : daysLeft === 0
        ? 2.4
        : daysLeft <= 3
          ? 1.8
          : daysLeft <= 7
            ? 1.2
            : 0.4
  const effortWeight = Math.min(Math.max(Number(task.estimatedHours) || 0, 0), 16) / 8

  return priorityWeight + urgencyWeight + effortWeight
}

function getLoadTone(loadScore: number) {
  if (loadScore >= 12) return 'tight'
  if (loadScore >= 8) return 'busy'
  if (loadScore >= 4) return 'steady'
  return 'calm'
}

function getLoadLabel(tone: ProductivityPersonModel['loadTone']) {
  if (tone === 'tight') return '高压'
  if (tone === 'busy') return '偏满'
  if (tone === 'steady') return '正常'
  return '空闲'
}

export function buildProductivityPersonModels(
  people: LegacyPerson[],
  tasks: LegacyTask[],
  referenceDate: string,
) {
  return people
    .filter((person) => person.status !== 'inactive')
    .map((person) => {
      const assignedTasks = tasks.filter((task) => getTaskAssigneeIds(task).includes(person.id) && task.status !== 'done')
      const loadScore = assignedTasks.reduce((sum, task) => sum + getTaskLoadWeight(task, referenceDate), 0)
      const urgentTaskCount = assignedTasks.filter((task) => {
        const daysLeft = daysFromReference(task.endDate || task.scheduledDate || null, referenceDate)
        return task.priority === 'urgent' || (daysLeft !== null && daysLeft <= 3)
      }).length
      const loadTone = getLoadTone(loadScore)

      return {
        id: person.id,
        name: person.name || '未命名成员',
        className: person.className || '未填班级',
        studentNo: person.studentNo || '未填学号',
        email: person.email || '未填邮箱',
        skills: person.skills || [],
        notes: person.notes || '',
        openTaskCount: assignedTasks.length,
        urgentTaskCount,
        loadScore: Math.round(loadScore * 10) / 10,
        loadLabel: getLoadLabel(loadTone),
        loadTone,
      } satisfies ProductivityPersonModel
    })
    .sort((left, right) => {
      if (right.loadScore !== left.loadScore) return right.loadScore - left.loadScore
      return left.name.localeCompare(right.name, 'zh-CN')
    })
}

export function buildScheduleOwnerSummaries(
  people: LegacyPerson[],
  schedules: ClassScheduleEntry[],
) {
  const peopleById = new Map(people.map((person) => [person.id, person]))
  const groups = new Map<string, ClassScheduleEntry[]>()

  for (const entry of schedules) {
    groups.set(entry.personId, [...(groups.get(entry.personId) || []), entry])
  }

  return Array.from(groups.entries())
    .map(([personId, entries]) => {
      const person = peopleById.get(personId)
      const courseNames = new Set(entries.map((entry) => entry.courseName).filter(Boolean))
      const sourceFileNames = Array.from(new Set(entries.map((entry) => entry.sourceFileName || '').filter(Boolean)))
      const updatedAt = entries
        .map((entry) => entry.updatedAt || entry.createdAt || '')
        .filter(Boolean)
        .sort()
        .at(-1) || ''

      return {
        personId,
        personName: person?.name || entries[0]?.personName || '未知成员',
        className: person?.className || entries[0]?.className || '',
        studentNo: person?.studentNo || entries[0]?.studentNo || '',
        courseCount: courseNames.size,
        entryCount: entries.length,
        sourceFileNames,
        updatedAt,
      } satisfies ScheduleOwnerSummary
    })
    .sort((left, right) =>
      right.entryCount - left.entryCount ||
      left.personName.localeCompare(right.personName, 'zh-CN'),
    )
}

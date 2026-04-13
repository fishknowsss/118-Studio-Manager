import {
  coerceToLocalDateKey,
  daysUntil,
  ddlLabel,
  getCalendarDays,
  initials,
  now,
  parseLocalDateKey,
  PRIORITY_LABELS,
  STATUS_LABELS,
  shiftLocalDateKey,
  sortByUrgency,
  urgencyClass,
} from './utils'
import type { BackupPayload } from './utils'
import type { LegacyLog, LegacyMilestone, LegacyPerson, LegacyProject, LegacyTask } from './store'
import { getTaskAssigneeIds } from './store'

type EntityMaps = {
  openTaskCountByPersonId: Record<string, number>
  peopleById: Record<string, LegacyPerson>
  projectsById: Record<string, LegacyProject>
  tasksByProjectId: Record<string, LegacyTask[]>
}

type TaskFilters = {
  assigneeFilter?: string
  projFilter?: string
  search?: string
  statusFilter?: string
}

type BackupSummary = {
  logCount: number
  personCount: number
  projectCount: number
  settingsCount: number
  taskCount: number
}

type RecentLogItem = {
  date: string
  id: string
  text: string
  time: string
}

type TimelineDay = {
  day: number
  isMonthStart: boolean
  isWeekend: boolean
  key: string
  monthLabel: string | null
}

type TimelineRow = {
  durationDays: number
  endDate: string
  id: string
  name: string
  offsetDays: number
  startDate: string
}

type TimelineModel = {
  days: TimelineDay[]
  rows: TimelineRow[]
  startDate: string
}

export type DashboardHeaderModel = {
  dateText: string
  weekdayText: string
}

export type DashboardMiniCalendarDay = {
  dateKey: string
  dayOfMonth: number
  hasEvents: boolean
  hasUrgent: boolean
  isOtherMonth: boolean
  isToday: boolean
}

export type DashboardMiniCalendarModel = {
  days: DashboardMiniCalendarDay[]
  title: string
  weekdays: string[]
}

export type DashboardFocusCard = {
  ddlLabel: string
  id: string
  name: string
  nextMilestone?: LegacyMilestone
  openTaskCount: number
  urgencyKey: string
}

export type ProjectEventSummary = {
  ddls: string[]
  hasDdl: boolean
  hasMs: boolean
  milestones: string[]
  urgent: boolean
}

export type ProjectCardMilestone = {
  completed: boolean
  dateText: string
  id: string
  title: string
}

export type ProjectCardModel = {
  ddlText: string
  description: string
  doneCount: number
  id: string
  milestones: ProjectCardMilestone[]
  name: string
  priorityKey: string
  priorityLabel: string
  statusKey: string
  statusLabel: string
  taskCount: number
  urgencyKey: string
}

export type TaskListItemModel = {
  assigneeNames: string[]
  dateText: string
  estimatedHoursText: string
  id: string
  isDone: boolean
  isOverdue: boolean
  priorityKey: string
  priorityLabel: string
  projectName: string
  statusKey: string
  statusLabel: string
  title: string
}

export type PersonCardModel = {
  avatarText: string
  genderLabel: string
  id: string
  isInactive: boolean
  name: string
  notePreview: string
  skills: string[]
  statusKey: string
  statusLabel: string
  taskCount: number
}

const PRIORITY_ORDER: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 }
const DASHBOARD_WEEKDAY_LABELS = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
const DASHBOARD_MONTH_LABELS = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']
const MINI_CALENDAR_WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

function formatSlashDate(dateStr: string | null | undefined) {
  if (!dateStr) return ''
  const [year, month, day] = dateStr.split('-')
  return `${year}/${parseInt(month, 10)}/${parseInt(day, 10)}`
}

export function buildEntityMaps(
  projects: LegacyProject[],
  tasks: LegacyTask[],
  people: LegacyPerson[],
): EntityMaps {
  const projectsById: Record<string, LegacyProject> = {}
  const peopleById: Record<string, LegacyPerson> = {}
  const tasksByProjectId: Record<string, LegacyTask[]> = {}
  const openTaskCountByPersonId: Record<string, number> = {}

  for (const project of projects) {
    projectsById[project.id] = project
  }

  for (const person of people) {
    peopleById[person.id] = person
  }

  for (const task of tasks) {
    if (task.projectId) {
      tasksByProjectId[task.projectId] ||= []
      tasksByProjectId[task.projectId].push(task)
    }
    if (task.status !== 'done') {
      for (const pid of getTaskAssigneeIds(task)) {
        openTaskCountByPersonId[pid] = (openTaskCountByPersonId[pid] || 0) + 1
      }
    }
  }

  return { projectsById, peopleById, tasksByProjectId, openTaskCountByPersonId }
}

export function getActivePeople(people: LegacyPerson[]) {
  return people.filter((person) => person.status === 'active')
}

export function getActiveProjects(projects: LegacyProject[]) {
  return projects.filter((project) => project.status !== 'cancelled' && project.status !== 'completed')
}

export function getTopProjects(projects: LegacyProject[], limit = 8) {
  return sortByUrgency(getActiveProjects(projects)).slice(0, limit)
}

const POOL_STATUS_ORDER: Record<string, number> = { blocked: 0, 'in-progress': 1, todo: 2, done: 3 }

export function getTaskPool(tasks: LegacyTask[]) {
  return [...tasks]
    .sort((a, b) => {
      const statusGap = (POOL_STATUS_ORDER[a.status || 'todo'] ?? 2) - (POOL_STATUS_ORDER[b.status || 'todo'] ?? 2)
      if (statusGap !== 0) return statusGap
      const priorityGap = (PRIORITY_ORDER[a.priority || 'medium'] ?? 2) - (PRIORITY_ORDER[b.priority || 'medium'] ?? 2)
      if (priorityGap !== 0) return priorityGap
      return (a.endDate || '9999').localeCompare(b.endDate || '9999')
    })
    .slice(0, 20)
}

export function buildDashboardHeaderModel(
  currentDate: Date,
): DashboardHeaderModel {
  return {
    dateText: `${currentDate.getMonth() + 1}月${currentDate.getDate()}日`,
    weekdayText: `${currentDate.getFullYear()} · ${DASHBOARD_WEEKDAY_LABELS[currentDate.getDay()]}`,
  }
}

export function buildDashboardMiniCalendarModel(
  currentMonth: Date,
  eventMap: Record<string, ProjectEventSummary>,
  todayStr: string,
): DashboardMiniCalendarModel {
  const days = getCalendarDays(currentMonth.getFullYear(), currentMonth.getMonth()).map(({ date, otherMonth }) => {
    const dateKey = coerceToLocalDateKey(date) || shiftLocalDateKey(date, 0)
    const eventSummary = eventMap[dateKey]

    return {
      dateKey,
      dayOfMonth: date.getDate(),
      hasEvents: Boolean(eventSummary?.hasDdl || eventSummary?.hasMs),
      hasUrgent: Boolean(eventSummary?.urgent),
      isOtherMonth: otherMonth,
      isToday: dateKey === todayStr,
    } satisfies DashboardMiniCalendarDay
  })

  return {
    days,
    title: `${currentMonth.getFullYear()} · ${DASHBOARD_MONTH_LABELS[currentMonth.getMonth()]}`,
    weekdays: MINI_CALENDAR_WEEKDAYS,
  }
}

export function getProjectEventMap(projects: LegacyProject[]) {
  const summaryMap = buildProjectEventSummaryMap(projects)

  return Object.fromEntries(
    Object.entries(summaryMap).map(([key, value]) => [key, {
      hasDdl: value.hasDdl,
      hasMs: value.hasMs,
      urgent: value.urgent,
    }]),
  )
}

export function buildCalendarEventMap(projects: LegacyProject[]) {
  const summaryMap = buildProjectEventSummaryMap(projects)

  return Object.fromEntries(
    Object.entries(summaryMap).map(([key, value]) => [key, {
      ddls: value.ddls,
      milestones: value.milestones,
    }]),
  )
}

export function buildProjectEventSummaryMap(projects: LegacyProject[]) {
  const nextMap: Record<string, ProjectEventSummary> = {}

  const ensureDay = (key: string) => {
    nextMap[key] ||= {
      ddls: [],
      hasDdl: false,
      hasMs: false,
      milestones: [],
      urgent: false,
    }
    return nextMap[key]
  }

  for (const project of projects) {
    const ddlKey = coerceToLocalDateKey(project.ddl)
    if (ddlKey && project.name) {
      const day = ensureDay(ddlKey)
      day.ddls.push(project.name)
      day.hasDdl = true
      if (urgencyClass(ddlKey, project.status || 'active').includes('overdue')) {
        day.urgent = true
      }
    }

    for (const milestone of project.milestones || []) {
      const milestoneKey = coerceToLocalDateKey(milestone.date)
      if (milestoneKey && milestone.title) {
        const day = ensureDay(milestoneKey)
        day.milestones.push(milestone.title)
        day.hasMs = true
      }
    }
  }

  return nextMap
}

export function getProjectEventsForDate(
  eventMap: Record<string, ProjectEventSummary>,
  dateStr: string,
) {
  const day = eventMap[dateStr]
  if (!day) return []

  return [
    ...day.ddls.map((name) => ({ label: `DDL · ${name}`, type: 'ddl' as const })),
    ...day.milestones.map((name) => ({ label: `里程碑 · ${name}`, type: 'milestone' as const })),
  ]
}

export function buildProjectTimelineModel(
  projects: LegacyProject[],
  rangeDays = 90,
  forcedStartDate?: string,
): TimelineModel {
  const projectStartKeys = projects
    .map((project) => coerceToLocalDateKey(project.createdAt) || coerceToLocalDateKey(project.ddl))
    .filter((value): value is string => Boolean(value))
    .sort()

  const firstProjectDate = forcedStartDate || projectStartKeys[0] || shiftLocalDateKey(new Date(), 0)
  const firstProjectDateObject = parseLocalDateKey(firstProjectDate) || parseLocalDateKey(shiftLocalDateKey(new Date(), 0))
  const startDate = firstProjectDateObject
    ? `${firstProjectDateObject.getFullYear()}-${String(firstProjectDateObject.getMonth() + 1).padStart(2, '0')}-01`
    : shiftLocalDateKey(new Date(), 0)
  const start = parseLocalDateKey(startDate) || new Date()

  const days = Array.from({ length: rangeDays }, (_, index) => {
    const current = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index, 12, 0, 0, 0)
    const key = coerceToLocalDateKey(current.toISOString()) || shiftLocalDateKey(current, 0)

    return {
      day: current.getDate(),
      isMonthStart: current.getDate() === 1,
      isWeekend: current.getDay() === 0 || current.getDay() === 6,
      key,
      monthLabel: current.getDate() === 1 ? `${current.getMonth() + 1}月` : null,
    }
  })

  const startRef = parseLocalDateKey(startDate) || new Date()
  const rows = projects.map((project) => {
    const projectStartDate = coerceToLocalDateKey(project.createdAt) || shiftLocalDateKey(new Date(), 0)
    const projectEndDate = coerceToLocalDateKey(project.ddl) || shiftLocalDateKey(parseLocalDateKey(projectStartDate) || new Date(), 7)
    const startDateObject = parseLocalDateKey(projectStartDate) || startRef
    const endDateObject = parseLocalDateKey(projectEndDate) || startDateObject
    const offsetDays = Math.max(0, Math.round((startDateObject.getTime() - startRef.getTime()) / 86400000))
    const durationDays = Math.max(1, Math.round((endDateObject.getTime() - startDateObject.getTime()) / 86400000))

    return {
      durationDays,
      endDate: projectEndDate,
      id: project.id,
      name: project.name || '未命名项目',
      offsetDays,
      startDate: projectStartDate,
    }
  })

  return { days, rows, startDate }
}

export function buildProjectCardModels(
  projects: LegacyProject[],
  tasks: LegacyTask[],
): ProjectCardModel[] {
  const tasksByProjectId: Record<string, LegacyTask[]> = {}
  for (const task of tasks) {
    if (task.projectId) {
      tasksByProjectId[task.projectId] ||= []
      tasksByProjectId[task.projectId].push(task)
    }
  }

  return projects.map((project) => {
    const projectTasks = tasksByProjectId[project.id] || []
    const statusKey = project.status || 'active'
    const priorityKey = project.priority || 'medium'
    const milestones = (project.milestones || [])
      .filter((milestone) => milestone.title)
      .slice(0, 3)
      .map((milestone, index) => ({
        completed: Boolean(milestone.completed),
        dateText: formatSlashDate(coerceToLocalDateKey(milestone.date)),
        id: milestone.id || `${project.id}-milestone-${index}`,
        title: milestone.title || '',
      }))

    return {
      ddlText: ddlLabel(project.ddl || null, statusKey),
      description: project.description || '',
      doneCount: projectTasks.filter((task) => task.status === 'done').length,
      id: project.id,
      milestones,
      name: project.name || '未命名项目',
      priorityKey,
      priorityLabel: PRIORITY_LABELS[priorityKey] || PRIORITY_LABELS.medium,
      statusKey,
      statusLabel: STATUS_LABELS[statusKey] || STATUS_LABELS.active,
      taskCount: projectTasks.length,
      urgencyKey: urgencyClass(project.ddl || null, statusKey),
    } satisfies ProjectCardModel
  })
}

export function buildTaskListItemModels(
  tasks: LegacyTask[],
  projects: LegacyProject[],
  people: LegacyPerson[],
  todayStr: string,
): TaskListItemModel[] {
  const entityMaps = buildEntityMaps(projects, tasks, people)

  return tasks.map((task) => {
    const isDone = task.status === 'done'
    const isOverdue = Boolean(task.endDate && task.endDate < todayStr && !isDone)
    const priorityKey = task.priority || 'medium'
    const statusKey = task.status || 'todo'

    return {
      assigneeNames: getTaskAssigneeIds(task)
        .map((id) => entityMaps.peopleById[id]?.name || '')
        .filter(Boolean),
      dateText: task.endDate ? `${isOverdue ? '逾期 ' : ''}${formatSlashDate(task.endDate)}` : '',
      estimatedHoursText: task.estimatedHours ? `${task.estimatedHours}h` : '',
      id: task.id,
      isDone,
      isOverdue,
      priorityKey,
      priorityLabel: PRIORITY_LABELS[priorityKey] || PRIORITY_LABELS.medium,
      projectName: task.projectId ? entityMaps.projectsById[task.projectId]?.name || '' : '',
      statusKey,
      statusLabel: STATUS_LABELS[statusKey] || STATUS_LABELS.todo,
      title: task.title || '未命名任务',
    } satisfies TaskListItemModel
  })
}

export function buildPersonCardModels(
  people: LegacyPerson[],
  tasks: LegacyTask[],
): PersonCardModel[] {
  const openTaskCountByPersonId = buildEntityMaps([], tasks, people).openTaskCountByPersonId

  return people.map((person) => {
    const isInactive = person.status === 'inactive'
    const statusKey = isInactive ? 'cancelled' : 'active'
    const note = (person.notes || '').trim()

    return {
      avatarText: initials(person.name || ''),
      genderLabel: person.gender === 'male' ? '男' : person.gender === 'female' ? '女' : person.gender === 'other' ? '其他' : '',
      id: person.id,
      isInactive,
      name: person.name || '未命名成员',
      notePreview: note ? `备注: ${note.slice(0, 15)}${note.length > 15 ? '…' : ''}` : '',
      skills: person.skills || [],
      statusKey,
      statusLabel: isInactive ? '已停用' : '在职',
      taskCount: openTaskCountByPersonId[person.id] || 0,
    } satisfies PersonCardModel
  })
}

export function getDashboardFocusData(
  project: LegacyProject | null | undefined,
  tasks: LegacyTask[],
  todayStr: string,
) {
  if (!project) return null

  const projectTasks = tasks.filter((task) => task.projectId === project.id)
  const nextMs = (project.milestones || [])
    .filter((milestone) => !milestone.completed && milestone.date && milestone.date >= todayStr)
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''))[0]
  const days = daysUntil(project.ddl)

  let brief = '该项目未设置 DDL，请尽快补齐时间点。'
  if (days !== null) {
    if (days < 0) brief = `已逾期 ${Math.abs(days)} 天，建议立即处理交付风险。`
    else if (days === 0) brief = '今天截止，请优先完成最终交付与确认。'
    else if (days <= 3) brief = `距离截止 ${days} 天，进入冲刺窗口。`
    else if (days <= 7) brief = `距离截止 ${days} 天，请锁定关键里程碑。`
    else brief = `距离截止 ${days} 天，保持节奏推进。`
  }

  return {
    brief,
    nextMs,
    overdueCount: projectTasks.filter((task) => task.endDate && task.endDate < todayStr && task.status !== 'done').length,
    remainingCount: projectTasks.filter((task) => task.status !== 'done').length,
    todayCount: projectTasks.filter((task) => task.scheduledDate === todayStr && task.status !== 'done').length,
    uc: urgencyClass(project.ddl, project.status || 'active'),
  }
}

function getFocusToneByIndex(index: number) {
  if (index === 0) return 'focus-critical'
  if (index === 1) return 'focus-strong'
  if (index === 2) return 'focus-medium'
  if (index === 3) return 'focus-calm'
  return 'focus-neutral'
}

export function buildDashboardFocusCards(
  projects: LegacyProject[],
  tasks: LegacyTask[],
  todayStr: string,
  limit = 8,
) {
  const topProjects = getTopProjects(projects, limit)
  let upcomingIndex = 0

  return topProjects.map((project) => {
    const projectTasks = tasks.filter((task) => task.projectId === project.id)
    const nextMilestone = (project.milestones || [])
      .filter((milestone) => !milestone.completed && milestone.date && milestone.date >= todayStr)
      .sort((left, right) => (left.date || '').localeCompare(right.date || ''))[0]
    const days = daysUntil(project.ddl || null)
    let urgencyKey = 'focus-neutral'

    if (days !== null && days < 0) {
      urgencyKey = 'focus-overdue'
    } else if (days !== null) {
      urgencyKey = getFocusToneByIndex(upcomingIndex)
      upcomingIndex += 1
    }

    return {
      ddlLabel: ddlLabel(project.ddl || null, project.status || 'active'),
      id: project.id,
      name: project.name || '未命名项目',
      nextMilestone,
      openTaskCount: projectTasks.filter((task) => task.status !== 'done').length,
      urgencyKey,
    } satisfies DashboardFocusCard
  })
}

export function getOpenTaskCount(tasks: LegacyTask[]) {
  return tasks.filter((task) => task.status !== 'done').length
}

export function getFilteredProjects(
  projects: LegacyProject[],
  statusFilter: string,
  prioFilter: string,
) {
  return sortByUrgency(
    projects.filter((project) =>
      (!statusFilter || project.status === statusFilter) &&
      (!prioFilter || project.priority === prioFilter),
    ),
  )
}

export function getFilteredTasks(tasks: LegacyTask[], filters: TaskFilters) {
  return [...tasks]
    .filter((task) =>
      (!filters.search || (task.title || '').toLowerCase().includes(filters.search.toLowerCase())) &&
      (!filters.projFilter || task.projectId === filters.projFilter) &&
      (!filters.statusFilter || task.status === filters.statusFilter) &&
      (!filters.assigneeFilter || getTaskAssigneeIds(task).includes(filters.assigneeFilter)),
    )
    .sort((a, b) => {
      if (a.status === 'done' && b.status !== 'done') return 1
      if (b.status === 'done' && a.status !== 'done') return -1
      const priorityGap = (PRIORITY_ORDER[a.priority || 'medium'] ?? 2) - (PRIORITY_ORDER[b.priority || 'medium'] ?? 2)
      if (priorityGap !== 0) return priorityGap
      return (a.endDate || '9999').localeCompare(b.endDate || '9999')
    })
}

export function getFilteredPeople(people: LegacyPerson[], search: string, statusFilter: string) {
  return [...people]
    .filter((person) =>
      (!search || (person.name || '').toLowerCase().includes(search.toLowerCase())) &&
      (!statusFilter || person.status === statusFilter),
    )
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === 'active' ? -1 : 1
      return (a.name || '').localeCompare(b.name || '')
    })
}

export function getNeedsBackup(logs: LegacyLog[], projects: LegacyProject[], currentDate = new Date()) {
  const sevenDaysAgo = new Date(currentDate)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const recentExport = logs.find((log) =>
    log.text.includes('JSON 已导出') && new Date(log.ts) > sevenDaysAgo,
  )

  return !recentExport && projects.length > 0
}

export function buildTaskExportRows(
  tasks: LegacyTask[],
  maps: Pick<EntityMaps, 'peopleById' | 'projectsById'>,
) {
  return tasks.map((task) => ({
    assignees: getTaskAssigneeIds(task).map((id) => maps.peopleById[id]?.name || '').filter(Boolean).join(', '),
    createdAt: task.createdAt,
    endDate: task.endDate,
    estimatedHours: task.estimatedHours,
    id: task.id,
    priority: task.priority,
    project: task.projectId ? maps.projectsById[task.projectId]?.name || '' : '',
    scheduledDate: task.scheduledDate,
    startDate: task.startDate,
    status: task.status,
    title: task.title,
  }))
}

export function buildBackupSummary(data: Partial<BackupPayload> | Record<string, unknown>) {
  const payload = data as Partial<BackupPayload>

  return {
    logCount: Array.isArray(payload.logs) ? payload.logs.length : 0,
    personCount: Array.isArray(payload.people) ? payload.people.length : 0,
    projectCount: Array.isArray(payload.projects) ? payload.projects.length : 0,
    settingsCount: Array.isArray(payload.settings) ? payload.settings.length : 0,
    taskCount: Array.isArray(payload.tasks) ? payload.tasks.length : 0,
  } satisfies BackupSummary
}

export function formatRecentLogs(logs: LegacyLog[]) {
  return logs.slice(0, 30).map((log) => {
    const date = new Date(log.ts)

    return {
      date: `${date.getMonth() + 1}/${date.getDate()}`,
      id: log.id,
      text: log.text,
      time: `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`,
    } satisfies RecentLogItem
  })
}

export function createAssignedTaskUpdate(task: LegacyTask, personId: string | null, scheduledDate: string | null) {
  const currentIds = getTaskAssigneeIds(task)
  const assigneeIds = personId
    ? currentIds.includes(personId) ? currentIds : [...currentIds, personId]
    : []
  return {
    ...task,
    assigneeIds,
    scheduledDate,
    updatedAt: now(),
  }
}

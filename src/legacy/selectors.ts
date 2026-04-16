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
  urgencyClass,
} from './utils'
import type { BackupPayload } from './utils'
import type { LegacyLog, LegacyPerson, LegacyProject, LegacyTask } from './store'
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
  leaveRecordCount: number
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
  urgencyKey: string
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
  hasLeave: boolean
  hasUrgent: boolean
  isOtherMonth: boolean
  isToday: boolean
  markerKind?: 'ddl' | ''
  markerTone?: ProjectDeadlineToneKey | ''
}

export type DashboardMiniCalendarModel = {
  days: DashboardMiniCalendarDay[]
  title: string
  weekdays: string[]
}

export type DashboardFocusCard = {
  daysLeft: number | null
  ddlLabel: string
  id: string
  name: string
  openTaskCount: number
  urgencyKey: string
}

export type ProjectEventItem = {
  label: string
  toneKey: ProjectDeadlineToneKey
}

export type ProjectEventSummary = {
  ddls: ProjectEventItem[]
  hasDdl: boolean
  markerKind?: 'ddl' | ''
  markerTone?: ProjectDeadlineToneKey | ''
  urgent: boolean
}

export type ProjectCardModel = {
  ddlText: string
  description: string
  doneCount: number
  id: string
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
  isOnLeaveToday: boolean
  name: string
  notePreview: string
  skills: string[]
  statusKey: string
  statusLabel: string
  taskCount: number
  topInProgressTaskLabel: string
}

export type ProjectDeadlineToneKey =
  | 'focus-overdue'
  | 'focus-critical'
  | 'focus-strong'
  | 'focus-medium'
  | 'focus-calm'
  | 'focus-neutral'
  | 'urg-done'

export type QuickJumpSearchKind = 'project' | 'task' | 'person'

export type QuickJumpSearchItem = {
  id: string
  kind: QuickJumpSearchKind
  title: string
  subtitle: string
}

const PRIORITY_ORDER: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 }
const DASHBOARD_WEEKDAY_LABELS = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
const DASHBOARD_MONTH_LABELS = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']
const MINI_CALENDAR_WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']
const PROJECT_TONE_ORDER: Record<ProjectDeadlineToneKey, number> = {
  'focus-overdue': 0,
  'focus-critical': 1,
  'focus-strong': 2,
  'focus-medium': 3,
  'focus-calm': 4,
  'focus-neutral': 5,
  'urg-done': 6,
}

function isToneMoreUrgent(
  nextTone: ProjectDeadlineToneKey,
  currentTone: ProjectDeadlineToneKey | '' | undefined,
) {
  if (!currentTone) return true
  return (PROJECT_TONE_ORDER[nextTone] ?? 99) < (PROJECT_TONE_ORDER[currentTone] ?? 99)
}

function formatSlashDate(dateStr: string | null | undefined) {
  if (!dateStr) return ''
  const [year, month, day] = dateStr.split('-')
  return `${year}/${parseInt(month, 10)}/${parseInt(day, 10)}`
}

function daysFromReference(dateStr: string | null | undefined, referenceDate: string) {
  if (!dateStr) return null
  const target = parseLocalDateKey(dateStr)
  const reference = parseLocalDateKey(referenceDate)
  if (!target || !reference) return null
  return Math.round((target.getTime() - reference.getTime()) / 86400000)
}

function compareProjectDeadline(left: LegacyProject, right: LegacyProject) {
  const leftDdl = left.ddl || '9999-12-31'
  const rightDdl = right.ddl || '9999-12-31'
  if (leftDdl !== rightDdl) return leftDdl.localeCompare(rightDdl)
  return (left.name || '').localeCompare(right.name || '', 'zh-CN')
}

function getFocusToneByIndex(index: number): ProjectDeadlineToneKey {
  if (index === 0) return 'focus-critical'
  if (index === 1) return 'focus-strong'
  if (index === 2) return 'focus-medium'
  if (index === 3) return 'focus-calm'
  return 'focus-neutral'
}

function getMatchScore(text: string, query: string) {
  const source = text.trim().toLowerCase()
  if (!source) return null

  const index = source.indexOf(query)
  if (index < 0) return null
  if (index === 0) return 0
  if (index <= 8) return 1
  return 2
}

function pickBestMatchScore(fields: string[], query: string) {
  let best: number | null = null

  for (const field of fields) {
    const score = getMatchScore(field, query)
    if (score === null) continue
    if (best === null || score < best) {
      best = score
    }
  }

  return best
}

export function buildProjectDeadlineToneMap(
  projects: LegacyProject[],
  referenceDate: string,
) {
  const toneMap: Record<string, ProjectDeadlineToneKey> = {}
  const overdue: LegacyProject[] = []
  const upcoming: LegacyProject[] = []
  const noDeadline: LegacyProject[] = []

  for (const project of projects) {
    if (project.status === 'completed' || project.status === 'cancelled') {
      toneMap[project.id] = 'urg-done'
      continue
    }
    const days = daysFromReference(project.ddl || null, referenceDate)
    if (days === null) noDeadline.push(project)
    else if (days < 0) overdue.push(project)
    else upcoming.push(project)
  }

  overdue.sort(compareProjectDeadline).forEach((project) => {
    toneMap[project.id] = 'focus-overdue'
  })
  upcoming.sort(compareProjectDeadline).forEach((project, index) => {
    toneMap[project.id] = getFocusToneByIndex(index)
  })
  noDeadline.sort(compareProjectDeadline).forEach((project) => {
    toneMap[project.id] = 'focus-neutral'
  })

  return toneMap
}

export function sortProjectsByDeadlineTone(
  projects: LegacyProject[],
  referenceDate: string,
) {
  const toneMap = buildProjectDeadlineToneMap(projects, referenceDate)

  return [...projects].sort((left, right) => {
    const leftOrder = PROJECT_TONE_ORDER[toneMap[left.id] || 'focus-neutral']
    const rightOrder = PROJECT_TONE_ORDER[toneMap[right.id] || 'focus-neutral']
    if (leftOrder !== rightOrder) return leftOrder - rightOrder
    return compareProjectDeadline(left, right)
  })
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

export function getTopProjects(projects: LegacyProject[], limit = 8, referenceDate = shiftLocalDateKey(new Date(), 0)) {
  return sortProjectsByDeadlineTone(getActiveProjects(projects), referenceDate).slice(0, limit)
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
  leaveDates: Set<string> = new Set(),
): DashboardMiniCalendarModel {
  const days = getCalendarDays(currentMonth.getFullYear(), currentMonth.getMonth()).map(({ date, otherMonth }) => {
    const dateKey = coerceToLocalDateKey(date) || shiftLocalDateKey(date, 0)
    const eventSummary = eventMap[dateKey]

    return {
      dateKey,
      dayOfMonth: date.getDate(),
      hasEvents: Boolean(eventSummary?.hasDdl),
      hasLeave: leaveDates.has(dateKey),
      hasUrgent: Boolean(eventSummary?.urgent),
      isOtherMonth: otherMonth,
      isToday: dateKey === todayStr,
      markerKind: eventSummary?.markerKind || '',
      markerTone: eventSummary?.markerTone || '',
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
      urgent: value.urgent,
    }]),
  )
}

export function buildCalendarEventMap(projects: LegacyProject[]) {
  const summaryMap = buildProjectEventSummaryMap(projects)

  return Object.fromEntries(
    Object.entries(summaryMap).map(([key, value]) => [key, {
      ddls: value.ddls.map((item) => item.label),
    }]),
  )
}

export function buildProjectEventSummaryMap(
  projects: LegacyProject[],
  referenceDate = shiftLocalDateKey(new Date(), 0),
) {
  const nextMap: Record<string, ProjectEventSummary> = {}
  const toneMap = buildProjectDeadlineToneMap(projects, referenceDate)

  const ensureDay = (key: string) => {
    nextMap[key] ||= {
      ddls: [],
      hasDdl: false,
      markerKind: '',
      markerTone: '',
      urgent: false,
    }
    return nextMap[key]
  }

  for (const project of projects) {
    const ddlKey = coerceToLocalDateKey(project.ddl)
    const toneKey = toneMap[project.id] || 'focus-neutral'
    if (ddlKey && project.name) {
      const day = ensureDay(ddlKey)
      day.ddls.push({ label: project.name, toneKey })
      day.hasDdl = true
      if (urgencyClass(ddlKey, project.status || 'active').includes('overdue')) {
        day.urgent = true
      }
      if (isToneMoreUrgent(toneKey, day.markerTone)) {
        day.markerTone = toneKey
        day.markerKind = 'ddl'
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
    ...day.ddls.map((item) => ({ label: `DDL · ${item.label}`, toneKey: item.toneKey, type: 'ddl' as const })),
  ]
}

export function buildProjectTimelineModel(
  projects: LegacyProject[],
  rangeDays = 90,
  forcedStartDate?: string,
  referenceDate = shiftLocalDateKey(new Date(), 0),
): TimelineModel {
  const toneMap = buildProjectDeadlineToneMap(projects, referenceDate)
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
      urgencyKey: toneMap[project.id] || 'focus-neutral',
    }
  })

  return { days, rows, startDate }
}

export function buildProjectCardModels(
  projects: LegacyProject[],
  tasks: LegacyTask[],
  referenceDate = shiftLocalDateKey(new Date(), 0),
): ProjectCardModel[] {
  const toneMap = buildProjectDeadlineToneMap(projects, referenceDate)
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

    return {
      ddlText: ddlLabel(project.ddl || null, statusKey),
      description: project.description || '',
      doneCount: projectTasks.filter((task) => task.status === 'done').length,
      id: project.id,
      name: project.name || '未命名项目',
      priorityKey,
      priorityLabel: PRIORITY_LABELS[priorityKey] || PRIORITY_LABELS.medium,
      statusKey,
      statusLabel: STATUS_LABELS[statusKey] || STATUS_LABELS.active,
      taskCount: projectTasks.length,
      urgencyKey: toneMap[project.id] || 'focus-neutral',
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

function genderSortKey(gender: string | undefined): number {
  if (gender === 'male') return 0
  if (gender === 'female') return 1
  return 2
}

function comparePersonHighlightTask(left: LegacyTask, right: LegacyTask) {
  const leftPriority = PRIORITY_ORDER[left.priority || 'medium'] ?? PRIORITY_ORDER.medium
  const rightPriority = PRIORITY_ORDER[right.priority || 'medium'] ?? PRIORITY_ORDER.medium
  if (leftPriority !== rightPriority) return leftPriority - rightPriority

  const leftDate = left.endDate || left.scheduledDate || left.startDate || '9999-12-31'
  const rightDate = right.endDate || right.scheduledDate || right.startDate || '9999-12-31'
  if (leftDate !== rightDate) return leftDate.localeCompare(rightDate)

  const leftCreatedAt = left.createdAt || ''
  const rightCreatedAt = right.createdAt || ''
  if (leftCreatedAt !== rightCreatedAt) return leftCreatedAt.localeCompare(rightCreatedAt)

  return (left.title || '').localeCompare(right.title || '', 'zh-CN')
}

function formatPersonHighlightTaskLabel(title: string | undefined) {
  const source = (title || '').trim() || '未命名'
  const chars = Array.from(source)
  if (chars.length <= 5) return source
  return `${chars.slice(0, 5).join('')}+${chars.length - 5}`
}

export function buildPersonCardModels(
  people: LegacyPerson[],
  tasks: LegacyTask[],
  leavePersonIdsToday: Set<string> = new Set(),
): PersonCardModel[] {
  const openTaskCountByPersonId = buildEntityMaps([], tasks, people).openTaskCountByPersonId
  const highlightTaskByPersonId: Record<string, LegacyTask> = {}

  for (const task of tasks) {
    if (task.status !== 'in-progress') continue

    for (const personId of getTaskAssigneeIds(task)) {
      const current = highlightTaskByPersonId[personId]
      if (!current || comparePersonHighlightTask(task, current) < 0) {
        highlightTaskByPersonId[personId] = task
      }
    }
  }

  const sorted = [...people].sort((a, b) => {
    const aLeave = leavePersonIdsToday.has(a.id) ? 1 : 0
    const bLeave = leavePersonIdsToday.has(b.id) ? 1 : 0
    if (aLeave !== bLeave) return aLeave - bLeave
    return genderSortKey(a.gender) - genderSortKey(b.gender)
  })

  return sorted.map((person) => {
    const isInactive = person.status === 'inactive'
    const statusKey = isInactive ? 'cancelled' : 'active'
    const note = (person.notes || '').trim()
    const highlightTask = highlightTaskByPersonId[person.id]

    return {
      avatarText: initials(person.name || ''),
      genderLabel: person.gender === 'male' ? '男' : person.gender === 'female' ? '女' : person.gender === 'other' ? '其他' : '',
      id: person.id,
      isInactive,
      isOnLeaveToday: leavePersonIdsToday.has(person.id),
      name: person.name || '未命名成员',
      notePreview: note ? `备注: ${note.slice(0, 15)}${note.length > 15 ? '…' : ''}` : '',
      skills: person.skills || [],
      statusKey,
      statusLabel: isInactive ? '已停用' : '在职',
      taskCount: openTaskCountByPersonId[person.id] || 0,
      topInProgressTaskLabel: highlightTask ? formatPersonHighlightTaskLabel(highlightTask.title) : '暂无进行中',
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
  const days = daysUntil(project.ddl)

  let brief = '该项目未设置 DDL，请尽快补齐时间点。'
  if (days !== null) {
    if (days < 0) brief = `已逾期 ${Math.abs(days)} 天，建议立即处理交付风险。`
    else if (days === 0) brief = '今天截止，请优先完成最终交付与确认。'
    else if (days <= 3) brief = `距离截止 ${days} 天，进入冲刺窗口。`
    else if (days <= 7) brief = `距离截止 ${days} 天，请锁定关键交付项。`
    else brief = `距离截止 ${days} 天，保持节奏推进。`
  }

  const openTasks = projectTasks.filter((task) => task.status !== 'done')
  const assigneeCount = new Set(openTasks.flatMap((task) => getTaskAssigneeIds(task))).size

  return {
    assigneeCount,
    brief,
    overdueCount: projectTasks.filter((task) => task.endDate && task.endDate < todayStr && task.status !== 'done').length,
    remainingCount: openTasks.length,
    todayCount: projectTasks.filter((task) => task.scheduledDate === todayStr && task.status !== 'done').length,
    topTasks: openTasks.slice(0, 3).map((task) => task.title || '未命名任务'),
    uc: urgencyClass(project.ddl, project.status || 'active'),
  }
}

export function buildDashboardFocusCards(
  projects: LegacyProject[],
  tasks: LegacyTask[],
  todayStr: string,
  limit = 8,
) {
  const topProjects = getTopProjects(projects, limit, todayStr)
  const toneMap = buildProjectDeadlineToneMap(topProjects, todayStr)

  return topProjects.map((project) => {
    const projectTasks = tasks.filter((task) => task.projectId === project.id)
    const statusKey = project.status || 'active'
    return {
      daysLeft: (statusKey === 'active' || statusKey === 'paused') ? (daysUntil(project.ddl || null) ?? null) : null,
      ddlLabel: ddlLabel(project.ddl || null, statusKey),
      id: project.id,
      name: project.name || '未命名项目',
      openTaskCount: projectTasks.filter((task) => task.status !== 'done').length,
      urgencyKey: toneMap[project.id] || 'focus-neutral',
    } satisfies DashboardFocusCard
  })
}

export function buildQuickJumpSearchItems(
  projects: LegacyProject[],
  tasks: LegacyTask[],
  people: LegacyPerson[],
  query: string,
  limit = 8,
) {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) return [] as QuickJumpSearchItem[]

  type ScoredItem = QuickJumpSearchItem & { matchScore: number }
  const kindOrder: Record<QuickJumpSearchKind, number> = { project: 0, task: 1, person: 2 }
  const maps = buildEntityMaps(projects, tasks, people)
  const items: ScoredItem[] = []

  for (const project of projects) {
    const matchScore = pickBestMatchScore([project.name || '', project.description || ''], normalizedQuery)
    if (matchScore === null) continue

    items.push({
      id: project.id,
      kind: 'project',
      title: project.name || '未命名项目',
      subtitle: `项目 · ${STATUS_LABELS[project.status || 'active'] || '进行中'}${project.ddl ? ` · DDL ${formatSlashDate(project.ddl)}` : ''}`,
      matchScore,
    })
  }

  for (const task of tasks) {
    const assigneeNames = getTaskAssigneeIds(task)
      .map((personId) => maps.peopleById[personId]?.name || '')
      .filter(Boolean)
    const projectName = task.projectId ? maps.projectsById[task.projectId]?.name || '未命名项目' : '未关联项目'
    const matchScore = pickBestMatchScore([
      task.title || '',
      task.description || '',
      projectName,
      ...assigneeNames,
    ], normalizedQuery)
    if (matchScore === null) continue

    items.push({
      id: task.id,
      kind: 'task',
      title: task.title || '未命名任务',
      subtitle: `任务 · ${projectName}${assigneeNames.length ? ` · ${assigneeNames.join('、')}` : ''}`,
      matchScore,
    })
  }

  for (const person of people) {
    const skills = person.skills || []
    const matchScore = pickBestMatchScore([
      person.name || '',
      person.notes || '',
      ...skills,
    ], normalizedQuery)
    if (matchScore === null) continue

    items.push({
      id: person.id,
      kind: 'person',
      title: person.name || '未命名成员',
      subtitle: `人员 · ${skills.length ? skills.slice(0, 2).join(' / ') : '无技能标签'}`,
      matchScore,
    })
  }

  return items
    .sort((left, right) => {
      if (left.matchScore !== right.matchScore) return left.matchScore - right.matchScore

      const kindGap = (kindOrder[left.kind] ?? 99) - (kindOrder[right.kind] ?? 99)
      if (kindGap !== 0) return kindGap

      return left.title.localeCompare(right.title, 'zh-CN')
    })
    .slice(0, limit)
    .map((item) => ({
      id: item.id,
      kind: item.kind,
      title: item.title,
      subtitle: item.subtitle,
    }))
}

export function getOpenTaskCount(tasks: LegacyTask[]) {
  return tasks.filter((task) => task.status !== 'done').length
}

export function getFilteredProjects(
  projects: LegacyProject[],
  statusFilter: string,
  prioFilter: string,
  referenceDate = shiftLocalDateKey(new Date(), 0),
) {
  return sortProjectsByDeadlineTone(
    projects.filter((project) =>
      (!statusFilter || project.status === statusFilter) &&
      (!prioFilter || project.priority === prioFilter),
    ),
    referenceDate,
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
  const seventyTwoHoursAgo = new Date(currentDate.getTime() - 72 * 60 * 60 * 1000)

  const recentExport = logs.find((log) =>
    log.text.includes('JSON 已导出') && new Date(log.ts) > seventyTwoHoursAgo,
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
    leaveRecordCount: Array.isArray(payload.leaveRecords) ? payload.leaveRecords.length : 0,
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

import type { LegacyPerson, ShortDrama, ShortDramaAssignment, ShortDramaGroup, ShortDramaProgressStatus } from '../../legacy/store'

export const SHORT_DRAMA_PROGRESS_LABELS: Record<ShortDramaProgressStatus, string> = {
  'not-started': '未开始',
  'in-progress': '制作中',
  review: '待审核',
  revision: '返修',
  done: '已完成',
}

export const SHORT_DRAMA_PROGRESS_ORDER: ShortDramaProgressStatus[] = [
  'not-started',
  'in-progress',
  'review',
  'revision',
  'done',
]

export type ShortDramaStats = {
  assignedEpisodeCount: number
  completedEpisodeCount: number
  finishedDurationLabel: string
  progressPercent: number
  statusCounts: Record<ShortDramaProgressStatus, number>
  totalActualHours: number
  totalEstimatedHours: number
}

export type ShortDramaAssignmentRow = {
  actualHours: number
  allocationText: string
  durationText: string
  endDate: string
  episodes: string
  estimatedHours: number
  groupName: string
  hoursText: string
  id: string
  ownerName: string
  producerNames: string
  startDate: string
  status: ShortDramaProgressStatus
  statusLabel: string
}

export type ShortDramaAssignmentCardModel = ShortDramaAssignmentRow & {
  title: string
}

export type ShortDramaGroupLaneModel = {
  assignmentCount: number
  cards: ShortDramaAssignmentCardModel[]
  episodeCount: number
  groupId: string | null
  groupName: string
  hourText: string
  memberNames: string
}

export type ShortDramaPersonSummary = {
  actualHours: number
  assignmentCount: number
  doneCount: number
  episodeCount: number
  estimatedHours: number
  groupNames: string
  id: string
  name: string
  reviewCount: number
}

export type ShortDramaAssignmentDefaults = {
  allocations: ShortDramaAssignment['allocations']
  estimatedHours: number | null
  groupId: string
  ownerId: string
  producerIds: string[]
  status: ShortDramaProgressStatus
}

function numberValue(value: number | null | undefined) {
  return Number.isFinite(Number(value)) ? Number(value) : 0
}

function clampStatus(value: string | null | undefined): ShortDramaProgressStatus {
  return SHORT_DRAMA_PROGRESS_ORDER.includes(value as ShortDramaProgressStatus)
    ? value as ShortDramaProgressStatus
    : 'not-started'
}

function buildProductionPersonIds(assignment: ShortDramaAssignment) {
  const allocationPersonIds = assignment.allocations
    .map((allocation) => allocation.personId)
    .filter(Boolean)
  return allocationPersonIds.length > 0 ? allocationPersonIds : assignment.producerIds
}

function buildAllocationText(assignment: ShortDramaAssignment, personById: Map<string, LegacyPerson>) {
  const items = assignment.allocations
    .map((allocation) => {
      const name = personById.get(allocation.personId)?.name || ''
      if (!name) return ''
      const episodes = allocation.episodes?.trim()
      return episodes ? `${name} ${episodes}集` : name
    })
    .filter(Boolean)

  return items.join(' · ')
}

export function formatDurationSeconds(value: number | null | undefined) {
  const seconds = Math.floor(numberValue(value))
  if (seconds <= 0) return '—'
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return `${minutes}:${String(rest).padStart(2, '0')}`
}

export function parseDurationText(value: string) {
  const text = value.trim()
  if (!text) return null
  const parts = text.split(':').map((item) => Number(item))
  if (parts.length === 2 && parts.every((item) => Number.isFinite(item) && item >= 0)) {
    return Math.floor(parts[0] * 60 + parts[1])
  }
  const asSeconds = Number(text)
  return Number.isFinite(asSeconds) && asSeconds > 0 ? Math.floor(asSeconds) : null
}

export function parseEpisodeCount(value: string | null | undefined) {
  if (!value) return 0
  const chunks = value
    .replace(/[第集\s]/g, '')
    .split(/[，,、/；;]+/)
    .map((item) => item.trim())
    .filter(Boolean)

  let count = 0
  for (const chunk of chunks) {
    const range = /^(\d+)\s*[-~至到]\s*(\d+)$/.exec(chunk)
    if (range) {
      const start = Number(range[1])
      const end = Number(range[2])
      count += Math.abs(end - start) + 1
      continue
    }
    if (/\d+/.test(chunk)) count += 1
  }

  return count
}

export function buildShortDramaStats(
  drama: Pick<ShortDrama, 'id' | 'totalEpisodes'> | null | undefined,
  assignments: ShortDramaAssignment[],
): ShortDramaStats {
  const statusCounts = Object.fromEntries(
    SHORT_DRAMA_PROGRESS_ORDER.map((status) => [status, 0]),
  ) as Record<ShortDramaProgressStatus, number>
  const selected = drama
    ? assignments.filter((assignment) => assignment.dramaId === drama.id)
    : []
  let assignedEpisodeCount = 0
  let completedEpisodeCount = 0
  let totalEstimatedHours = 0
  let totalActualHours = 0
  let totalDurationSeconds = 0

  for (const assignment of selected) {
    const episodeCount = parseEpisodeCount(assignment.episodes)
    const status = clampStatus(assignment.status)
    statusCounts[status] += 1
    assignedEpisodeCount += episodeCount
    totalEstimatedHours += numberValue(assignment.estimatedHours)
    totalActualHours += numberValue(assignment.actualHours)
    totalDurationSeconds += numberValue(assignment.finishedDurationSeconds)
    if (status === 'done') completedEpisodeCount += episodeCount
  }

  const denominator = Math.max(numberValue(drama?.totalEpisodes), assignedEpisodeCount, 1)
  const progressPercent = Math.min(100, Math.round((completedEpisodeCount / denominator) * 100))

  return {
    assignedEpisodeCount,
    completedEpisodeCount,
    finishedDurationLabel: formatDurationSeconds(totalDurationSeconds),
    progressPercent,
    statusCounts,
    totalActualHours,
    totalEstimatedHours,
  }
}

export function buildShortDramaAssignmentRows(
  assignments: ShortDramaAssignment[],
  groups: ShortDramaGroup[],
  people: LegacyPerson[],
  dramaId: string,
): ShortDramaAssignmentRow[] {
  const groupById = new Map(groups.map((group) => [group.id, group]))
  const personById = new Map(people.map((person) => [person.id, person]))

  return assignments
    .filter((assignment) => assignment.dramaId === dramaId)
    .map((assignment) => {
      const status = clampStatus(assignment.status)
      const estimatedHours = numberValue(assignment.estimatedHours)
      const actualHours = numberValue(assignment.actualHours)
      const producerNames = buildProductionPersonIds(assignment)
        .map((id) => personById.get(id)?.name || '')
        .filter(Boolean)
        .join('、')

      return {
        actualHours,
        allocationText: buildAllocationText(assignment, personById),
        durationText: formatDurationSeconds(assignment.finishedDurationSeconds),
        endDate: assignment.endDate || '',
        episodes: assignment.episodes || '',
        estimatedHours,
        groupName: assignment.groupId ? groupById.get(assignment.groupId)?.name || '未分组' : '未分组',
        hoursText: `${actualHours || 0} / ${estimatedHours || 0}h`,
        id: assignment.id,
        ownerName: assignment.ownerId ? personById.get(assignment.ownerId)?.name || '' : '',
        producerNames: producerNames || '未分配',
        startDate: assignment.startDate || '',
        status,
        statusLabel: SHORT_DRAMA_PROGRESS_LABELS[status],
      } satisfies ShortDramaAssignmentRow
    })
}

export function buildShortDramaGroupLanes(
  assignments: ShortDramaAssignment[],
  groups: ShortDramaGroup[],
  people: LegacyPerson[],
  dramaId: string,
): ShortDramaGroupLaneModel[] {
  const rows = buildShortDramaAssignmentRows(assignments, groups, people, dramaId)
  const assignmentById = new Map(assignments.map((assignment) => [assignment.id, assignment]))
  const personById = new Map(people.map((person) => [person.id, person]))
  const lanes: ShortDramaGroupLaneModel[] = groups
    .filter((group) => group.dramaId === dramaId)
    .map((group) => {
      const groupAssignments = rows.filter((row) => assignmentById.get(row.id)?.groupId === group.id)
      const estimated = groupAssignments.reduce((sum, row) => sum + row.estimatedHours, 0)
      const actual = groupAssignments.reduce((sum, row) => sum + row.actualHours, 0)
      const memberNames = group.memberIds
        .map((id) => personById.get(id)?.name || '')
        .filter(Boolean)
        .join('、')

      return {
        assignmentCount: groupAssignments.length,
        cards: groupAssignments.map((row) => ({
          ...row,
          title: `${row.episodes || '未定'} 集`,
        })),
        episodeCount: groupAssignments.reduce((sum, row) => sum + parseEpisodeCount(row.episodes), 0),
        groupId: group.id,
        groupName: group.name || '未命名小组',
        hourText: `${actual} / ${estimated}h`,
        memberNames: memberNames || '未添加成员',
      }
    })

  const unassigned = rows.filter((row) => {
    const assignment = assignmentById.get(row.id)
    return !assignment?.groupId
  })
  if (unassigned.length > 0) {
    const estimated = unassigned.reduce((sum, row) => sum + row.estimatedHours, 0)
    const actual = unassigned.reduce((sum, row) => sum + row.actualHours, 0)
    lanes.push({
      assignmentCount: unassigned.length,
      cards: unassigned.map((row) => ({
        ...row,
        title: `${row.episodes || '未定'} 集`,
      })),
      episodeCount: unassigned.reduce((sum, row) => sum + parseEpisodeCount(row.episodes), 0),
      groupId: null,
      groupName: '未分组',
      hourText: `${actual} / ${estimated}h`,
      memberNames: '可稍后归组',
    })
  }

  return lanes
}

export function buildShortDramaPersonSummaries(
  assignments: ShortDramaAssignment[],
  groups: ShortDramaGroup[],
  people: LegacyPerson[],
  dramaId: string,
): ShortDramaPersonSummary[] {
  const groupById = new Map(groups.map((group) => [group.id, group]))
  const personById = new Map(people.map((person) => [person.id, person]))
  const summaries = new Map<string, ShortDramaPersonSummary>()

  for (const assignment of assignments) {
    if (assignment.dramaId !== dramaId) continue
    const productionPersonIds = buildProductionPersonIds(assignment)
    const personIds = productionPersonIds.length > 0
      ? productionPersonIds
      : assignment.ownerId ? [assignment.ownerId] : []
    const status = clampStatus(assignment.status)
    const groupName = assignment.groupId ? groupById.get(assignment.groupId)?.name || '' : '未分组'

    for (const personId of personIds) {
      const person = personById.get(personId)
      if (!person || person.status === 'inactive') continue
      const allocation = assignment.allocations.find((item) => item.personId === personId)
      const episodeCount = parseEpisodeCount(allocation?.episodes || assignment.episodes)
      const estimatedHours = numberValue(allocation?.estimatedHours ?? assignment.estimatedHours)
      const actualHours = numberValue(allocation?.actualHours ?? assignment.actualHours)
      const current = summaries.get(personId) || {
        actualHours: 0,
        assignmentCount: 0,
        doneCount: 0,
        episodeCount: 0,
        estimatedHours: 0,
        groupNames: '',
        id: personId,
        name: person.name || '未命名',
        reviewCount: 0,
      }
      const groupNames = new Set(current.groupNames ? current.groupNames.split('、') : [])
      if (groupName) groupNames.add(groupName)

      summaries.set(personId, {
        ...current,
        actualHours: current.actualHours + actualHours,
        assignmentCount: current.assignmentCount + 1,
        doneCount: current.doneCount + (status === 'done' ? 1 : 0),
        episodeCount: current.episodeCount + episodeCount,
        estimatedHours: current.estimatedHours + estimatedHours,
        groupNames: Array.from(groupNames).join('、'),
        reviewCount: current.reviewCount + (status === 'review' || status === 'revision' ? 1 : 0),
      })
    }
  }

  return Array.from(summaries.values()).sort((left, right) => {
    if (right.reviewCount !== left.reviewCount) return right.reviewCount - left.reviewCount
    if (right.episodeCount !== left.episodeCount) return right.episodeCount - left.episodeCount
    return left.name.localeCompare(right.name, 'zh-CN')
  })
}

export function buildShortDramaAssignmentDefaults({
  assignments,
  dramaId,
  groupId,
  groups,
}: {
  assignments: ShortDramaAssignment[]
  dramaId: string
  groupId: string | null
  groups: ShortDramaGroup[]
}): ShortDramaAssignmentDefaults {
  const group = groups.find((item) => item.id === groupId)
  const previous = [...assignments]
    .reverse()
    .find((assignment) => assignment.dramaId === dramaId && (assignment.groupId || '') === (groupId || ''))
  const producerIds = previous?.producerIds.length
    ? previous.producerIds
    : group?.memberIds || []

  return {
    allocations: producerIds.map((personId) => {
      const previousAllocation = previous?.allocations.find((allocation) => allocation.personId === personId)
      return previousAllocation
        ? { personId, estimatedHours: previousAllocation.estimatedHours || null }
        : { personId }
    }),
    estimatedHours: previous?.estimatedHours || null,
    groupId: groupId || '',
    ownerId: previous?.ownerId || group?.leaderId || '',
    producerIds,
    status: clampStatus(previous?.status || 'not-started'),
  }
}

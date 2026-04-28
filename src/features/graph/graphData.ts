import { getTaskAssigneeIds, type LegacyPerson, type LegacyProject, type LegacyTask } from '../../legacy/store'
import { ddlLabel, urgencyClass, STATUS_LABELS, PRIORITY_LABELS } from '../../legacy/utils'
import { type GraphData, type GraphNode } from './graphTypes'

function taskDeadline(task: LegacyTask) {
  return task.endDate || task.scheduledDate || task.startDate || null
}

function taskUrgency(task: LegacyTask) {
  const status = task.status || 'todo'
  if (status === 'done') return 'urg-done'
  if (status === 'blocked') return 'urg-blocked'

  const dateUrgency = urgencyClass(taskDeadline(task), 'active')
  if (dateUrgency) return dateUrgency
  if (status === 'in-progress') return 'urg-active'
  return ''
}

const urgencyOrder: Record<string, number> = {
  'urg-blocked': 0,
  'urg-overdue': 1,
  'urg-today': 2,
  'urg-soon': 3,
  'urg-near': 4,
  'urg-active': 5,
  '': 6,
  'urg-done': 7,
}

function nodeUrgencyRank(node: GraphNode) {
  return urgencyOrder[node.urgency] ?? 6
}

function compareNodesForRank(left: GraphNode, right: GraphNode) {
  if (left.kind === 'person' && right.kind === 'person') {
    return right.sortValue - left.sortValue
      || nodeUrgencyRank(left) - nodeUrgencyRank(right)
      || right.size - left.size
      || left.label.localeCompare(right.label)
  }

  return nodeUrgencyRank(left) - nodeUrgencyRank(right)
    || right.sortValue - left.sortValue
    || right.size - left.size
    || left.label.localeCompare(right.label)
}

function applyRankIndexes(nodes: GraphNode[]) {
  for (const kind of ['project', 'task', 'person'] as const) {
    const ranked = nodes
      .filter((node) => node.kind === kind)
      .sort(compareNodesForRank)

    ranked.forEach((node, index) => {
      node.rankIndex = index
      node.rankCount = ranked.length
    })
  }
}

export function buildGraphData(
  projects: LegacyProject[],
  tasks: LegacyTask[],
  people: LegacyPerson[],
): GraphData {
  const nodes: GraphNode[] = []
  const edges = []
  const tasksByProjectId = new Map<string, LegacyTask[]>()
  const tasksByPersonId = new Map<string, LegacyTask[]>()

  for (const task of tasks) {
    if (task.projectId) {
      const projectTasks = tasksByProjectId.get(task.projectId) || []
      projectTasks.push(task)
      tasksByProjectId.set(task.projectId, projectTasks)
    }

    for (const personId of getTaskAssigneeIds(task)) {
      const personTasks = tasksByPersonId.get(personId) || []
      personTasks.push(task)
      tasksByPersonId.set(personId, personTasks)
    }
  }

  for (const project of projects) {
    const projectTasks = tasksByProjectId.get(project.id) || []
    const openTasks = projectTasks.filter((task) => (task.status || 'todo') !== 'done')
    const blockedTasks = openTasks.filter((task) => task.status === 'blocked')
    nodes.push({
      id: `project:${project.id}`,
      refId: project.id,
      kind: 'project' as const,
      label: project.name || '未命名项目',
      subtitle: [
        STATUS_LABELS[project.status || 'active'],
        project.priority ? PRIORITY_LABELS[project.priority] : null,
        ddlLabel(project.ddl || null, project.status || 'active'),
        `${openTasks.length} 任务`,
      ].filter(Boolean).join(' · '),
      size: Math.min(26, 18 + openTasks.length * 1.3 + blockedTasks.length * 1.5),
      urgency: blockedTasks.length > 0
        ? 'urg-blocked'
        : urgencyClass(project.ddl || null, project.status || 'active'),
      sortValue: openTasks.length + blockedTasks.length * 2,
      rankIndex: 0,
      rankCount: 1,
    })
  }

  for (const task of tasks) {
    const status = task.status || 'todo'
    const deadline = taskDeadline(task)
    const assigneeCount = getTaskAssigneeIds(task).length
    nodes.push({
      id: `task:${task.id}`,
      refId: task.id,
      kind: 'task' as const,
      label: task.title || '未命名任务',
      subtitle: [
        STATUS_LABELS[status],
        task.priority ? PRIORITY_LABELS[task.priority] : null,
        deadline ? ddlLabel(deadline, status === 'done' ? 'completed' : 'active') : null,
        task.estimatedHours ? `${task.estimatedHours}h` : null,
      ].filter(Boolean).join(' · '),
      size: Math.min(20, 13 + (task.estimatedHours || 0) * 0.25 + (assigneeCount === 0 && status !== 'done' ? 2 : 0)),
      urgency: taskUrgency(task),
      sortValue: (task.estimatedHours || 0) + assigneeCount * 2,
      rankIndex: 0,
      rankCount: 1,
    })

    if (task.projectId) {
      edges.push({
        id: `project-task:${task.projectId}:${task.id}`,
        source: `project:${task.projectId}`,
        target: `task:${task.id}`,
        kind: 'project-task' as const,
      })
    }

    for (const personId of getTaskAssigneeIds(task)) {
      edges.push({
        id: `task-person:${task.id}:${personId}`,
        source: `task:${task.id}`,
        target: `person:${personId}`,
        kind: 'task-person' as const,
      })
    }
  }

  for (const person of people) {
    const personTasks = (tasksByPersonId.get(person.id) || []).filter((task) => (task.status || 'todo') !== 'done')
    const blockedTasks = personTasks.filter((task) => task.status === 'blocked')
    const estimatedHours = personTasks.reduce((sum, task) => sum + (Number(task.estimatedHours) || 0), 0)
    nodes.push({
      id: `person:${person.id}`,
      refId: person.id,
      kind: 'person' as const,
      label: person.name || '未命名成员',
      subtitle: person.status === 'inactive'
        ? '已停用'
        : `${personTasks.length} 任务 · ${estimatedHours || 0}h`,
      size: Math.min(21, 13 + personTasks.length * 1.2 + estimatedHours * 0.12),
      urgency: person.status === 'inactive'
        ? 'urg-done'
        : blockedTasks.length > 0 ? 'urg-blocked' : personTasks.length > 0 ? 'urg-active' : '',
      sortValue: personTasks.length,
      rankIndex: 0,
      rankCount: 1,
    })
  }

  applyRankIndexes(nodes)

  return { nodes, edges }
}

import { getTaskAssigneeIds, type LegacyPerson, type LegacyProject, type LegacyTask } from '../../legacy/store'
import { urgencyClass, STATUS_LABELS, PRIORITY_LABELS } from '../../legacy/utils'
import { type GraphData } from './graphTypes'

export function buildGraphData(
  projects: LegacyProject[],
  tasks: LegacyTask[],
  people: LegacyPerson[],
): GraphData {
  const nodes = []
  const edges = []

  for (const project of projects) {
    nodes.push({
      id: `project:${project.id}`,
      refId: project.id,
      kind: 'project' as const,
      label: project.name || '未命名项目',
      subtitle: [
        STATUS_LABELS[project.status || 'active'],
        project.priority ? PRIORITY_LABELS[project.priority] : null,
      ].filter(Boolean).join(' · '),
      size: 18,
      urgency: urgencyClass(project.ddl || null, project.status || 'active'),
    })
  }

  for (const task of tasks) {
    const status = task.status || 'todo'
    const taskUrgency = status === 'done' ? 'urg-done'
      : status === 'blocked' ? 'urg-blocked'
      : status === 'in-progress' ? 'urg-active'
      : ''
    nodes.push({
      id: `task:${task.id}`,
      refId: task.id,
      kind: 'task' as const,
      label: task.title || '未命名任务',
      subtitle: [
        STATUS_LABELS[status],
        task.priority ? PRIORITY_LABELS[task.priority] : null,
        task.estimatedHours ? `${task.estimatedHours}h` : null,
      ].filter(Boolean).join(' · '),
      size: 14,
      urgency: taskUrgency,
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
    nodes.push({
      id: `person:${person.id}`,
      refId: person.id,
      kind: 'person' as const,
      label: person.name || '未命名成员',
      subtitle: (person.skills || []).slice(0, 3).join(' · ') || (person.status === 'inactive' ? '已停用' : '在职'),
      size: 13,
      urgency: person.status === 'inactive' ? 'urg-done' : '',
    })
  }

  return { nodes, edges }
}

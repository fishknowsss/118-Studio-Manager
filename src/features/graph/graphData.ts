import { getTaskAssigneeIds, type LegacyPerson, type LegacyProject, type LegacyTask } from '../../legacy/store'
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
      subtitle: project.status ? `状态：${project.status}` : '项目',
      size: 16,
    })
  }

  for (const task of tasks) {
    nodes.push({
      id: `task:${task.id}`,
      refId: task.id,
      kind: 'task' as const,
      label: task.title || '未命名任务',
      subtitle: task.status ? `状态：${task.status}` : '任务',
      size: 12,
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
      subtitle: (person.skills || []).slice(0, 2).join(' / ') || '人员',
      size: 11,
    })
  }

  return { nodes, edges }
}

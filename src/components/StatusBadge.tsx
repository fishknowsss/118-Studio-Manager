import { Badge } from './Badge'
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS, TASK_STATUS_LABELS, TASK_STATUS_COLORS } from '../constants'
import type { ProjectStatus } from '../types/project'
import type { TaskStatus } from '../types/task'

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  return <Badge className={PROJECT_STATUS_COLORS[status]}>{PROJECT_STATUS_LABELS[status]}</Badge>
}

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  return <Badge className={TASK_STATUS_COLORS[status]}>{TASK_STATUS_LABELS[status]}</Badge>
}

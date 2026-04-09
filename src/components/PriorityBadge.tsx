import { Badge } from './Badge'
import { PRIORITY_LABELS, PRIORITY_COLORS } from '../constants'
import type { ProjectPriority } from '../types/project'
import type { TaskPriority } from '../types/task'

export function PriorityBadge({ priority }: { priority: ProjectPriority | TaskPriority }) {
  return <Badge className={PRIORITY_COLORS[priority]}>{PRIORITY_LABELS[priority]}</Badge>
}

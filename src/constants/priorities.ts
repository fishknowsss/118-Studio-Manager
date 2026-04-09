import type { ProjectPriority } from '../types/project'
import type { TaskPriority } from '../types/task'

type Priority = ProjectPriority | TaskPriority

export const PRIORITY_LABELS: Record<Priority, string> = {
  high: '高',
  medium: '中',
  low: '低',
}

export const PRIORITY_COLORS: Record<Priority, string> = {
  high: 'text-danger bg-danger/10',
  medium: 'text-warning bg-warning/10',
  low: 'text-accent-sage bg-accent-sage/10',
}

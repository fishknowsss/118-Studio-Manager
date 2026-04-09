import type { ProjectStatus } from '../types/project'
import type { TaskStatus } from '../types/task'
import type { AssignmentStatus } from '../types/assignment'

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  not_started: '未开始',
  in_progress: '进行中',
  waiting_feedback: '等待反馈',
  paused: '已暂停',
  completed: '已完成',
}

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: '待办',
  in_progress: '进行中',
  blocked: '受阻',
  completed: '已完成',
}

export const ASSIGNMENT_STATUS_LABELS: Record<AssignmentStatus, string> = {
  assigned: '已分配',
  in_progress: '进行中',
  done: '已完成',
  cancelled: '已取消',
}

export const PROJECT_STATUS_COLORS: Record<ProjectStatus, string> = {
  not_started: 'text-text-secondary bg-gray-100',
  in_progress: 'text-primary bg-primary/10',
  waiting_feedback: 'text-warning bg-warning/10',
  paused: 'text-text-muted bg-gray-100',
  completed: 'text-accent-teal bg-accent-teal/10',
}

export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  todo: 'text-text-secondary bg-gray-100',
  in_progress: 'text-primary bg-primary/10',
  blocked: 'text-danger bg-danger/10',
  completed: 'text-accent-teal bg-accent-teal/10',
}

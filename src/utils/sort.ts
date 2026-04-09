import { isOverdue } from './date'
import type { ProjectPriority, ProjectStatus } from '../types/project'
import type { TaskPriority, TaskStatus } from '../types/task'

const priorityRank: Record<ProjectPriority | TaskPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
}

const projectStatusRank: Record<ProjectStatus, number> = {
  in_progress: 0,
  waiting_feedback: 1,
  not_started: 2,
  paused: 3,
  completed: 4,
}

const taskStatusRank: Record<TaskStatus, number> = {
  in_progress: 0,
  blocked: 1,
  todo: 2,
  completed: 3,
}

export function comparePriority(a: ProjectPriority | TaskPriority, b: ProjectPriority | TaskPriority): number {
  return priorityRank[a] - priorityRank[b]
}

export function compareProjectStatus(a: ProjectStatus, b: ProjectStatus): number {
  return projectStatusRank[a] - projectStatusRank[b]
}

export function compareTaskStatus(a: TaskStatus, b: TaskStatus): number {
  return taskStatusRank[a] - taskStatusRank[b]
}

export function compareDate(a?: string, b?: string): number {
  if (a && b) return a.localeCompare(b)
  if (a) return -1
  if (b) return 1
  return 0
}

export function compareProjectUrgency(
  a: { deadline: string; status: ProjectStatus; priority: ProjectPriority; updatedAt: string },
  b: { deadline: string; status: ProjectStatus; priority: ProjectPriority; updatedAt: string },
): number {
  const aOverdue = isOverdue(a.deadline) && a.status !== 'completed'
  const bOverdue = isOverdue(b.deadline) && b.status !== 'completed'
  if (aOverdue !== bOverdue) return aOverdue ? -1 : 1

  const completionDiff = Number(a.status === 'completed') - Number(b.status === 'completed')
  if (completionDiff !== 0) return completionDiff

  const deadlineDiff = compareDate(a.deadline, b.deadline)
  if (deadlineDiff !== 0) return deadlineDiff

  const priorityDiff = comparePriority(a.priority, b.priority)
  if (priorityDiff !== 0) return priorityDiff

  const statusDiff = compareProjectStatus(a.status, b.status)
  if (statusDiff !== 0) return statusDiff

  return b.updatedAt.localeCompare(a.updatedAt)
}

export function compareTaskUrgency(
  a: { dueDate: string; status: TaskStatus; priority: TaskPriority; updatedAt: string },
  b: { dueDate: string; status: TaskStatus; priority: TaskPriority; updatedAt: string },
): number {
  const aOverdue = Boolean(a.dueDate) && isOverdue(a.dueDate) && a.status !== 'completed'
  const bOverdue = Boolean(b.dueDate) && isOverdue(b.dueDate) && b.status !== 'completed'
  if (aOverdue !== bOverdue) return aOverdue ? -1 : 1

  const completionDiff = Number(a.status === 'completed') - Number(b.status === 'completed')
  if (completionDiff !== 0) return completionDiff

  const priorityDiff = comparePriority(a.priority, b.priority)
  if (priorityDiff !== 0) return priorityDiff

  const statusDiff = compareTaskStatus(a.status, b.status)
  if (statusDiff !== 0) return statusDiff

  const dueDateDiff = compareDate(a.dueDate, b.dueDate)
  if (dueDateDiff !== 0) return dueDateDiff

  return b.updatedAt.localeCompare(a.updatedAt)
}

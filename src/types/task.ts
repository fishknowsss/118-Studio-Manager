export type TaskStatus = 'todo' | 'in_progress' | 'blocked' | 'completed'
export type TaskPriority = 'high' | 'medium' | 'low'

export interface Task {
  id: string
  projectId: string
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  stage: string
  startDate: string
  dueDate: string
  estimatedHours: number
  createdAt: string
  updatedAt: string
}

export type TaskInput = Omit<Task, 'id' | 'createdAt' | 'updatedAt'>

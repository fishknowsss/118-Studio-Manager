export type ProjectStatus = 'not_started' | 'in_progress' | 'waiting_feedback' | 'paused' | 'completed'
export type ProjectPriority = 'high' | 'medium' | 'low'

export interface Project {
  id: string
  name: string
  type: string
  description: string
  startDate: string
  deadline: string
  status: ProjectStatus
  priority: ProjectPriority
  color: string
  clientOrSource: string
  createdAt: string
  updatedAt: string
}

export type ProjectInput = Omit<Project, 'id' | 'createdAt' | 'updatedAt'>

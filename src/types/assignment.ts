export type AssignmentStatus = 'assigned' | 'in_progress' | 'done' | 'cancelled'

export interface Assignment {
  id: string
  date: string
  personId: string
  taskId: string
  projectId: string
  assignmentStatus: AssignmentStatus
  note: string
  createdAt: string
  updatedAt: string
}

export type AssignmentInput = Omit<Assignment, 'id' | 'createdAt' | 'updatedAt'>

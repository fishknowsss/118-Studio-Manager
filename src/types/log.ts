export type LogType = 'create' | 'update' | 'delete' | 'assign' | 'unassign' | 'import' | 'export'
export type TargetType = 'project' | 'person' | 'task' | 'milestone' | 'assignment' | 'system'

export interface Log {
  id: string
  type: LogType
  targetType: TargetType
  targetId: string
  message: string
  createdAt: string
}

import type { DragEvent, ReactNode } from 'react'
import { PersonGenderAvatar } from '../../components/ui/PersonGenderAvatar'

export function PlannerDropZone({
  children,
  count,
  gender,
  isDragOver,
  name,
  onDragLeave,
  onDragOver,
  onDrop,
}: {
  children?: ReactNode
  count: number
  gender?: string | null
  isDragOver: boolean
  name: string
  onDragLeave: () => void
  onDragOver: (event: DragEvent<HTMLDivElement>) => void
  onDrop: (event: DragEvent<HTMLDivElement>) => void
}) {
  return (
    <div>
      <div
        className={`planner-person-row ${isDragOver ? 'drop-target' : ''}`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <PersonGenderAvatar className="planner-person-avatar" gender={gender} />
        <div className="planner-person-name">{name}</div>
        <span className="planner-person-count">{count} 个任务</span>
      </div>
      <div className="planner-tasks-of-person">{children}</div>
    </div>
  )
}

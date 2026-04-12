import type { DragEvent, ReactNode } from 'react'
import { initials } from '../../legacy/utils'

export function PlannerDropZone({
  children,
  count,
  isDragOver,
  name,
  onDragLeave,
  onDragOver,
  onDrop,
}: {
  children?: ReactNode
  count: number
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
        <div className="avatar sm">{initials(name || '')}</div>
        <div className="planner-person-name">{name}</div>
        <span className="planner-person-count">{count} 个任务</span>
      </div>
      <div className="planner-tasks-of-person">{children}</div>
    </div>
  )
}

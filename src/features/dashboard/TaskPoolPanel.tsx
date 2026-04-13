import type { DragEvent } from 'react'
import type { LegacyPerson, LegacyProject, LegacyTask } from '../../legacy/store'
import { formatDate, initials, today } from '../../legacy/utils'

export function TaskPoolPanel({
  dragOverTaskId,
  draggingPersonId,
  onDragLeaveTask,
  onDragOverTask,
  onDropToTask,
  onExpand,
  onTaskDragEnd,
  onTaskDragStart,
  tasks,
}: {
  dragOverTaskId: string | null
  draggingPersonId: string | null
  onDragLeaveTask: () => void
  onDragOverTask: (event: DragEvent<HTMLDivElement>, taskId: string) => void
  onDropToTask: (event: DragEvent<HTMLDivElement>, taskId: string) => void
  onExpand: (x: number, y: number) => void
  onTaskDragEnd: () => void
  onTaskDragStart: (event: DragEvent<HTMLDivElement>, taskId: string) => void
  tasks: Array<LegacyTask & { person?: LegacyPerson | null; project?: LegacyProject | null }>
}) {
  return (
    <div className="panel">
      <div className="panel-header panel-header--expandable" onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); onExpand(r.left + r.width / 2, r.top + r.height / 2) }}>
        <span className="panel-title">任务池</span>
        <span className="panel-action">展开全部</span>
      </div>
      <div className="panel-body">
        {tasks.length === 0 ? (
          <div className="empty-state"><div className="empty-text">暂无待处理任务</div></div>
        ) : (
          tasks.map((task) => {
            const isOverdue = task.endDate && task.endDate < today() && task.status !== 'done'
            const isDropTarget = Boolean(draggingPersonId) && dragOverTaskId === task.id
            return (
              <div
                key={task.id}
                className={`task-row ${isDropTarget ? 'drop-target' : ''}`}
                draggable
                onDragEnd={onTaskDragEnd}
                onDragLeave={onDragLeaveTask}
                onDragOver={(event) => onDragOverTask(event, task.id)}
                onDragStart={(event) => onTaskDragStart(event, task.id)}
                onDrop={(event) => onDropToTask(event, task.id)}
              >
                <div className={`prio-dot ${task.priority || 'medium'}`}></div>
                <span className="task-title-text">{task.title}</span>
                {task.project ? <span className="task-proj-tag">{task.project.name}</span> : null}
                {task.person ? <span className="task-assignee-tag">{initials(task.person.name || '')}</span> : null}
                {isOverdue ? <span className="date-chip overdue">{formatDate(task.endDate || null)}</span> : null}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

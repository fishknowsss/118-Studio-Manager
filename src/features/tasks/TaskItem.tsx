import type React from 'react'
import type { TaskListItemModel } from '../../legacy/selectors'

type TaskMenuType = 'assignee' | 'priority' | 'status'

export function TaskItem({
  model,
  onDelete,
  onEdit,
  onMenu,
  onToggle,
}: {
  model: TaskListItemModel
  onDelete: () => void
  onEdit: () => void
  onMenu: (event: React.MouseEvent, type: TaskMenuType) => void
  onToggle: () => void
}) {
  return (
    <div className={`task-item ${model.isDone ? 'done-row' : ''}`} onClick={onEdit}>
      <button
        className={`task-status-btn ${model.isDone ? 'done' : ''}`}
        type="button"
        onClick={(event) => { event.stopPropagation(); onToggle() }}
        onContextMenu={(event) => onMenu(event, 'status')}
      />
      <div className="task-info">
        <div className="task-title">{model.title}</div>
        <div className="task-sub">
          {model.projectName ? <span>{model.projectName}</span> : null}
          <span className="context-field" onContextMenu={(event) => onMenu(event, 'assignee')}>
            {model.assigneeName === '未分配' ? <span className="text-muted">{model.assigneeName}</span> : model.assigneeName}
          </span>
          {model.estimatedHoursText ? <span>{model.estimatedHoursText}</span> : null}
        </div>
      </div>
      <div className="task-right">
        <button className={`badge badge-${model.priorityKey} context-chip`} type="button" onContextMenu={(event) => onMenu(event, 'priority')}>
          {model.priorityLabel}
        </button>
        {model.dateText ? <span className={`date-chip ${model.isOverdue ? 'overdue' : ''}`}>{model.dateText}</span> : null}
        <button className={`badge badge-${model.statusKey} context-chip`} type="button" onContextMenu={(event) => onMenu(event, 'status')}>
          {model.statusLabel}
        </button>
        <button className="card-btn" type="button" onClick={(event) => { event.stopPropagation(); onEdit() }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
        </button>
        <button className="card-btn danger" type="button" onClick={(event) => { event.stopPropagation(); onDelete() }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></svg>
        </button>
      </div>
    </div>
  )
}

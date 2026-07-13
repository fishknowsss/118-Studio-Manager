import type React from 'react'
import { SquidMark } from '../../components/easter/SquidMark'
import { getSquidVariant, hasSquidAssignee } from '../../components/easter/squidMarkUtils'
import type { TaskListItemModel } from '../../legacy/selectors'

type TaskMenuType = 'assignee' | 'priority' | 'status'

export function TaskItem({
  deleteActionLabel = '删除任务',
  model,
  onDelete,
  onEdit,
  onMenu,
  onToggle,
}: {
  deleteActionLabel?: string
  model: TaskListItemModel
  onDelete: () => void
  onEdit: () => void
  onMenu: (type: TaskMenuType, x: number, y: number) => void
  onToggle: () => void
}) {
  const showSquidMark = hasSquidAssignee(model.assigneeNames)
  const openMenu = (event: React.MouseEvent<HTMLElement>, type: TaskMenuType) => {
    event.preventDefault()
    event.stopPropagation()
    const rect = event.currentTarget.getBoundingClientRect()
    onMenu(
      type,
      event.clientX || rect.left + rect.width / 2,
      event.clientY || rect.top + rect.height / 2,
    )
  }

  return (
    <div className={`task-item ${model.isDone ? 'done-row' : ''}`} onClick={onEdit}>
      {showSquidMark ? <SquidMark className="squid-mark--task-item" variant={getSquidVariant(model.id)} /> : null}
      <button
        className={`task-status-btn ${model.isDone ? 'done' : ''}`}
        type="button"
        aria-label={model.isDone ? '标记为未完成' : '标记为已完成'}
        onClick={(event) => { event.stopPropagation(); onToggle() }}
        onContextMenu={(event) => openMenu(event, 'status')}
      />
      <div className="task-info">
        <div className="task-title">{model.title}</div>
        <div className="task-sub">
          {model.projectName ? <span>{model.projectName}</span> : null}
          <button
            className="context-field"
            type="button"
            aria-label={`更改负责人，当前${model.assigneeNames.length > 0 ? model.assigneeNames.join('、') : '未分配'}`}
            onClick={(event) => openMenu(event, 'assignee')}
            onContextMenu={(event) => openMenu(event, 'assignee')}
          >
            {model.assigneeNames.length === 0
              ? <span className="text-muted">未分配</span>
              : model.assigneeNames.join(' · ')}
          </button>
          {model.estimatedHoursText ? <span>{model.estimatedHoursText}</span> : null}
        </div>
      </div>
      <div className="task-right">
        <button
          className={`badge badge-${model.priorityKey} context-chip`}
          type="button"
          aria-label={`更改优先级，当前${model.priorityLabel}`}
          onClick={(event) => openMenu(event, 'priority')}
          onContextMenu={(event) => openMenu(event, 'priority')}
        >
          {model.priorityLabel}
        </button>
        {model.dateText ? <span className={`date-chip ${model.isOverdue ? 'overdue' : ''}`}>{model.dateText}</span> : null}
        <button
          className={`badge badge-${model.statusKey} context-chip`}
          type="button"
          aria-label={`更改状态，当前${model.statusLabel}`}
          onClick={(event) => openMenu(event, 'status')}
          onContextMenu={(event) => openMenu(event, 'status')}
        >
          {model.statusLabel}
        </button>
        <button className="card-btn" type="button" aria-label="编辑任务" onClick={(event) => { event.stopPropagation(); onEdit() }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
        </button>
        <button className="card-btn danger" type="button" aria-label={deleteActionLabel} onClick={(event) => { event.stopPropagation(); onDelete() }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></svg>
        </button>
      </div>
    </div>
  )
}

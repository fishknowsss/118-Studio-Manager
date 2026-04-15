import { useState } from 'react'
import type { DragEvent, MouseEvent } from 'react'
import type { LegacyPerson, LegacyProject, LegacyTask } from '../../legacy/store'
import { TASK_STATUSES } from '../../legacy/store'
import { ContextMenu, type ContextMenuItem } from '../../components/ui/ContextMenu'
import { TaskDialog } from '../tasks/TaskDialog'
import { deleteTaskWithLog, updateTaskQuickField } from '../../legacy/actions'
import { useLegacyStoreSnapshot } from '../../legacy/useLegacyStore'
import { formatDate, today, STATUS_LABELS } from '../../legacy/utils'
import type { TaskStatus } from '../../legacy/store'

type TaskRow = LegacyTask & { people?: LegacyPerson[]; project?: LegacyProject | null }
type CtxState = { x: number; y: number; task: TaskRow }

function StatusIcon({ status }: { status: string | undefined }) {
  const s = status || 'todo'
  if (s === 'done') return (
    <svg className="pool-status-icon done" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14" aria-label="已完成">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
  if (s === 'in-progress') return (
    <svg className="pool-status-icon in-progress" viewBox="0 0 24 24" fill="currentColor" width="14" height="14" aria-label="进行中">
      <polygon points="5,3 19,12 5,21" />
    </svg>
  )
  if (s === 'blocked') return (
    <svg className="pool-status-icon blocked" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14" aria-label="已阻塞">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
  return (
    <svg className="pool-status-icon todo" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" aria-label="待办">
      <circle cx="12" cy="12" r="9" />
    </svg>
  )
}

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
  tasks: TaskRow[]
}) {
  const snap = useLegacyStoreSnapshot()
  const [ctxMenu, setCtxMenu] = useState<CtxState | null>(null)
  const [editingTask, setEditingTask] = useState<LegacyTask | null | undefined>(undefined)
  const [hideDone, setHideDone] = useState(false)

  const handleCtx = (e: MouseEvent<HTMLDivElement>, task: TaskRow) => {
    e.preventDefault()
    setCtxMenu({ x: e.clientX, y: e.clientY, task })
  }

  const ctxItems: ContextMenuItem[] = ctxMenu
    ? [
        ...TASK_STATUSES.filter((s) => s !== ctxMenu.task.status).map((s) => ({
          key: s,
          label: STATUS_LABELS[s] ?? s,
          onSelect: () => { void updateTaskQuickField(ctxMenu.task.id, { status: s as TaskStatus }) },
        })),
        {
          key: 'edit',
          label: '编辑任务…',
          onSelect: () => {
            const full = snap.tasks.find((t) => t.id === ctxMenu.task.id) ?? null
            setEditingTask(full)
          },
        },
        {
          key: 'delete',
          label: '删除任务',
          tone: 'danger' as const,
          onSelect: () => { void deleteTaskWithLog(ctxMenu.task) },
        },
      ]
    : []

  const formatAssigneeText = (people: LegacyPerson[]) => {
    if (people.length === 0) return '未分配'

    const visibleNames = people
      .slice(0, 3)
      .map((person) => person.name || '未命名')
      .join('、')

    if (people.length <= 3) return visibleNames
    return `${visibleNames} +${people.length - 3}`
  }

  return (
    <div className="panel">
      <div
        className="panel-header panel-header--expandable"
        onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); onExpand(r.left + r.width / 2, r.top + r.height / 2) }}
      >
        <span className="panel-title">任务池</span>
        <button
          className={`pool-hide-done-btn ${hideDone ? 'is-active' : ''}`}
          title={hideDone ? '显示已完成' : '隐藏已完成'}
          onClick={(e) => { e.stopPropagation(); setHideDone((v) => !v) }}
        >
          {hideDone ? (
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
              <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
        <span className="panel-action">展开全部</span>
      </div>
      <div className="panel-body task-pool-body">
        {tasks.length === 0 ? (
          <div className="empty-state"><div className="empty-text">暂无待处理任务</div></div>
        ) : (
          tasks.filter((t) => !hideDone || t.status !== 'done').map((task) => {
            const isOverdue = task.endDate && task.endDate < today() && task.status !== 'done'
            const isDropTarget = Boolean(draggingPersonId) && dragOverTaskId === task.id
            const assignees = task.people ?? []
            return (
              <div
                key={task.id}
                className={`task-row ${task.status === 'done' ? 'done-row' : ''} ${isDropTarget ? 'drop-target' : ''} ${task.priority ? `priority-${task.priority}` : ''}`}
                draggable
                onContextMenu={(e) => handleCtx(e, task)}
                onDragEnd={onTaskDragEnd}
                onDragLeave={onDragLeaveTask}
                onDragOver={(event) => onDragOverTask(event, task.id)}
                onDragStart={(event) => onTaskDragStart(event, task.id)}
                onDrop={(event) => onDropToTask(event, task.id)}
              >
                <StatusIcon status={task.status} />
                <div className="task-row-body">
                  <div className="task-row-main">
                    <span className="task-title-text">{task.title}</span>
                  </div>

                  <div className="task-row-right">
                    <div className="task-row-meta">
                      <span className={`task-meta-chip ${assignees.length === 0 ? 'is-muted' : ''}`}>
                        <span className="task-meta-label">负责人</span>
                        <span className="task-meta-value">{formatAssigneeText(assignees)}</span>
                      </span>

                      {task.project ? (
                        <span className="task-meta-chip">
                          <span className="task-meta-label">项目</span>
                          <span className="task-meta-value">{task.project.name}</span>
                        </span>
                      ) : null}
                    </div>

                    <span
                      className={`task-row-deadline ${task.endDate ? (isOverdue ? 'is-overdue' : '') : 'is-placeholder'}`}
                      aria-label={task.endDate ? `截止 ${formatDate(task.endDate)}` : undefined}
                    >
                      {task.endDate ? formatDate(task.endDate) : '—'}
                    </span>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      <ContextMenu
        open={!!ctxMenu}
        items={ctxItems}
        title={ctxMenu?.task.title}
        x={ctxMenu?.x ?? 0}
        y={ctxMenu?.y ?? 0}
        onClose={() => setCtxMenu(null)}
      />

      {editingTask !== undefined ? (
        <TaskDialog
          task={editingTask}
          people={snap.people}
          projects={snap.projects}
          onClose={() => setEditingTask(undefined)}
        />
      ) : null}
    </div>
  )
}

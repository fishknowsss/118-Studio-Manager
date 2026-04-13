import { useState } from 'react'
import type { DragEvent, MouseEvent } from 'react'
import type { LegacyPerson, LegacyProject, LegacyTask } from '../../legacy/store'
import { TASK_STATUSES } from '../../legacy/store'
import { ContextMenu, type ContextMenuItem } from '../../components/ui/ContextMenu'
import { TaskDialog } from '../tasks/TaskDialog'
import { deleteTaskWithLog, updateTaskQuickField } from '../../legacy/actions'
import { useLegacyStoreSnapshot } from '../../legacy/useLegacyStore'
import { formatDate, initials, today, STATUS_LABELS } from '../../legacy/utils'
import type { TaskStatus } from '../../legacy/store'

type TaskRow = LegacyTask & { people: LegacyPerson[]; project?: LegacyProject | null }
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

  return (
    <div className="panel">
      <div
        className="panel-header panel-header--expandable"
        onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); onExpand(r.left + r.width / 2, r.top + r.height / 2) }}
      >
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
            const visiblePeople = task.people.slice(0, 3)
            const extraPeople = Math.max(0, task.people.length - 3)
            return (
              <div
                key={task.id}
                className={`task-row ${isDropTarget ? 'drop-target' : ''}`}
                draggable
                onContextMenu={(e) => handleCtx(e, task)}
                onDragEnd={onTaskDragEnd}
                onDragLeave={onDragLeaveTask}
                onDragOver={(event) => onDragOverTask(event, task.id)}
                onDragStart={(event) => onTaskDragStart(event, task.id)}
                onDrop={(event) => onDropToTask(event, task.id)}
              >
                <StatusIcon status={task.status} />
                <span className="task-title-text">{task.title}</span>

                <div className="task-pool-meta">
                  {/* 负责人 —— 最重要 */}
                  <div className="task-pool-assignees">
                    {task.people.length === 0 ? (
                      <span className="task-pool-unassigned">未分配</span>
                    ) : (
                      <>
                        {visiblePeople.map((p) => (
                          <span key={p.id} className="task-pool-avatar" title={p.name || ''}>
                            {initials(p.name || '')}
                          </span>
                        ))}
                        {extraPeople > 0 ? (
                          <span className="task-pool-avatar task-pool-avatar-more">+{extraPeople}</span>
                        ) : null}
                      </>
                    )}
                  </div>

                  {/* 所属项目 */}
                  {task.project ? (
                    <span className="task-proj-tag">{task.project.name}</span>
                  ) : null}

                  {/* 逾期日期 */}
                  {isOverdue ? (
                    <span className="date-chip overdue">{formatDate(task.endDate || null)}</span>
                  ) : null}
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

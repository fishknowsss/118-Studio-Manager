import { useEffect, useRef, useState } from 'react'
import type { DragEvent, MouseEvent } from 'react'
import type { LegacyPerson, LegacyProject, LegacyTask } from '../../legacy/store'
import { TASK_STATUSES } from '../../legacy/store'
import { ContextMenu, type ContextMenuItem } from '../../components/ui/ContextMenu'
import { TaskDialog } from '../tasks/TaskDialog'
import { deleteTaskWithLog, updateTaskQuickField } from '../../legacy/actions'
import { useLegacyStoreSnapshot } from '../../legacy/useLegacyStore'
import { formatDate, today, PRIORITY_LABELS, STATUS_LABELS } from '../../legacy/utils'
import type { TaskStatus } from '../../legacy/store'

type TaskRow = LegacyTask & { people?: LegacyPerson[]; project?: LegacyProject | null }
type CtxState = { x: number; y: number; task: TaskRow }
type DetailState = {
  task: TaskRow
  left: number
  originX: number
  originY: number
  top: number
  width: number
}

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
  const panelRef = useRef<HTMLDivElement | null>(null)
  const isTaskDraggingRef = useRef(false)
  const [ctxMenu, setCtxMenu] = useState<CtxState | null>(null)
  const [editingTask, setEditingTask] = useState<LegacyTask | null | undefined>(undefined)
  const [editingFromDetail, setEditingFromDetail] = useState(false)
  const [hideDone, setHideDone] = useState(false)
  const [detailState, setDetailState] = useState<DetailState | null>(null)

  useEffect(() => {
    if (!detailState) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDetailState(null)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [detailState])

  const handleCtx = (e: MouseEvent<HTMLDivElement>, task: TaskRow) => {
    e.preventDefault()
    setCtxMenu({ x: e.clientX, y: e.clientY, task })
  }

  const getTaskDetailPlacement = (row: HTMLElement): Pick<DetailState, 'left' | 'originX' | 'originY' | 'top' | 'width'> => {
    const rect = row.getBoundingClientRect()
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 1280
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 800
    const width = viewportWidth < 520 ? Math.max(304, viewportWidth - 32) : Math.min(560, Math.max(460, viewportWidth - 32))
    const estimatedHeight = Math.min(310, viewportHeight - 112)
    const rowCenterX = rect.left + rect.width / 2
    const rowCenterY = rect.top + rect.height / 2
    const maxLeft = Math.max(16, viewportWidth - width - 16)
    const left = Math.min(Math.max(16, rowCenterX - width / 2), maxLeft)
    const top = Math.min(Math.max(88, rowCenterY - estimatedHeight / 2), Math.max(88, viewportHeight - estimatedHeight - 24))
    const originX = Math.min(Math.max(0, rowCenterX - left), width)
    const originY = Math.min(Math.max(0, rowCenterY - top), estimatedHeight)

    return { left, originX, originY, top, width }
  }

  const toggleTaskDetails = (task: TaskRow, row: HTMLElement) => {
    if (isTaskDraggingRef.current) return
    if (draggingPersonId) return
    setDetailState((current) => {
      if (current?.task.id === task.id) return null
      return { task, ...getTaskDetailPlacement(row) }
    })
  }

  const handleTaskDragStart = (event: DragEvent<HTMLDivElement>, taskId: string) => {
    isTaskDraggingRef.current = true
    onTaskDragStart(event, taskId)
  }

  const handleTaskDragEnd = () => {
    onTaskDragEnd()
    window.setTimeout(() => {
      isTaskDraggingRef.current = false
    }, 0)
  }

  const openDetailTaskEditor = (task: TaskRow) => {
    setDetailState(null)
    setEditingFromDetail(true)
    setEditingTask(task)
  }

  const deleteDetailTask = (task: TaskRow) => {
    setDetailState(null)
    void deleteTaskWithLog(task)
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
    <div className="panel" ref={panelRef}>
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
            const isActive = detailState?.task.id === task.id
            return (
              <div
                key={task.id}
                className={`task-row ${isActive ? 'task-row--active' : ''} ${task.status === 'done' ? 'done-row' : ''} ${isDropTarget ? 'drop-target' : ''} ${task.priority ? `priority-${task.priority}` : ''}`}
                data-task-id={task.id}
                draggable
                onClick={(event) => toggleTaskDetails(task, event.currentTarget)}
                onContextMenu={(e) => handleCtx(e, task)}
                onDragEnd={handleTaskDragEnd}
                onDragLeave={onDragLeaveTask}
                onDragOver={(event) => onDragOverTask(event, task.id)}
                onDragStart={(event) => handleTaskDragStart(event, task.id)}
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

      {detailState ? (
        <div
          className="task-detail-float-layer"
          onClick={() => setDetailState(null)}
          onPointerDown={(event) => {
            event.preventDefault()
            event.stopPropagation()
          }}
        >
          <div
            className={`task-detail-card ${detailState.task.priority ? `priority-${detailState.task.priority}` : ''}`}
            style={{
              left: detailState.left,
              top: detailState.top,
              transformOrigin: `${detailState.originX}px ${detailState.originY}px`,
              width: detailState.width,
            }}
            onClick={(event) => {
              event.stopPropagation()
              setDetailState(null)
            }}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <div className="task-detail-card-header">
              <div className="task-detail-card-title">
                <span className="task-detail-card-name">{detailState.task.title || '未命名任务'}</span>
                <span className="task-detail-card-project">{detailState.task.project?.name || '未关联项目'}</span>
              </div>
              <div className="task-detail-card-actions">
                <button
                  className="task-detail-card-action"
                  type="button"
                  aria-label="编辑任务"
                  onClick={(event) => {
                    event.stopPropagation()
                    openDetailTaskEditor(detailState.task)
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                  </svg>
                </button>
                <button
                  className="task-detail-card-action is-danger"
                  type="button"
                  aria-label="删除任务"
                  onClick={(event) => {
                    event.stopPropagation()
                    deleteDetailTask(detailState.task)
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M3 6h18" />
                    <path d="M8 6V4h8v2" />
                    <path d="M19 6l-1 14H6L5 6" />
                    <path d="M10 11v5" />
                    <path d="M14 11v5" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="task-detail-card-status">
              <span>{STATUS_LABELS[detailState.task.status || 'todo'] ?? detailState.task.status ?? '待处理'}</span>
              <span>{PRIORITY_LABELS[detailState.task.priority || 'medium'] ?? detailState.task.priority ?? '中'}</span>
              <span>{detailState.task.endDate ? `截止 ${formatDate(detailState.task.endDate)}` : '未设截止'}</span>
            </div>

            <div className="task-detail-card-meta">
              <span><b>负责人</b>{formatAssigneeText(detailState.task.people ?? [])}</span>
              <span><b>工时</b>{detailState.task.estimatedHours ? `${detailState.task.estimatedHours} 小时` : '未填写'}</span>
            </div>

            <div className="task-detail-card-description">
              {detailState.task.description?.trim() || '还没有填写描述'}
            </div>
          </div>
        </div>
      ) : null}

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
          className={editingFromDetail ? 'task-dialog-from-detail' : undefined}
          onClose={() => {
            setEditingTask(undefined)
            setEditingFromDetail(false)
          }}
        />
      ) : null}
    </div>
  )
}

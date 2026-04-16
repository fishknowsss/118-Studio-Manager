import { useMemo, useState } from 'react'
import { useConfirm } from '../../components/feedback/ConfirmProvider'
import { useToast } from '../../components/feedback/ToastProvider'
import { TaskItem } from '../tasks/TaskItem'
import { TaskDialog } from '../tasks/TaskDialog'
import { deleteTaskWithLog, toggleTaskStatus, updateTaskQuickField } from '../../legacy/actions'
import { buildTaskListItemModels } from '../../legacy/selectors'
import { useLegacyStoreSnapshot } from '../../legacy/useLegacyStore'
import { ddlLabel, today, PRIORITY_LABELS, STATUS_LABELS } from '../../legacy/utils'
import type { LegacyTask, TaskPriority, TaskStatus } from '../../legacy/store'
import { PROJECT_PRIORITIES, TASK_STATUSES, getTaskAssigneeIds } from '../../legacy/store'
import { ContextMenu, type ContextMenuItem } from '../../components/ui/ContextMenu'

type TaskMenuState =
  | { taskId: string; type: 'assignee'; x: number; y: number }
  | { taskId: string; type: 'priority'; x: number; y: number }
  | { taskId: string; type: 'status'; x: number; y: number }

export function ProjectDetailPanel({ projectId }: { projectId: string }) {
  const snap = useLegacyStoreSnapshot()
  const { confirm } = useConfirm()
  const { toast } = useToast()
  const [editingTask, setEditingTask] = useState<LegacyTask | null | undefined>(undefined)
  const [contextMenu, setContextMenu] = useState<TaskMenuState | null>(null)

  const project = snap.projects.find((p) => p.id === projectId)
  const todayStr = today()

  const projectTasks = useMemo(
    () => snap.tasks.filter((t) => t.projectId === projectId),
    [snap.tasks, projectId],
  )

  const taskItems = useMemo(
    () => buildTaskListItemModels(projectTasks, snap.projects, snap.people, todayStr),
    [projectTasks, snap.projects, snap.people, todayStr],
  )

  const activePeople = useMemo(
    () => snap.people.filter((p) => p.status === 'active'),
    [snap.people],
  )

  const contextItems = useMemo<ContextMenuItem[]>(() => {
    if (!contextMenu) return []

    if (contextMenu.type === 'status') {
      return TASK_STATUSES.map((status) => ({
        key: status,
        label: STATUS_LABELS[status],
        onSelect: () => {
          void updateTaskQuickField(contextMenu.taskId, { status: status as TaskStatus }).then((updated) => {
            if (updated) toast('已更新', 'success')
          })
        },
      }))
    }

    if (contextMenu.type === 'priority') {
      return PROJECT_PRIORITIES.map((priority) => ({
        key: priority,
        label: PRIORITY_LABELS[priority],
        onSelect: () => {
          void updateTaskQuickField(contextMenu.taskId, { priority: priority as TaskPriority }).then((updated) => {
            if (updated) toast('已更新', 'success')
          })
        },
      }))
    }

    const currentTask = snap.tasks.find((t) => t.id === contextMenu.taskId)
    const currentIds = currentTask ? getTaskAssigneeIds(currentTask) : []
    return [
      {
        key: '__clear',
        label: '清除全部负责人',
        onSelect: () => {
          void updateTaskQuickField(contextMenu.taskId, { assigneeIds: [] }).then((u) => { if (u) toast('已更新', 'success') })
        },
      },
      ...activePeople.map((person) => {
        const assigned = currentIds.includes(person.id)
        return {
          key: person.id,
          label: `${assigned ? '✓ ' : ''}${person.name || '未命名人员'}`,
          onSelect: () => {
            const next = assigned ? currentIds.filter((id) => id !== person.id) : [...currentIds, person.id]
            void updateTaskQuickField(contextMenu.taskId, { assigneeIds: next }).then((u) => { if (u) toast('已更新', 'success') })
          },
        }
      }),
    ]
  }, [activePeople, contextMenu, snap.tasks, toast])

  const handleToggle = async (task: LegacyTask) => {
    const updated = await toggleTaskStatus(task)
    toast(updated.status === 'done' ? '任务已完成' : '任务已重开', 'success')
  }

  const handleDelete = async (task: LegacyTask) => {
    const ok = await confirm('删除任务', `确认删除「${task.title}」？此操作不可撤销。`)
    if (!ok) return
    await deleteTaskWithLog(task)
    toast('已删除', 'error')
  }

  if (!project) return <div className="empty-state">项目不存在</div>

  const statusKey = project.status || 'active'
  const priorityKey = project.priority || 'medium'
  const ddl = ddlLabel(project.ddl || null, statusKey)

  return (
    <div className="project-detail-panel">
      {/* Meta */}
      <div className="pdp-meta">
        <span className={`badge badge-${statusKey}`}>{STATUS_LABELS[statusKey]}</span>
        <span className={`badge badge-${priorityKey}`}>{PRIORITY_LABELS[priorityKey]}</span>
        <span className="date-chip">{ddl}</span>
      </div>

      {/* Description */}
      {project.description ? <p className="pdp-desc">{project.description}</p> : null}

      {/* Tasks */}
      <div className="pdp-section">
        <div className="pdp-section-title">
          任务 · {projectTasks.filter((t) => t.status !== 'done').length} 未完成 / 共 {projectTasks.length}
        </div>
        {taskItems.length === 0 ? (
          <div className="empty-state"><div className="empty-text">该项目暂无任务</div></div>
        ) : (
          taskItems.map((task) => (
            <TaskItem
              key={task.id}
              model={task}
              onEdit={() => {
                const t = projectTasks.find((x) => x.id === task.id)
                if (t) setEditingTask(t)
              }}
              onDelete={() => {
                const t = projectTasks.find((x) => x.id === task.id)
                if (t) void handleDelete(t)
              }}
              onMenu={(event, type) => {
                event.preventDefault()
                setContextMenu({ taskId: task.id, type, x: event.clientX, y: event.clientY })
              }}
              onToggle={() => {
                const t = projectTasks.find((x) => x.id === task.id)
                if (t) void handleToggle(t)
              }}
            />
          ))
        )}
      </div>

      <ContextMenu
        open={Boolean(contextMenu)}
        x={contextMenu?.x || 0}
        y={contextMenu?.y || 0}
        title="快速更新"
        items={contextItems}
        onClose={() => setContextMenu(null)}
      />

      {editingTask !== undefined ? (
        <TaskDialog
          task={editingTask}
          projects={snap.projects}
          people={snap.people}
          onClose={() => setEditingTask(undefined)}
        />
      ) : null}
    </div>
  )
}

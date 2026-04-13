import { useMemo, useState } from 'react'
import { useConfirm } from '../components/feedback/ConfirmProvider'
import { useToast } from '../components/feedback/ToastProvider'
import { ContextMenu, type ContextMenuItem } from '../components/ui/ContextMenu'
import { TaskDialog } from '../features/tasks/TaskDialog'
import { TaskItem } from '../features/tasks/TaskItem'
import {
  deleteTaskWithLog,
  toggleTaskStatus,
  updateTaskQuickField,
} from '../legacy/actions'
import { buildTaskListItemModels, getActivePeople, getFilteredTasks } from '../legacy/selectors'
import {
  PROJECT_PRIORITIES,
  TASK_STATUSES,
  type LegacyTask,
  type TaskPriority,
  type TaskStatus,
  getTaskAssigneeIds,
} from '../legacy/store'
import { PRIORITY_LABELS, STATUS_LABELS, today } from '../legacy/utils'
import { useLegacyStoreSnapshot } from '../legacy/useLegacyStore'

type TaskMenuState =
  | { taskId: string; type: 'assignee'; x: number; y: number }
  | { taskId: string; type: 'priority'; x: number; y: number }
  | { taskId: string; type: 'status'; x: number; y: number }

export function Tasks() {
  const store = useLegacyStoreSnapshot()
  const { tasks, projects, people } = store

  const [search, setSearch] = useState('')
  const [projFilter, setProjFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [assigneeFilter, setAssigneeFilter] = useState('')
  const [contextMenu, setContextMenu] = useState<TaskMenuState | null>(null)
  const [editingTask, setEditingTask] = useState<LegacyTask | null | undefined>(undefined)
  const { confirm } = useConfirm()
  const { toast } = useToast()
  const activePeople = useMemo(() => getActivePeople(people), [people])
  const todayStr = today()
  const filteredTasks = useMemo(() => getFilteredTasks(tasks, {
    assigneeFilter,
    projFilter,
    search,
    statusFilter,
  }), [assigneeFilter, projFilter, search, statusFilter, tasks])
  const taskItems = useMemo(() => buildTaskListItemModels(filteredTasks, projects, people, todayStr), [filteredTasks, people, projects, todayStr])

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

    const currentTask = tasks.find((t) => t.id === contextMenu.taskId)
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
  }, [activePeople, contextMenu, tasks, toast])

  const handleDeleteTask = async (task: LegacyTask) => {
    const ok = await confirm('删除任务', `确认删除「${task.title}」？此操作不可撤销。`)
    if (!ok) return
    await deleteTaskWithLog(task)
    toast('已删除', 'error')
  }

  const handleToggleStatus = async (task: LegacyTask) => {
    const updated = await toggleTaskStatus(task)
    toast(updated.status === 'done' ? '任务已完成' : '任务已重开', 'success')
  }

  return (
    <div className="view-tasks fade-in">
      <div className="view-header">
        <h1 className="view-title">任务管理</h1>
        <div className="view-actions">
          <div className="filter-bar">
            <input
              className="filter-input"
              placeholder="搜索任务…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <select className="filter-select" value={projFilter} onChange={(event) => setProjFilter(event.target.value)}>
              <option value="">全部项目</option>
              {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
            <select className="filter-select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="">全部状态</option>
              {TASK_STATUSES.map((status) => (
                <option key={status} value={status}>{STATUS_LABELS[status]}</option>
              ))}
            </select>
            <select className="filter-select" value={assigneeFilter} onChange={(event) => setAssigneeFilter(event.target.value)}>
              <option value="">全部人员</option>
              {activePeople.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
            </select>
          </div>
          <button className="btn btn-primary" type="button" onClick={() => setEditingTask(null)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            新建任务
          </button>
        </div>
      </div>

      <div className="view-body">
        <div className="tasks-list">
          {filteredTasks.length === 0 ? (
            <div className="no-results">先创建一个任务，或调整筛选条件</div>
          ) : (
            taskItems.map((task) => (
              <TaskItem
                key={task.id}
                model={task}
                onDelete={() => {
                  const target = filteredTasks.find((item) => item.id === task.id)
                  if (target) void handleDeleteTask(target)
                }}
                onEdit={() => setEditingTask(filteredTasks.find((item) => item.id === task.id) || null)}
                onMenu={(event, type) => {
                  event.preventDefault()
                  setContextMenu({ taskId: task.id, type, x: event.clientX, y: event.clientY })
                }}
                onToggle={() => {
                  const target = filteredTasks.find((item) => item.id === task.id)
                  if (target) void handleToggleStatus(target)
                }}
              />
            ))
          )}
        </div>
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
        <TaskDialog task={editingTask} projects={projects} people={people} onClose={() => setEditingTask(undefined)} />
      ) : null}
    </div>
  )
}

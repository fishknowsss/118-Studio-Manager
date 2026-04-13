import { useMemo, useState } from 'react'
import { useConfirm } from '../../components/feedback/ConfirmProvider'
import { useToast } from '../../components/feedback/ToastProvider'
import { PersonDialog } from '../people/PersonDialog'
import { ContextMenu, type ContextMenuItem } from '../../components/ui/ContextMenu'
import { deleteTaskWithLog, toggleTaskStatus, updateTaskQuickField } from '../../legacy/actions'
import { buildTaskListItemModels } from '../../legacy/selectors'
import { useLegacyStoreSnapshot } from '../../legacy/useLegacyStore'
import { initials, today, STATUS_LABELS, PRIORITY_LABELS } from '../../legacy/utils'
import { TASK_STATUSES, PROJECT_PRIORITIES, type LegacyTask, type TaskStatus, type TaskPriority, getTaskAssigneeIds } from '../../legacy/store'
import { TaskItem } from '../tasks/TaskItem'
import { TaskDialog } from '../tasks/TaskDialog'

type TaskMenuState =
  | { taskId: string; type: 'status'; x: number; y: number }
  | { taskId: string; type: 'priority'; x: number; y: number }
  | { taskId: string; type: 'assignee'; x: number; y: number }

export function PersonDetailPanel({ personId }: { personId: string }) {
  const snap = useLegacyStoreSnapshot()
  const { confirm } = useConfirm()
  const { toast } = useToast()
  const [showEdit, setShowEdit] = useState(false)
  const [editingTask, setEditingTask] = useState<LegacyTask | null | undefined>(undefined)
  const [contextMenu, setContextMenu] = useState<TaskMenuState | null>(null)

  const person = snap.people.find((p) => p.id === personId)
  const todayStr = today()

  const personTasks = useMemo(
    () => snap.tasks.filter((t) => getTaskAssigneeIds(t).includes(personId)),
    [snap.tasks, personId],
  )

  const taskItems = useMemo(
    () => buildTaskListItemModels(personTasks, snap.projects, snap.people, todayStr),
    [personTasks, snap.projects, snap.people, todayStr],
  )

  const contextItems = useMemo<ContextMenuItem[]>(() => {
    if (!contextMenu) return []
    if (contextMenu.type === 'status') {
      return TASK_STATUSES.map((s) => ({
        key: s,
        label: STATUS_LABELS[s],
        onSelect: () => {
          void updateTaskQuickField(contextMenu.taskId, { status: s as TaskStatus }).then((u) => { if (u) toast('已更新', 'success') })
        },
      }))
    }
    if (contextMenu.type === 'priority') {
      return PROJECT_PRIORITIES.map((p) => ({
        key: p,
        label: PRIORITY_LABELS[p],
        onSelect: () => {
          void updateTaskQuickField(contextMenu.taskId, { priority: p as TaskPriority }).then((u) => { if (u) toast('已更新', 'success') })
        },
      }))
    }
    return []
  }, [contextMenu, toast])

  if (!person) return <div className="text-muted text-sm" style={{ padding: 24 }}>成员不存在</div>

  const skills = person.skills || []
  const genderLabel = person.gender === 'male' ? '男' : person.gender === 'female' ? '女' : person.gender === 'other' ? '其他' : ''
  const statusLabel = person.status === 'inactive' ? '已停用' : '在职'

  const doneTasks = taskItems.filter((t) => t.isDone)
  const activeTasks = taskItems.filter((t) => !t.isDone)

  return (
    <div className="person-detail-panel">
      {/* 顶部信息 */}
      <div className="pdp-top">
        <div className="pdp-avatar">{initials(person.name || '')}</div>
        <div className="pdp-info">
          <div className="pdp-name">{person.name || '未命名成员'}</div>
          <div className="pdp-meta-row">
            <span className={`badge badge-${person.status === 'inactive' ? 'cancelled' : 'active'}`}>{statusLabel}</span>
            {genderLabel ? <span className="pdp-gender">{genderLabel}</span> : null}
          </div>
          {skills.length > 0 ? (
            <div className="pdp-skills">
              {skills.map((s, i) => <span key={i} className="skill-tag">{s}</span>)}
            </div>
          ) : null}
          {person.notes ? <div className="pdp-notes">{person.notes}</div> : null}
        </div>
        <button className="btn btn-secondary btn-sm" type="button" onClick={() => setShowEdit(true)}>编辑</button>
      </div>

      {/* 任务列表 */}
      <div className="pdp-tasks-section">
        <div className="pdp-section-title">进行中任务 · {activeTasks.length}</div>
        {activeTasks.length === 0 ? (
          <div className="text-muted text-sm">暂无进行中任务</div>
        ) : (
          activeTasks.map((item) => (
            <TaskItem
              key={item.id}
              model={item}
              onEdit={() => setEditingTask(snap.tasks.find((t) => t.id === item.id) ?? null)}
              onToggle={() => {
                const t = snap.tasks.find((tk) => tk.id === item.id)
                if (t) void toggleTaskStatus(t)
              }}
              onDelete={async () => {
                const t = snap.tasks.find((tk) => tk.id === item.id)
                if (!t) return
                const ok = await confirm('删除任务', `「${t.title}」将被永久删除`)
                if (ok) { void deleteTaskWithLog(t); toast('已删除', 'success') }
              }}
              onMenu={(e, type) => setContextMenu({ taskId: item.id, type, x: e.clientX, y: e.clientY })}
            />
          ))
        )}

        {doneTasks.length > 0 ? (
          <>
            <div className="pdp-section-title" style={{ marginTop: 16 }}>已完成 · {doneTasks.length}</div>
            {doneTasks.map((item) => (
              <TaskItem
                key={item.id}
                model={item}
                onEdit={() => setEditingTask(snap.tasks.find((t) => t.id === item.id) ?? null)}
                onToggle={() => {
                  const t = snap.tasks.find((tk) => tk.id === item.id)
                  if (t) void toggleTaskStatus(t)
                }}
                onDelete={async () => {
                  const t = snap.tasks.find((tk) => tk.id === item.id)
                  if (!t) return
                  const ok = await confirm('删除任务', `「${t.title}」将被永久删除`)
                  if (ok) { void deleteTaskWithLog(t); toast('已删除', 'success') }
                }}
                onMenu={(e, type) => setContextMenu({ taskId: item.id, type, x: e.clientX, y: e.clientY })}
              />
            ))}
          </>
        ) : null}
      </div>

      <ContextMenu
        open={!!contextMenu}
        items={contextItems}
        x={contextMenu?.x ?? 0}
        y={contextMenu?.y ?? 0}
        onClose={() => setContextMenu(null)}
      />

      {editingTask !== undefined ? (
        <TaskDialog
          task={editingTask}
          people={snap.people}
          projects={snap.projects}
          onClose={() => setEditingTask(undefined)}
        />
      ) : null}

      {showEdit ? (
        <PersonDialog person={person} onClose={() => setShowEdit(false)} />
      ) : null}
    </div>
  )
}

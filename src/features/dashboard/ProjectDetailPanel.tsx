import { useMemo, useState } from 'react'
import { useConfirm } from '../../components/feedback/ConfirmProvider'
import { useToast } from '../../components/feedback/ToastProvider'
import { DatePicker } from '../../components/ui/DatePicker'
import { Dialog } from '../../components/ui/Dialog'
import { TaskItem } from '../tasks/TaskItem'
import { TaskDialog } from '../tasks/TaskDialog'
import { ProjectDialog } from '../projects/ProjectDialog'
import { completeProject, deleteTaskWithLog, toggleTaskStatus, updateProjectDeadline, updateProjectSchedule, updateTaskQuickField } from '../../legacy/actions'
import { buildTaskListItemModels } from '../../legacy/selectors'
import { useLegacyStoreSnapshot } from '../../legacy/useLegacyStore'
import { ddlLabel, formatDate, today, PRIORITY_LABELS, STATUS_LABELS } from '../../legacy/utils'
import type { LegacyProject, LegacyTask, TaskPriority, TaskStatus } from '../../legacy/store'
import { PROJECT_PRIORITIES, TASK_STATUSES, getTaskAssigneeIds } from '../../legacy/store'
import { ContextMenu, type ContextMenuItem } from '../../components/ui/ContextMenu'

type TaskMenuState =
  | { taskId: string; type: 'assignee'; x: number; y: number }
  | { taskId: string; type: 'priority'; x: number; y: number }
  | { taskId: string; type: 'status'; x: number; y: number }

type ScheduleFormState = {
  deliveryDate: string | null
  endDate: string | null
  notes: string
  reviewDate: string | null
  startDate: string | null
}

const EMPTY_SCHEDULE_FORM: ScheduleFormState = {
  deliveryDate: null,
  endDate: null,
  notes: '',
  reviewDate: null,
  startDate: null,
}

/** Keep user-facing schedule fields as stored semantics; never invent endDate from delivery. */
function buildScheduleFormFromProject(project: LegacyProject): ScheduleFormState {
  return {
    deliveryDate: project.deliveryDate || project.ddl || null,
    endDate: project.endDate || null,
    notes: project.notes || '',
    reviewDate: project.reviewDate || null,
    startDate: project.startDate || null,
  }
}

function scheduleFormSyncKey(project: LegacyProject | undefined): string {
  if (!project) return ''
  const form = buildScheduleFormFromProject(project)
  return [
    project.id,
    form.startDate ?? '',
    form.reviewDate ?? '',
    form.deliveryDate ?? '',
    form.endDate ?? '',
    form.notes,
  ].join('\u0001')
}

export function ProjectDetailPanel({ projectId }: { projectId: string }) {
  const snap = useLegacyStoreSnapshot()
  const { confirm } = useConfirm()
  const { toast } = useToast()
  const [editingTask, setEditingTask] = useState<LegacyTask | null | undefined>(undefined)
  const [editingProject, setEditingProject] = useState(false)
  const [contextMenu, setContextMenu] = useState<TaskMenuState | null>(null)
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false)
  const [delayDialogOpen, setDelayDialogOpen] = useState(false)

  const project = snap.projects.find((p) => p.id === projectId)
  const todayStr = today()
  const nextScheduleSyncKey = scheduleFormSyncKey(project)

  const [scheduleForm, setScheduleForm] = useState<ScheduleFormState>(() =>
    project ? buildScheduleFormFromProject(project) : EMPTY_SCHEDULE_FORM,
  )
  const [scheduleSyncKey, setScheduleSyncKey] = useState(nextScheduleSyncKey)

  // Reset editable schedule when the stored project schedule changes (project switch or external save).
  if (nextScheduleSyncKey !== scheduleSyncKey) {
    setScheduleSyncKey(nextScheduleSyncKey)
    setScheduleForm(project ? buildScheduleFormFromProject(project) : EMPTY_SCHEDULE_FORM)
  }

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

  const handleCompleteProject = async (completeOpenTasks: boolean) => {
    const updated = await completeProject(projectId, completeOpenTasks)
    if (!updated) return
    setCompleteDialogOpen(false)
    toast('项目已完成', 'success')
  }

  const handleSaveSchedule = async () => {
    if (!project) return
    const updated = await updateProjectSchedule(project.id, scheduleForm)
    if (!updated) return
    toast('排期已保存', 'success')
  }

  if (!project) return <div className="empty-state">项目不存在</div>

  const statusKey = project.status || 'active'
  const priorityKey = project.priority || 'medium'
  const deliveryDate = project.deliveryDate || project.endDate || project.ddl || null
  const ddl = ddlLabel(deliveryDate, statusKey)
  const openTaskCount = projectTasks.filter((t) => t.status !== 'done').length
  const canUpdateProject = statusKey !== 'completed' && statusKey !== 'cancelled'
  const doneTaskCount = projectTasks.filter((t) => t.status === 'done').length
  const blockedTaskCount = projectTasks.filter((t) => t.status === 'blocked').length
  const overdueTaskCount = projectTasks.filter((t) => t.endDate && t.endDate < todayStr && t.status !== 'done').length
  const todayTaskCount = projectTasks.filter((t) => t.scheduledDate === todayStr && t.status !== 'done').length
  const totalHours = projectTasks.reduce((sum, task) => sum + (task.estimatedHours || 0), 0)
  const remainingHours = projectTasks
    .filter((task) => task.status !== 'done')
    .reduce((sum, task) => sum + (task.estimatedHours || 0), 0)
  const progressPercent = projectTasks.length > 0 ? Math.round((doneTaskCount / projectTasks.length) * 100) : 0
  const assigneeNames = Array.from(new Set(projectTasks.flatMap((task) => getTaskAssigneeIds(task))
    .map((personId) => snap.people.find((person) => person.id === personId)?.name || '')
    .filter(Boolean)))
  const scheduleCheckpoints = [
    { key: 'start', label: '开工', value: project.startDate },
    { key: 'review', label: '审查', value: project.reviewDate },
    { key: 'delivery', label: '交付', value: deliveryDate },
  ]
  const nextCheckpoint = scheduleCheckpoints
    .filter((checkpoint): checkpoint is { key: string; label: string; value: string } => Boolean(checkpoint.value))
    .sort((left, right) => left.value.localeCompare(right.value))
    .find((checkpoint) => checkpoint.value >= todayStr) || null
  const nextOpenTask = [...projectTasks]
    .filter((task) => task.status !== 'done')
    .sort((left, right) => {
      const leftDate = left.scheduledDate || left.endDate || left.startDate || '9999-12-31'
      const rightDate = right.scheduledDate || right.endDate || right.startDate || '9999-12-31'
      return leftDate.localeCompare(rightDate)
    })[0] || null
  const riskTasks = projectTasks
    .filter((task) => task.status === 'blocked' || (task.endDate && task.endDate < todayStr && task.status !== 'done'))
    .slice(0, 4)

  return (
    <div className="project-detail-panel">
      <div className="pdp-meta-row">
        <div className="pdp-meta">
          <span className={`badge badge-${statusKey}`}>{STATUS_LABELS[statusKey]}</span>
          <span className={`badge badge-${priorityKey}`}>{PRIORITY_LABELS[priorityKey]}</span>
          <span className="date-chip">{ddl}</span>
        </div>
        <div className="pdp-project-actions">
          <button className="btn btn-secondary btn-sm" type="button" onClick={() => setEditingTask(null)}>新任务</button>
          <button className="btn btn-secondary btn-sm" type="button" onClick={() => setEditingProject(true)}>编辑</button>
          {canUpdateProject ? (
            <>
              <button className="btn btn-secondary btn-sm" type="button" onClick={() => setDelayDialogOpen(true)}>延期</button>
              <button className="btn btn-primary btn-sm" type="button" onClick={() => setCompleteDialogOpen(true)}>完成</button>
            </>
          ) : null}
        </div>
      </div>

      {project.description ? <p className="pdp-desc">{project.description}</p> : null}

      <section className="pdp-action-summary" aria-label="项目行动摘要">
        <div className="pdp-action-primary">
          <span className="pdp-eyebrow">下一步</span>
          <strong>{nextOpenTask?.title || nextCheckpoint?.label || '补充项目排期'}</strong>
          <span>{nextOpenTask
            ? `任务 · ${formatDate(nextOpenTask.scheduledDate || nextOpenTask.endDate)}`
            : nextCheckpoint
              ? `${nextCheckpoint.label} · ${formatDate(nextCheckpoint.value)}`
              : '尚未安排日期'}</span>
        </div>
        <div className="pdp-action-signals">
          <span data-tone={blockedTaskCount > 0 ? 'risk' : 'neutral'}>{blockedTaskCount} 受阻</span>
          <span data-tone={overdueTaskCount > 0 ? 'risk' : 'neutral'}>{overdueTaskCount} 逾期</span>
        </div>
      </section>

      <div className="pdp-progress-grid">
        <div className="pdp-progress-card pdp-progress-card--wide">
          <div className="pdp-progress-top">
            <span>项目进度</span>
            <strong>{progressPercent}%</strong>
          </div>
          <div className="pdp-progress-bar"><span style={{ width: `${progressPercent}%` }} /></div>
          <div className="pdp-progress-sub">{doneTaskCount} 完成 / {projectTasks.length} 总任务</div>
        </div>
        <div className="pdp-progress-card">
          <span>今日</span>
          <strong>{todayTaskCount}</strong>
        </div>
        <div className="pdp-progress-card">
          <span>受阻</span>
          <strong>{blockedTaskCount}</strong>
        </div>
        <div className="pdp-progress-card">
          <span>逾期</span>
          <strong>{overdueTaskCount}</strong>
        </div>
        <div className="pdp-progress-card">
          <span>剩余</span>
          <strong>{remainingHours || '—'}</strong>
        </div>
      </div>

      <div className="pdp-schedule-panel">
        <div className="pdp-section-title">排期与备注</div>
        <div className="pdp-schedule-grid">
          <div className="form-field">
            <label className="form-label" htmlFor="pdp-start">开工</label>
            <DatePicker id="pdp-start" label="开工" value={scheduleForm.startDate} onChange={(value) => setScheduleForm((current) => ({ ...current, startDate: value }))} />
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="pdp-review">审查</label>
            <DatePicker id="pdp-review" label="审查" value={scheduleForm.reviewDate} onChange={(value) => setScheduleForm((current) => ({ ...current, reviewDate: value }))} />
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="pdp-delivery">交付</label>
            <DatePicker id="pdp-delivery" label="交付" value={scheduleForm.deliveryDate} onChange={(value) => setScheduleForm((current) => ({ ...current, deliveryDate: value }))} />
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="pdp-end">项目结束（可选）</label>
            <DatePicker id="pdp-end" label="项目结束（可选）" value={scheduleForm.endDate} onChange={(value) => setScheduleForm((current) => ({ ...current, endDate: value }))} />
          </div>
          <div className="form-field span2">
            <label className="form-label" htmlFor="pdp-notes">备注</label>
            <textarea
              id="pdp-notes"
              className="form-input"
              rows={3}
              value={scheduleForm.notes}
              onChange={(event) => setScheduleForm((current) => ({ ...current, notes: event.target.value }))}
            />
          </div>
        </div>
        <div className="pdp-production-panel pdp-production-panel--compact">
          <div className="pdp-production-track">
            {scheduleCheckpoints.map((checkpoint) => (
              <div key={checkpoint.key} className={`pdp-production-step${checkpoint.value ? ' is-set' : ''}`}>
                <span className="pdp-production-dot" />
                <span className="pdp-production-label">{checkpoint.label}</span>
                <strong>{checkpoint.value ? formatDate(checkpoint.value) : '未定'}</strong>
              </div>
            ))}
          </div>
          <div className="pdp-production-meta">
            <span>{assigneeNames.length > 0 ? assigneeNames.slice(0, 4).join('、') : '暂无负责人'}</span>
            <span>{openTaskCount} 未完成 · {totalHours || 0}h 总量</span>
          </div>
        </div>
        <div className="pdp-schedule-actions">
          <button className="btn btn-primary btn-sm" type="button" onClick={() => void handleSaveSchedule()}>保存</button>
        </div>
      </div>

      {riskTasks.length > 0 ? (
        <div className="pdp-blocker-list">
          <div className="pdp-section-title">风险</div>
          {riskTasks.map((task) => {
            const isBlocked = task.status === 'blocked'
            const isOverdue = Boolean(task.endDate && task.endDate < todayStr && task.status !== 'done')
            return (
              <div key={task.id} className="pdp-blocker-item">
                <strong>{task.title || '未命名任务'}</strong>
                <span>
                  {isBlocked ? '受阻' : null}
                  {isBlocked && isOverdue ? ' · ' : null}
                  {isOverdue ? `逾期 · ${formatDate(task.endDate)}` : null}
                  {!isBlocked && !isOverdue ? (task.description || '需要关注') : null}
                </span>
              </div>
            )
          })}
        </div>
      ) : null}

      <div className="pdp-section">
        <div className="pdp-section-title">
          任务 · {projectTasks.filter((t) => t.status !== 'done').length} 未完成 / 共 {projectTasks.length}
        </div>
        {taskItems.length === 0 ? (
          <div className="empty-state"><div className="empty-text">为该项目新建任务</div></div>
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
              onMenu={(type, x, y) => {
                setContextMenu({ taskId: task.id, type, x, y })
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
          initialProjectId={projectId}
          projects={snap.projects}
          people={snap.people}
          onClose={() => setEditingTask(undefined)}
        />
      ) : null}

      {editingProject ? (
        <ProjectDialog project={project} onClose={() => setEditingProject(false)} />
      ) : null}

      {completeDialogOpen ? (
        <CompleteProjectDialog
          openTaskCount={openTaskCount}
          project={project}
          onClose={() => setCompleteDialogOpen(false)}
          onComplete={(completeOpenTasks) => void handleCompleteProject(completeOpenTasks)}
        />
      ) : null}

      {delayDialogOpen ? (
        <DelayProjectDialog
          project={project}
          onClose={() => setDelayDialogOpen(false)}
          onSave={async (nextDdl) => {
            const updated = await updateProjectDeadline(project.id, nextDdl)
            if (!updated) return
            setDelayDialogOpen(false)
            toast('已延期', 'success')
          }}
        />
      ) : null}
    </div>
  )
}

function CompleteProjectDialog({
  onClose,
  onComplete,
  openTaskCount,
  project,
}: {
  onClose: () => void
  onComplete: (completeOpenTasks: boolean) => void
  openTaskCount: number
  project: LegacyProject
}) {
  return (
    <Dialog
      open
      title="完成项目"
      onClose={onClose}
      footer={(
        <>
          <button className="btn btn-secondary" type="button" onClick={onClose}>取消</button>
          {openTaskCount > 0 ? (
            <button className="btn btn-secondary" type="button" onClick={() => onComplete(false)}>仅项目</button>
          ) : null}
          <button className="btn btn-primary" type="button" onClick={() => onComplete(openTaskCount > 0)}>
            {openTaskCount > 0 ? '全完成' : '完成'}
          </button>
        </>
      )}
    >
      <div className="project-action-copy">
        {openTaskCount > 0
          ? `「${project.name || '未命名项目'}」还有 ${openTaskCount} 个未完成任务，可只完成项目，或一并完成任务。`
          : `确认完成「${project.name || '未命名项目'}」？`}
      </div>
    </Dialog>
  )
}

function DelayProjectDialog({
  onClose,
  onSave,
  project,
}: {
  onClose: () => void
  onSave: (nextDdl: string | null) => Promise<void>
  project: LegacyProject
}) {
  const [nextDdl, setNextDdl] = useState<string | null>(project.deliveryDate || project.ddl || null)

  return (
    <Dialog
      open
      title="延期项目"
      onClose={onClose}
      className="project-delay-modal"
      footer={(
        <>
          <button className="btn btn-secondary" type="button" onClick={onClose}>取消</button>
          <button className="btn btn-primary" type="button" onClick={() => void onSave(nextDdl)}>保存</button>
        </>
      )}
    >
      <div className="form-grid project-delay-form">
        <div className="form-field">
          <label className="form-label" htmlFor="project-delay-ddl">新的交付日期</label>
          <DatePicker
            id="project-delay-ddl"
            label="新的交付日期"
            value={nextDdl}
            onChange={setNextDdl}
          />
        </div>
      </div>
    </Dialog>
  )
}

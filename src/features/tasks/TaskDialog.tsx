import { useState } from 'react'
import { useToast } from '../../components/feedback/ToastProvider'
import { Dialog } from '../../components/ui/Dialog'
import {
  PROJECT_PRIORITIES,
  TASK_STATUSES,
  type LegacyPerson,
  type LegacyProject,
  type LegacyTask,
} from '../../legacy/store'
import { PRIORITY_LABELS, STATUS_LABELS, initials } from '../../legacy/utils'
import { saveTaskFromForm, type TaskFormInput } from '../../legacy/actions'
import { getTaskAssigneeIds } from '../../legacy/store'

export function TaskDialog({
  initialProjectId,
  onClose,
  people,
  projects,
  task,
}: {
  initialProjectId?: string | null
  onClose: () => void
  people: LegacyPerson[]
  projects: LegacyProject[]
  task: LegacyTask | null
}) {
  const isNew = !task
  const { toast } = useToast()
  const [form, setForm] = useState<TaskFormInput>(() => ({
    title: task?.title || '',
    projectId: task?.projectId || initialProjectId || null,
    status: task?.status || 'todo',
    priority: task?.priority || 'medium',
    assigneeIds: task ? getTaskAssigneeIds(task) : [],
    scheduledDate: task?.scheduledDate || null,
    startDate: task?.startDate || null,
    endDate: task?.endDate || null,
    estimatedHours: task?.estimatedHours ?? null,
    description: task?.description || '',
  }))

  const activePeople = people.filter((person) => person.status === 'active')
  // Also include inactive people already assigned (so they stay visible)
  const assignedInactive = task
    ? getTaskAssigneeIds(task)
        .map((id) => people.find((p) => p.id === id))
        .filter((p): p is LegacyPerson => !!p && p.status !== 'active')
    : []
  const displayPeople = assignedInactive.length > 0
    ? [...activePeople, ...assignedInactive]
    : activePeople

  const toggleAssignee = (personId: string) => {
    setForm((cur) => ({
      ...cur,
      assigneeIds: cur.assigneeIds.includes(personId)
        ? cur.assigneeIds.filter((id) => id !== personId)
        : [...cur.assigneeIds, personId],
    }))
  }

  const save = async () => {
    if (!form.title?.trim()) {
      toast('请填写任务标题', 'error')
      return
    }

    await saveTaskFromForm(task, form)
    toast(isNew ? '任务已创建' : '已保存', 'success')
    onClose()
  }

  return (
    <Dialog
      open
      title={isNew ? '新建任务' : '编辑任务'}
      onClose={onClose}
      footer={(
        <>
          <button className="btn btn-secondary" type="button" onClick={onClose}>取消</button>
          <button className="btn btn-primary" type="button" onClick={() => void save()}>
            {isNew ? '创建任务' : '保存'}
          </button>
        </>
      )}
      width="wide"
    >
      <div className="form-grid">
        <div className="form-field">
          <label className="form-label" htmlFor="task-title">任务标题 *</label>
          <input id="task-title" className="form-input" value={form.title || ''} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
        </div>
        <div className="form-field">
          <label className="form-label" htmlFor="task-project">所属项目</label>
          <select id="task-project" className="form-input" value={form.projectId || ''} onChange={(event) => setForm((current) => ({ ...current, projectId: event.target.value || null }))}>
            <option value="">（无）</option>
            {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
          </select>
        </div>
        <div className="form-field">
          <label className="form-label" htmlFor="task-status">状态</label>
          <select id="task-status" className="form-input" value={form.status || 'todo'} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as TaskFormInput['status'] }))}>
            {TASK_STATUSES.map((status) => (
              <option key={status} value={status}>{STATUS_LABELS[status]}</option>
            ))}
          </select>
        </div>
        <div className="form-field">
          <label className="form-label" htmlFor="task-priority">优先级</label>
          <select id="task-priority" className="form-input" value={form.priority || 'medium'} onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value as TaskFormInput['priority'] }))}>
            {PROJECT_PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>{PRIORITY_LABELS[priority]}</option>
            ))}
          </select>
        </div>
        <div className="form-field span2">
          <label className="form-label">
            负责人
            {form.assigneeIds.length > 0 ? <span className="form-label-count"> · {form.assigneeIds.length} 人</span> : null}
          </label>
          <div className="assignee-picker">
            {displayPeople.map((person) => {
              const selected = form.assigneeIds.includes(person.id)
              const isInactive = person.status !== 'active'
              return (
                <button
                  key={person.id}
                  type="button"
                  className={`assignee-chip${selected ? ' selected' : ''}${isInactive ? ' inactive' : ''}`}
                  onClick={() => toggleAssignee(person.id)}
                >
                  <span className="assignee-chip-avatar">{initials(person.name || '')}</span>
                  <span className="assignee-chip-name">
                    {person.name}
                    {isInactive ? <span className="assignee-chip-inactive-label">（已停用）</span> : null}
                  </span>
                  {selected ? (
                    <svg className="assignee-chip-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="12" height="12">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : null}
                </button>
              )
            })}
            {displayPeople.length === 0 ? <span className="text-muted text-sm">暂无可用人员</span> : null}
          </div>
        </div>
        <div className="form-field">
          <label className="form-label" htmlFor="task-scheduled">安排日期</label>
          <input id="task-scheduled" className="form-input" type="date" value={form.scheduledDate || ''} onChange={(event) => setForm((current) => ({ ...current, scheduledDate: event.target.value || null }))} />
        </div>
        <div className="form-field">
          <label className="form-label" htmlFor="task-start">开始日期</label>
          <input id="task-start" className="form-input" type="date" value={form.startDate || ''} onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value || null }))} />
        </div>
        <div className="form-field">
          <label className="form-label" htmlFor="task-end">截止日期</label>
          <input id="task-end" className="form-input" type="date" value={form.endDate || ''} onChange={(event) => setForm((current) => ({ ...current, endDate: event.target.value || null }))} />
        </div>
        <div className="form-field">
          <label className="form-label" htmlFor="task-hours">预计工时(h)</label>
          <input
            id="task-hours"
            className="form-input"
            type="number"
            min="0"
            value={form.estimatedHours ?? ''}
            onChange={(event) => setForm((current) => ({
              ...current,
              estimatedHours: event.target.value ? Number(event.target.value) : null,
            }))}
          />
        </div>
        <div className="form-field span2">
          <label className="form-label" htmlFor="task-desc">描述</label>
          <textarea id="task-desc" className="form-input" rows={4} value={form.description || ''} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
        </div>
      </div>
    </Dialog>
  )
}

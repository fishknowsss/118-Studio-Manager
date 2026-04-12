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
import { PRIORITY_LABELS, STATUS_LABELS } from '../../legacy/utils'
import { saveTaskFromForm, type TaskFormInput } from '../../legacy/actions'

export function TaskDialog({
  onClose,
  people,
  projects,
  task,
}: {
  onClose: () => void
  people: LegacyPerson[]
  projects: LegacyProject[]
  task: LegacyTask | null
}) {
  const isNew = !task
  const { toast } = useToast()
  const [form, setForm] = useState<TaskFormInput>(() => ({
    title: task?.title || '',
    projectId: task?.projectId || null,
    status: task?.status || 'todo',
    priority: task?.priority || 'medium',
    assigneeId: task?.assigneeId || null,
    scheduledDate: task?.scheduledDate || null,
    startDate: task?.startDate || null,
    endDate: task?.endDate || null,
    estimatedHours: task?.estimatedHours ?? null,
    description: task?.description || '',
  }))

  const activePeople = people.filter((person) => person.status === 'active')
  const currentAssignee = task?.assigneeId ? people.find((person) => person.id === task.assigneeId) : null
  const displayPeople = currentAssignee && currentAssignee.status !== 'active'
    ? [...activePeople, currentAssignee]
    : activePeople

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
        <div className="form-field">
          <label className="form-label" htmlFor="task-assignee">负责人</label>
          <select id="task-assignee" className="form-input" value={form.assigneeId || ''} onChange={(event) => setForm((current) => ({ ...current, assigneeId: event.target.value || null }))}>
            <option value="">（未分配）</option>
            {displayPeople.map((person) => (
              <option key={person.id} value={person.id}>
                {person.id === task?.assigneeId && person.status !== 'active' ? `${person.name}（已停用）` : person.name}
              </option>
            ))}
          </select>
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

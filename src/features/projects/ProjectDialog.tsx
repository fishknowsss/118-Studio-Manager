import { useState } from 'react'
import { useToast } from '../../components/feedback/ToastProvider'
import { Dialog } from '../../components/ui/Dialog'
import { PROJECT_PRIORITIES, PROJECT_STATUSES, type LegacyMilestone, type LegacyProject } from '../../legacy/store'
import { PRIORITY_LABELS, STATUS_LABELS, uid } from '../../legacy/utils'
import { saveProjectFromForm, type ProjectFormInput } from '../../legacy/actions'

export function ProjectDialog({
  onClose,
  project,
}: {
  onClose: () => void
  project: LegacyProject | null
}) {
  const isNew = !project
  const { toast } = useToast()
  const [form, setForm] = useState<ProjectFormInput>(() => ({
    name: project?.name || '',
    status: project?.status || 'active',
    priority: project?.priority || 'medium',
    ddl: project?.ddl || null,
    description: project?.description || '',
    milestones: (project?.milestones || []).map((milestone) => ({ ...milestone })),
  }))

  const updateMilestone = (index: number, patch: Partial<LegacyMilestone>) => {
    setForm((current) => ({
      ...current,
      milestones: current.milestones.map((milestone, milestoneIndex) => (
        milestoneIndex === index ? { ...milestone, ...patch } : milestone
      )),
    }))
  }

  const removeMilestone = (index: number) => {
    setForm((current) => ({
      ...current,
      milestones: current.milestones.filter((_, milestoneIndex) => milestoneIndex !== index),
    }))
  }

  const save = async () => {
    if (!form.name?.trim()) {
      toast('请填写项目名称', 'error')
      return
    }

    await saveProjectFromForm(project, form)
    toast(isNew ? '项目已创建' : '已保存', 'success')
    onClose()
  }

  return (
    <Dialog
      open
      title={isNew ? '新建项目' : '编辑项目'}
      onClose={onClose}
      footer={(
        <>
          <button className="btn btn-secondary" type="button" onClick={onClose}>取消</button>
          <button className="btn btn-primary" type="button" onClick={() => void save()}>
            {isNew ? '创建项目' : '保存'}
          </button>
        </>
      )}
    >
      <div className="form-grid">
        <div className="form-field">
          <label className="form-label" htmlFor="project-name">项目名称 *</label>
          <input id="project-name" className="form-input" value={form.name || ''} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
        </div>
        <div className="form-field">
          <label className="form-label" htmlFor="project-status">状态</label>
          <select id="project-status" className="form-input" value={form.status || 'active'} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as ProjectFormInput['status'] }))}>
            {PROJECT_STATUSES.map((status) => (
              <option key={status} value={status}>{STATUS_LABELS[status]}</option>
            ))}
          </select>
        </div>
        <div className="form-field">
          <label className="form-label" htmlFor="project-priority">优先级</label>
          <select id="project-priority" className="form-input" value={form.priority || 'medium'} onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value as ProjectFormInput['priority'] }))}>
            {PROJECT_PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>{PRIORITY_LABELS[priority]}</option>
            ))}
          </select>
        </div>
        <div className="form-field">
          <label className="form-label" htmlFor="project-ddl">截止日期</label>
          <input id="project-ddl" className="form-input" type="date" value={form.ddl || ''} onChange={(event) => setForm((current) => ({ ...current, ddl: event.target.value || null }))} />
        </div>
        <div className="form-field span2">
          <label className="form-label" htmlFor="project-desc">描述</label>
          <textarea id="project-desc" className="form-input" rows={4} value={form.description || ''} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
        </div>
        <div className="form-field span2">
          <label className="form-label">里程碑</label>
          <div className="milestones-editor">
            {form.milestones.map((milestone, index) => (
              <div key={milestone.id || index} className="milestone-edit-row">
                <input
                  className="milestone-check-input"
                  type="checkbox"
                  checked={Boolean(milestone.completed)}
                  onChange={(event) => updateMilestone(index, { completed: event.target.checked })}
                />
                <input
                  className="form-input"
                  type="text"
                  placeholder="里程碑名称"
                  value={milestone.title || ''}
                  onChange={(event) => updateMilestone(index, { title: event.target.value })}
                />
                <input
                  className="form-input"
                  type="date"
                  value={milestone.date || ''}
                  onChange={(event) => updateMilestone(index, { date: event.target.value || null })}
                />
                <button className="btn btn-ghost btn-icon btn-sm" type="button" onClick={() => removeMilestone(index)}>删</button>
              </div>
            ))}
            <button
              className="add-milestone-btn"
              type="button"
              onClick={() => setForm((current) => ({
                ...current,
                milestones: [...current.milestones, { id: uid(), title: '', date: null, completed: false }],
              }))}
            >
              添加里程碑
            </button>
          </div>
        </div>
      </div>
    </Dialog>
  )
}

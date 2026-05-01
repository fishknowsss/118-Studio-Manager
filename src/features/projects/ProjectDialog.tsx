import { useState } from 'react'
import { useToast } from '../../components/feedback/ToastProvider'
import { DatePicker } from '../../components/ui/DatePicker'
import { Dialog } from '../../components/ui/Dialog'
import { PROJECT_PRIORITIES, PROJECT_STATUSES, type LegacyProject } from '../../legacy/store'
import { PRIORITY_LABELS, STATUS_LABELS } from '../../legacy/utils'
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
  }))

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
          <DatePicker
            id="project-ddl"
            label="截止日期"
            value={form.ddl || null}
            onChange={(value) => setForm((current) => ({ ...current, ddl: value }))}
          />
        </div>
        <div className="form-field span2">
          <label className="form-label" htmlFor="project-desc">描述</label>
          <textarea id="project-desc" className="form-input" rows={4} value={form.description || ''} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
        </div>
      </div>
    </Dialog>
  )
}

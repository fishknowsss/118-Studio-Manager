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
  const [isSaving, setIsSaving] = useState(false)
  const [form, setForm] = useState<ProjectFormInput>(() => ({
    name: project?.name || '',
    status: project?.status || 'active',
    priority: project?.priority || 'medium',
    startDate: project?.startDate || null,
    reviewDate: project?.reviewDate || null,
    deliveryDate: project?.deliveryDate || project?.ddl || null,
    endDate: project?.endDate || null,
    ddl: project?.deliveryDate || project?.ddl || null,
    description: project?.description || '',
    notes: project?.notes || '',
  }))

  const save = async () => {
    if (isSaving) return
    if (!form.name?.trim()) {
      toast('请填写项目名称', 'error')
      return
    }

    setIsSaving(true)
    try {
      await saveProjectFromForm(project, form)
      toast(isNew ? '项目已创建' : '已保存', 'success')
      onClose()
    } catch (error) {
      console.error('[118SM] 保存项目失败:', error)
      toast('保存失败', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog
      open
      title={isNew ? '新建项目' : '编辑项目'}
      onClose={isSaving ? () => {} : onClose}
      footer={(
        <>
          <button className="btn btn-secondary" type="button" onClick={onClose} disabled={isSaving}>取消</button>
          <button className="btn btn-primary" type="button" onClick={() => void save()} disabled={isSaving}>
            {isSaving ? '保存中' : isNew ? '创建项目' : '保存'}
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
          <label className="form-label" htmlFor="project-start">开始日期</label>
          <DatePicker
            id="project-start"
            label="开始日期"
            value={form.startDate || null}
            onChange={(value) => setForm((current) => ({ ...current, startDate: value }))}
          />
        </div>
        <div className="form-field">
          <label className="form-label" htmlFor="project-review">审查日期</label>
          <DatePicker
            id="project-review"
            label="审查日期"
            value={form.reviewDate || null}
            onChange={(value) => setForm((current) => ({ ...current, reviewDate: value }))}
          />
        </div>
        <div className="form-field">
          <label className="form-label" htmlFor="project-delivery">交付日期</label>
          <DatePicker
            id="project-delivery"
            label="交付日期"
            value={form.deliveryDate || null}
            onChange={(value) => setForm((current) => ({ ...current, deliveryDate: value, ddl: value }))}
          />
        </div>
        <div className="form-field">
          <label className="form-label" htmlFor="project-end">结束日期</label>
          <DatePicker
            id="project-end"
            label="结束日期"
            value={form.endDate || null}
            onChange={(value) => setForm((current) => ({ ...current, endDate: value }))}
          />
        </div>
        <div className="form-field span2">
          <label className="form-label" htmlFor="project-desc">描述</label>
          <textarea id="project-desc" className="form-input" rows={4} value={form.description || ''} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
        </div>
        <div className="form-field span2">
          <label className="form-label" htmlFor="project-notes">备注</label>
          <textarea id="project-notes" className="form-input" rows={3} value={form.notes || ''} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
        </div>
      </div>
    </Dialog>
  )
}

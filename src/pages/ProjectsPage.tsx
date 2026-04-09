import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProjects } from '../hooks/useProjects'
import { PageHeader } from '../components/PageHeader'
import { Button } from '../components/Button'
import { Modal } from '../components/Modal'
import { ConfirmModal } from '../components/ConfirmModal'
import { Card } from '../components/Card'
import { EmptyState } from '../components/EmptyState'
import { SearchInput } from '../components/SearchInput'
import { ProjectStatusBadge } from '../components/StatusBadge'
import { PriorityBadge } from '../components/PriorityBadge'
import { FormField } from '../components/FormField'
import { inputClass, selectClass, textareaClass } from '../components/formFieldClasses'
import { PROJECT_STATUS_LABELS } from '../constants'
import { PRIORITY_LABELS } from '../constants'
import { formatDate, daysUntil, isOverdue } from '../utils/date'
import { compareProjectUrgency } from '../utils/sort'
import type { ProjectInput, ProjectStatus, ProjectPriority } from '../types/project'

const emptyForm: ProjectInput = {
  name: '', type: '', description: '', startDate: '', deadline: '',
  status: 'not_started', priority: 'medium', color: '#4166F5', clientOrSource: '',
}

export function ProjectsPage() {
  const { projects, addProject, updateProject, deleteProject } = useProjects()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | ''>('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<ProjectInput>(emptyForm)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const searchTerm = search.trim().toLowerCase()
  const filtered = projects
    .filter(p => {
      const haystacks = [p.name, p.clientOrSource, p.type, p.description]
      const matchSearch = !searchTerm || haystacks.some(value => value.toLowerCase().includes(searchTerm))
      const matchStatus = !statusFilter || p.status === statusFilter
      return matchSearch && matchStatus
    })
    .sort(compareProjectUrgency)

  const openCreate = () => {
    setForm(emptyForm)
    setEditingId(null)
    setErrors({})
    setShowForm(true)
  }

  const openEdit = (p: typeof projects[0]) => {
    setForm({
      name: p.name, type: p.type, description: p.description, startDate: p.startDate,
      deadline: p.deadline, status: p.status, priority: p.priority, color: p.color, clientOrSource: p.clientOrSource,
    })
    setEditingId(p.id)
    setErrors({})
    setShowForm(true)
  }

  const validate = (): boolean => {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = '请输入项目名称'
    if (!form.deadline) e.deadline = '请设置截止日期'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    if (editingId) {
      await updateProject(editingId, form)
    } else {
      await addProject(form)
    }
    setShowForm(false)
  }

  return (
    <>
      <PageHeader
        title="项目管理"
        subtitle={`共 ${projects.length} 个项目`}
        actions={<Button onClick={openCreate}>+ 新建项目</Button>}
      />

      <div className="flex gap-3 mb-4">
        <div className="w-64">
          <SearchInput value={search} onChange={setSearch} placeholder="搜索项目名称、客户..." />
        </div>
        <select
          className={`${selectClass} w-auto`}
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as ProjectStatus | '')}
        >
          <option value="">全部状态</option>
          {Object.entries(PROJECT_STATUS_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={search || statusFilter ? '没有匹配的项目' : '还没有项目'}
          description={search || statusFilter ? '试试其他筛选条件' : '创建第一个项目开始管理'}
          actionLabel={search || statusFilter ? undefined : '+ 新建项目'}
          onAction={search || statusFilter ? undefined : openCreate}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map(project => {
            const days = daysUntil(project.deadline)
            const overdue = isOverdue(project.deadline) && project.status !== 'completed'
            return (
              <Card key={project.id} hoverable onClick={() => navigate(`/projects/${project.id}`)} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-10 rounded-full" style={{ backgroundColor: project.color }} />
                    <div>
                      <h3 className="text-sm font-medium text-text-primary">{project.name}</h3>
                      <p className="text-xs text-text-secondary">
                        {project.clientOrSource && `${project.clientOrSource} · `}
                        {project.type && `${project.type} · `}
                        截止: {formatDate(project.deadline)}
                        {overdue && <span className="text-danger ml-1">已逾期</span>}
                        {!overdue && days <= 7 && days >= 0 && <span className="text-warning ml-1">还剩 {days} 天</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <PriorityBadge priority={project.priority} />
                    <ProjectStatusBadge status={project.status} />
                  </div>
                </div>
                <div className="flex gap-2 mt-3 pt-3 border-t border-border-light">
                  <button
                    className="text-xs text-primary hover:underline cursor-pointer"
                    onClick={e => { e.stopPropagation(); openEdit(project) }}
                  >
                    编辑
                  </button>
                  <button
                    className="text-xs text-danger hover:underline cursor-pointer"
                    onClick={e => { e.stopPropagation(); setDeleteTarget({ id: project.id, name: project.name }) }}
                  >
                    删除
                  </button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editingId ? '编辑项目' : '新建项目'} width="max-w-xl">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="项目名称" required error={errors.name}>
              <input className={inputClass} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </FormField>
            <FormField label="项目类型">
              <input className={inputClass} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} placeholder="如: 短视频、宣传片" />
            </FormField>
          </div>
          <FormField label="描述">
            <textarea className={textareaClass} rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="开始日期">
              <input type="date" className={inputClass} value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
            </FormField>
            <FormField label="截止日期" required error={errors.deadline}>
              <input type="date" className={inputClass} value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} />
            </FormField>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <FormField label="状态">
              <select className={selectClass} value={form.status} onChange={e => setForm({ ...form, status: e.target.value as ProjectStatus })}>
                {Object.entries(PROJECT_STATUS_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </FormField>
            <FormField label="优先级">
              <select className={selectClass} value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value as ProjectPriority })}>
                {Object.entries(PRIORITY_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </FormField>
            <FormField label="项目颜色">
              <div className="flex items-center gap-2">
                <input type="color" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} className="w-8 h-8 rounded border border-border cursor-pointer" />
                <span className="text-xs text-text-secondary">{form.color}</span>
              </div>
            </FormField>
          </div>
          <FormField label="客户/来源">
            <input className={inputClass} value={form.clientOrSource} onChange={e => setForm({ ...form, clientOrSource: e.target.value })} />
          </FormField>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowForm(false)}>取消</Button>
            <Button onClick={handleSubmit}>{editingId ? '保存' : '创建'}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => { if (deleteTarget) { await deleteProject(deleteTarget.id); setDeleteTarget(null) } }}
        title="确认删除"
        message={`确定要删除项目「${deleteTarget?.name}」吗？该项目下的所有任务、里程碑和分配记录都会被一并删除。`}
        confirmText="删除"
        danger
      />
    </>
  )
}

import { useState } from 'react'
import { useTasks } from '../hooks/useTasks'
import { useProjects } from '../hooks/useProjects'
import { PageHeader } from '../components/PageHeader'
import { Button } from '../components/Button'
import { Modal } from '../components/Modal'
import { ConfirmModal } from '../components/ConfirmModal'
import { Card } from '../components/Card'
import { EmptyState } from '../components/EmptyState'
import { SearchInput } from '../components/SearchInput'
import { TaskStatusBadge } from '../components/StatusBadge'
import { PriorityBadge } from '../components/PriorityBadge'
import { FormField } from '../components/FormField'
import { inputClass, selectClass, textareaClass } from '../components/formFieldClasses'
import { TASK_STATUS_LABELS } from '../constants'
import { PRIORITY_LABELS } from '../constants'
import { formatDate, isOverdue } from '../utils/date'
import { compareTaskUrgency } from '../utils/sort'
import type { TaskInput, TaskStatus, TaskPriority } from '../types/task'

const emptyForm: TaskInput = {
  projectId: '', title: '', description: '', status: 'todo', priority: 'medium',
  stage: '', startDate: '', dueDate: '', estimatedHours: 0,
}

export function TasksPage() {
  const { tasks, addTask, updateTask, deleteTask } = useTasks()
  const { projects } = useProjects()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<TaskStatus | ''>('')
  const [projectFilter, setProjectFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<TaskInput>(emptyForm)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const projectMap = new Map(projects.map(p => [p.id, p]))
  const searchTerm = search.trim().toLowerCase()
  const filtered = tasks
    .filter(t => {
      const projectName = projectMap.get(t.projectId)?.name || ''
      const haystacks = [t.title, t.description, t.stage, projectName]
      const matchSearch = !searchTerm || haystacks.some(value => value.toLowerCase().includes(searchTerm))
      const matchStatus = !statusFilter || t.status === statusFilter
      const matchProject = !projectFilter || t.projectId === projectFilter
      return matchSearch && matchStatus && matchProject
    })
    .sort(compareTaskUrgency)

  const openCreate = () => {
    setForm(emptyForm)
    setEditingId(null)
    setErrors({})
    setShowForm(true)
  }

  const openEdit = (t: typeof tasks[0]) => {
    setForm({
      projectId: t.projectId, title: t.title, description: t.description, status: t.status,
      priority: t.priority, stage: t.stage, startDate: t.startDate, dueDate: t.dueDate, estimatedHours: t.estimatedHours,
    })
    setEditingId(t.id)
    setErrors({})
    setShowForm(true)
  }

  const validate = (): boolean => {
    const e: Record<string, string> = {}
    if (!form.title.trim()) e.title = '请输入任务标题'
    if (!form.projectId) e.projectId = '请选择所属项目'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    if (editingId) {
      await updateTask(editingId, form)
    } else {
      await addTask(form)
    }
    setShowForm(false)
  }

  return (
    <>
      <PageHeader
        title="任务管理"
        subtitle={`共 ${tasks.length} 个任务`}
        actions={<Button onClick={openCreate}>+ 新建任务</Button>}
      />

      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="w-64">
          <SearchInput value={search} onChange={setSearch} placeholder="搜索任务标题..." />
        </div>
        <select
          className={`${selectClass} w-auto`}
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as TaskStatus | '')}
        >
          <option value="">全部状态</option>
          {Object.entries(TASK_STATUS_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <select
          className={`${selectClass} w-auto`}
          value={projectFilter}
          onChange={e => setProjectFilter(e.target.value)}
        >
          <option value="">全部项目</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={search || statusFilter || projectFilter ? '没有匹配的任务' : '还没有任务'}
          description={search || statusFilter || projectFilter ? '试试其他筛选条件' : '创建第一个任务'}
          actionLabel={search || statusFilter || projectFilter ? undefined : '+ 新建任务'}
          onAction={search || statusFilter || projectFilter ? undefined : openCreate}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map(task => {
            const project = projectMap.get(task.projectId)
            const overdue = task.dueDate && isOverdue(task.dueDate) && task.status !== 'completed'
            return (
              <Card key={task.id} className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <TaskStatusBadge status={task.status} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{task.title}</p>
                      <p className="text-xs text-text-secondary">
                        {project && (
                          <span className="inline-flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: project.color }} />
                            {project.name}
                          </span>
                        )}
                        {task.dueDate && <span className="ml-2">截止: {formatDate(task.dueDate)}</span>}
                        {overdue && <span className="text-danger ml-1">逾期</span>}
                        {task.estimatedHours > 0 && <span className="ml-2">{task.estimatedHours}h</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <PriorityBadge priority={task.priority} />
                    <button className="text-xs text-primary hover:underline cursor-pointer" onClick={() => openEdit(task)}>编辑</button>
                    <button className="text-xs text-danger hover:underline cursor-pointer" onClick={() => setDeleteTarget({ id: task.id, name: task.title })}>删除</button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editingId ? '编辑任务' : '新建任务'} width="max-w-xl">
        <div className="space-y-4">
          <FormField label="所属项目" required error={errors.projectId}>
            <select className={selectClass} value={form.projectId} onChange={e => setForm({ ...form, projectId: e.target.value })}>
              <option value="">请选择项目</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </FormField>
          <FormField label="任务标题" required error={errors.title}>
            <input className={inputClass} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
          </FormField>
          <FormField label="描述">
            <textarea className={textareaClass} rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </FormField>
          <div className="grid grid-cols-3 gap-4">
            <FormField label="状态">
              <select className={selectClass} value={form.status} onChange={e => setForm({ ...form, status: e.target.value as TaskStatus })}>
                {Object.entries(TASK_STATUS_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </FormField>
            <FormField label="优先级">
              <select className={selectClass} value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value as TaskPriority })}>
                {Object.entries(PRIORITY_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </FormField>
            <FormField label="阶段">
              <input className={inputClass} value={form.stage} onChange={e => setForm({ ...form, stage: e.target.value })} placeholder="如: 设计、制作" />
            </FormField>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <FormField label="开始日期">
              <input type="date" className={inputClass} value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
            </FormField>
            <FormField label="截止日期">
              <input type="date" className={inputClass} value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} />
            </FormField>
            <FormField label="预估工时(h)">
              <input type="number" className={inputClass} min={0} step={0.5} value={form.estimatedHours || ''} onChange={e => setForm({ ...form, estimatedHours: parseFloat(e.target.value) || 0 })} />
            </FormField>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowForm(false)}>取消</Button>
            <Button onClick={handleSubmit}>{editingId ? '保存' : '创建'}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => { if (deleteTarget) { await deleteTask(deleteTarget.id); setDeleteTarget(null) } }}
        title="确认删除"
        message={`确定要删除任务「${deleteTarget?.name}」吗？`}
        confirmText="删除"
        danger
      />
    </>
  )
}

import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useProject } from '../hooks/useProjects'
import { useTasks } from '../hooks/useTasks'
import { useMilestones } from '../hooks/useMilestones'
import { PageHeader } from '../components/PageHeader'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { Modal } from '../components/Modal'
import { ConfirmModal } from '../components/ConfirmModal'
import { ProjectStatusBadge, TaskStatusBadge } from '../components/StatusBadge'
import { PriorityBadge } from '../components/PriorityBadge'
import { Badge } from '../components/Badge'
import { EmptyState } from '../components/EmptyState'
import { FormField } from '../components/FormField'
import { inputClass, selectClass, textareaClass } from '../components/formFieldClasses'
import { formatDate, daysUntil, isOverdue } from '../utils/date'
import { MILESTONE_TYPE_LABELS, MILESTONE_TYPE_COLORS } from '../constants'
import { TASK_STATUS_LABELS } from '../constants'
import { PRIORITY_LABELS } from '../constants'
import type { MilestoneInput, MilestoneType } from '../types/milestone'
import type { TaskInput, TaskStatus, TaskPriority } from '../types/task'

const emptyMilestoneForm: MilestoneInput = {
  projectId: '', title: '', date: '', type: 'other', note: '',
}

const emptyTaskForm = (projectId: string): TaskInput => ({
  projectId, title: '', description: '', status: 'todo', priority: 'medium',
  stage: '', startDate: '', dueDate: '', estimatedHours: 0,
})

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const project = useProject(id)
  const { tasks, addTask, updateTask, deleteTask } = useTasks(id)
  const { milestones, addMilestone, updateMilestone, deleteMilestone } = useMilestones(id)

  const [showMilestoneForm, setShowMilestoneForm] = useState(false)
  const [editingMilestoneId, setEditingMilestoneId] = useState<string | null>(null)
  const [milestoneForm, setMilestoneForm] = useState<MilestoneInput>(emptyMilestoneForm)

  const [showTaskForm, setShowTaskForm] = useState(false)
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [taskForm, setTaskForm] = useState<TaskInput>(emptyTaskForm(id ?? ''))

  const [deleteTarget, setDeleteTarget] = useState<{ type: 'milestone' | 'task'; id: string; name: string } | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  if (project === undefined) {
    return <div className="text-text-secondary">加载中...</div>
  }

  if (project === null) {
    return (
      <EmptyState
        title="项目不存在"
        description="这个项目可能已被删除，或者链接已经失效。"
        actionLabel="返回项目列表"
        onAction={() => navigate('/projects')}
      />
    )
  }

  const days = daysUntil(project.deadline)
  const overdue = isOverdue(project.deadline) && project.status !== 'completed'

  const openCreateMilestone = () => {
    setMilestoneForm({ ...emptyMilestoneForm, projectId: project.id })
    setEditingMilestoneId(null)
    setErrors({})
    setShowMilestoneForm(true)
  }

  const openEditMilestone = (m: typeof milestones[0]) => {
    setMilestoneForm({ projectId: m.projectId, title: m.title, date: m.date, type: m.type, note: m.note })
    setEditingMilestoneId(m.id)
    setErrors({})
    setShowMilestoneForm(true)
  }

  const handleMilestoneSubmit = async () => {
    const e: Record<string, string> = {}
    if (!milestoneForm.title.trim()) e.title = '请输入标题'
    if (!milestoneForm.date) e.date = '请选择日期'
    setErrors(e)
    if (Object.keys(e).length > 0) return
    if (editingMilestoneId) {
      await updateMilestone(editingMilestoneId, milestoneForm)
    } else {
      await addMilestone(milestoneForm)
    }
    setShowMilestoneForm(false)
  }

  const openCreateTask = () => {
    setTaskForm(emptyTaskForm(project.id))
    setEditingTaskId(null)
    setErrors({})
    setShowTaskForm(true)
  }

  const openEditTask = (t: typeof tasks[0]) => {
    setTaskForm({
      projectId: t.projectId, title: t.title, description: t.description, status: t.status,
      priority: t.priority, stage: t.stage, startDate: t.startDate, dueDate: t.dueDate, estimatedHours: t.estimatedHours,
    })
    setEditingTaskId(t.id)
    setErrors({})
    setShowTaskForm(true)
  }

  const handleTaskSubmit = async () => {
    const e: Record<string, string> = {}
    if (!taskForm.title.trim()) e.title = '请输入任务标题'
    setErrors(e)
    if (Object.keys(e).length > 0) return
    if (editingTaskId) {
      await updateTask(editingTaskId, taskForm)
    } else {
      await addTask(taskForm)
    }
    setShowTaskForm(false)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    if (deleteTarget.type === 'milestone') await deleteMilestone(deleteTarget.id)
    else await deleteTask(deleteTarget.id)
    setDeleteTarget(null)
  }

  return (
    <>
      <PageHeader
        title={project.name}
        subtitle={`${project.type || '未分类'} · ${project.clientOrSource || '无客户'}`}
        actions={<Button variant="secondary" onClick={() => navigate('/projects')}>返回列表</Button>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
        <Card className="p-4">
          <p className="text-xs text-text-secondary mb-1">状态</p>
          <ProjectStatusBadge status={project.status} />
        </Card>
        <Card className="p-4">
          <p className="text-xs text-text-secondary mb-1">优先级</p>
          <PriorityBadge priority={project.priority} />
        </Card>
        <Card className="p-4">
          <p className="text-xs text-text-secondary mb-1">截止日期</p>
          <p className="text-sm font-medium">
            {formatDate(project.deadline)}
            {overdue && <span className="text-danger ml-2">已逾期</span>}
            {!overdue && days >= 0 && <span className="text-text-secondary ml-2">还剩 {days} 天</span>}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-text-secondary mb-1">任务进度</p>
          <p className="text-sm font-medium">
            {tasks.filter(t => t.status === 'completed').length} / {tasks.length} 已完成
          </p>
        </Card>
      </div>

      {project.description && (
        <Card className="p-4 mb-6">
          <h3 className="text-sm font-medium text-text-primary mb-2">项目描述</h3>
          <p className="text-sm text-text-secondary whitespace-pre-wrap">{project.description}</p>
        </Card>
      )}

      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-medium">里程碑 ({milestones.length})</h3>
          <Button size="sm" onClick={openCreateMilestone}>+ 新增</Button>
        </div>
        {milestones.length === 0 ? (
          <EmptyState title="暂无里程碑" description="添加关键节点来追踪项目进度" actionLabel="+ 新增里程碑" onAction={openCreateMilestone} />
        ) : (
          <div className="space-y-2">
            {milestones.map(m => (
              <Card key={m.id} className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge className={MILESTONE_TYPE_COLORS[m.type]}>{MILESTONE_TYPE_LABELS[m.type]}</Badge>
                  <div>
                    <p className="text-sm font-medium">{m.title}</p>
                    <p className="text-xs text-text-secondary">{formatDate(m.date)}{m.note && ` · ${m.note}`}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="text-xs text-primary hover:underline cursor-pointer" onClick={() => openEditMilestone(m)}>编辑</button>
                  <button className="text-xs text-danger hover:underline cursor-pointer" onClick={() => setDeleteTarget({ type: 'milestone', id: m.id, name: m.title })}>删除</button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-medium">任务 ({tasks.length})</h3>
          <Button size="sm" onClick={openCreateTask}>+ 新增</Button>
        </div>
        {tasks.length === 0 ? (
          <EmptyState title="暂无任务" description="为这个项目创建任务" actionLabel="+ 新增任务" onAction={openCreateTask} />
        ) : (
          <div className="space-y-2">
            {tasks.map(t => (
              <Card key={t.id} className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <TaskStatusBadge status={t.status} />
                  <div>
                    <p className="text-sm font-medium">{t.title}</p>
                    <p className="text-xs text-text-secondary">
                      {t.dueDate && `截止: ${formatDate(t.dueDate)}`}
                      {t.estimatedHours > 0 && ` · 预估 ${t.estimatedHours}h`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <PriorityBadge priority={t.priority} />
                  <button className="text-xs text-primary hover:underline cursor-pointer" onClick={() => openEditTask(t)}>编辑</button>
                  <button className="text-xs text-danger hover:underline cursor-pointer" onClick={() => setDeleteTarget({ type: 'task', id: t.id, name: t.title })}>删除</button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Modal open={showMilestoneForm} onClose={() => setShowMilestoneForm(false)} title={editingMilestoneId ? '编辑里程碑' : '新建里程碑'}>
        <div className="space-y-4">
          <FormField label="标题" required error={errors.title}>
            <input className={inputClass} value={milestoneForm.title} onChange={e => setMilestoneForm({ ...milestoneForm, title: e.target.value })} />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="日期" required error={errors.date}>
              <input type="date" className={inputClass} value={milestoneForm.date} onChange={e => setMilestoneForm({ ...milestoneForm, date: e.target.value })} />
            </FormField>
            <FormField label="类型">
              <select className={selectClass} value={milestoneForm.type} onChange={e => setMilestoneForm({ ...milestoneForm, type: e.target.value as MilestoneType })}>
                {Object.entries(MILESTONE_TYPE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </FormField>
          </div>
          <FormField label="备注">
            <textarea className={textareaClass} rows={2} value={milestoneForm.note} onChange={e => setMilestoneForm({ ...milestoneForm, note: e.target.value })} />
          </FormField>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowMilestoneForm(false)}>取消</Button>
            <Button onClick={handleMilestoneSubmit}>{editingMilestoneId ? '保存' : '创建'}</Button>
          </div>
        </div>
      </Modal>

      <Modal open={showTaskForm} onClose={() => setShowTaskForm(false)} title={editingTaskId ? '编辑任务' : '新建任务'} width="max-w-xl">
        <div className="space-y-4">
          <FormField label="任务标题" required error={errors.title}>
            <input className={inputClass} value={taskForm.title} onChange={e => setTaskForm({ ...taskForm, title: e.target.value })} />
          </FormField>
          <FormField label="描述">
            <textarea className={textareaClass} rows={3} value={taskForm.description} onChange={e => setTaskForm({ ...taskForm, description: e.target.value })} />
          </FormField>
          <div className="grid grid-cols-3 gap-4">
            <FormField label="状态">
              <select className={selectClass} value={taskForm.status} onChange={e => setTaskForm({ ...taskForm, status: e.target.value as TaskStatus })}>
                {Object.entries(TASK_STATUS_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </FormField>
            <FormField label="优先级">
              <select className={selectClass} value={taskForm.priority} onChange={e => setTaskForm({ ...taskForm, priority: e.target.value as TaskPriority })}>
                {Object.entries(PRIORITY_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </FormField>
            <FormField label="阶段">
              <input className={inputClass} value={taskForm.stage} onChange={e => setTaskForm({ ...taskForm, stage: e.target.value })} placeholder="如: 设计、制作" />
            </FormField>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <FormField label="开始日期">
              <input type="date" className={inputClass} value={taskForm.startDate} onChange={e => setTaskForm({ ...taskForm, startDate: e.target.value })} />
            </FormField>
            <FormField label="截止日期">
              <input type="date" className={inputClass} value={taskForm.dueDate} onChange={e => setTaskForm({ ...taskForm, dueDate: e.target.value })} />
            </FormField>
            <FormField label="预估工时(h)">
              <input type="number" className={inputClass} min={0} step={0.5} value={taskForm.estimatedHours || ''} onChange={e => setTaskForm({ ...taskForm, estimatedHours: parseFloat(e.target.value) || 0 })} />
            </FormField>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowTaskForm(false)}>取消</Button>
            <Button onClick={handleTaskSubmit}>{editingTaskId ? '保存' : '创建'}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="确认删除"
        message={`确定要删除${deleteTarget?.type === 'milestone' ? '里程碑' : '任务'}「${deleteTarget?.name}」吗？`}
        confirmText="删除"
        danger
      />
    </>
  )
}

import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/database'
import { useAssignments } from '../hooks/useAssignments'
import { usePeople } from '../hooks/usePeople'
import { PageHeader } from '../components/PageHeader'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { Badge } from '../components/Badge'
import { TaskStatusBadge } from '../components/StatusBadge'
import { PriorityBadge } from '../components/PriorityBadge'
import { EmptyState } from '../components/EmptyState'
import { ConfirmModal } from '../components/ConfirmModal'
import { Modal } from '../components/Modal'
import { FormField } from '../components/FormField'
import { selectClass } from '../components/formFieldClasses'
import { useSettings } from '../hooks/useSettings'
import { formatDateFull } from '../utils/date'
import { MILESTONE_TYPE_LABELS, MILESTONE_TYPE_COLORS, ASSIGNMENT_STATUS_LABELS } from '../constants'
import type { AssignmentStatus } from '../types/assignment'
import { compareTaskUrgency } from '../utils/sort'
import dayjs from 'dayjs'

export function DailyPlannerPage() {
  const { date } = useParams<{ date: string }>()
  const navigate = useNavigate()
  const currentDate = date || dayjs().format('YYYY-MM-DD')

  const { assignments, addAssignment, updateAssignment, deleteAssignment } = useAssignments(currentDate)
  const { activePeople } = usePeople()
  const { setting, updateSetting } = useSettings()

  const dayMilestones = useLiveQuery(
    () => db.milestones.where('date').equals(currentDate).toArray(),
    [currentDate]
  ) ?? []

  const dayTasks = useLiveQuery(async () => {
    const tasksByDue = await db.tasks.where('dueDate').equals(currentDate).toArray()
    const assignedTaskIds = assignments.map(a => a.taskId)
    const assignedTasks = assignedTaskIds.length > 0
      ? await db.tasks.where('id').anyOf(assignedTaskIds).toArray()
      : []
    const allTaskMap = new Map([...tasksByDue, ...assignedTasks].map(t => [t.id, t]))
    return Array.from(allTaskMap.values())
  }, [currentDate, assignments.length]) ?? []

  const allUnassignedTasks = useLiveQuery(async () => {
    const allTasks = await db.tasks.filter(t => t.status !== 'completed').toArray()
    const assignedTaskIdsForDate = new Set(assignments.map(a => a.taskId))
    return allTasks
      .filter(t => !assignedTaskIdsForDate.has(t.id))
      .sort(compareTaskUrgency)
  }, [assignments.length]) ?? []

  const projects = useLiveQuery(() => db.projects.toArray()) ?? []
  const projectMap = new Map(projects.map(p => [p.id, p]))

  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState('')
  const [selectedPersonId, setSelectedPersonId] = useState('')
  const [removeTarget, setRemoveTarget] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (!setting || setting.lastOpenedDate === currentDate) return
    void updateSetting({ lastOpenedDate: currentDate })
  }, [currentDate, setting, updateSetting])

  const openAssignModal = (taskId = '') => {
    setSelectedTaskId(taskId)
    setAssignModalOpen(true)
  }

  const handleAssign = async () => {
    if (!selectedTaskId || !selectedPersonId) return
    try {
      const task = dayTasks.find(t => t.id === selectedTaskId) || allUnassignedTasks.find(t => t.id === selectedTaskId)
      await addAssignment({
        date: currentDate,
        taskId: selectedTaskId,
        personId: selectedPersonId,
        projectId: task?.projectId ?? '',
        assignmentStatus: 'assigned',
        note: '',
      })
      setAssignModalOpen(false)
      setSelectedTaskId('')
      setSelectedPersonId('')
      setMessage({ type: 'success', text: '任务已分配' })
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : `分配失败: ${String(err)}` })
    }
  }

  const handleStatusChange = async (assignmentId: string, newStatus: AssignmentStatus) => {
    await updateAssignment(assignmentId, { assignmentStatus: newStatus })
  }

  const prevDay = dayjs(currentDate).subtract(1, 'day').format('YYYY-MM-DD')
  const nextDay = dayjs(currentDate).add(1, 'day').format('YYYY-MM-DD')

  const personAssignments = (personId: string) => assignments.filter(a => a.personId === personId)

  return (
    <>
      <PageHeader
        title={formatDateFull(currentDate)}
        subtitle="当日安排"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => navigate(`/planner/${prevDay}`)}>前一天</Button>
            <Button variant="secondary" size="sm" onClick={() => navigate(`/planner/${dayjs().format('YYYY-MM-DD')}`)}>今天</Button>
            <Button variant="secondary" size="sm" onClick={() => navigate(`/planner/${nextDay}`)}>后一天</Button>
            <Button onClick={() => openAssignModal()}>+ 分配任务</Button>
          </div>
        }
      />

      {message && (
        <div className={`mb-4 rounded-md p-3 text-sm ${message.type === 'success' ? 'bg-accent-teal/10 text-accent-teal' : 'bg-danger/10 text-danger'}`}>
          {message.text}
        </div>
      )}

      {dayMilestones.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-text-primary mb-2">当日里程碑</h3>
          <div className="flex flex-wrap gap-2">
            {dayMilestones.map(m => (
              <Badge key={m.id} className={MILESTONE_TYPE_COLORS[m.type]}>
                {MILESTONE_TYPE_LABELS[m.type]}: {m.title}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <h3 className="text-sm font-medium text-text-primary mb-3">人员分配</h3>
          {activePeople.length === 0 ? (
            <EmptyState title="暂无人员" description="先到人员页面添加工作室成员" />
          ) : (
            <div className="space-y-4">
              {activePeople.map(person => {
                const pa = personAssignments(person.id)
                return (
                  <Card key={person.id} className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h4 className="text-sm font-medium">{person.name}</h4>
                        <p className="text-xs text-text-secondary">{person.role}</p>
                      </div>
                      <span className="text-xs text-text-muted">{pa.length} 项任务</span>
                    </div>
                    {pa.length === 0 ? (
                      <p className="text-xs text-text-muted py-2">暂无分配</p>
                    ) : (
                      <div className="space-y-1.5">
                        {pa.map(a => {
                          const task = dayTasks.find(t => t.id === a.taskId)
                          const project = task ? projectMap.get(task.projectId) : undefined
                          return (
                            <div key={a.id} className="flex items-center justify-between py-1.5 px-2 bg-bg-main rounded">
                              <div className="flex items-center gap-2 min-w-0">
                                {task && <TaskStatusBadge status={task.status} />}
                                <div className="min-w-0">
                                  <p className="text-xs font-medium truncate">{task?.title ?? '未知任务'}</p>
                                  {project && <p className="text-xs text-text-muted">{project.name}</p>}
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <select
                                  className="text-xs border border-border rounded px-1 py-0.5 bg-white"
                                  value={a.assignmentStatus}
                                  onChange={e => handleStatusChange(a.id, e.target.value as AssignmentStatus)}
                                >
                                  {Object.entries(ASSIGNMENT_STATUS_LABELS).map(([key, label]) => (
                                    <option key={key} value={key}>{label}</option>
                                  ))}
                                </select>
                                <button
                                  className="text-xs text-danger hover:underline cursor-pointer"
                                  onClick={() => setRemoveTarget(a.id)}
                                >
                                  移除
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </Card>
                )
              })}
            </div>
          )}
        </div>

        <div>
          <h3 className="text-sm font-medium text-text-primary mb-3">
            未分配任务池 ({allUnassignedTasks.length})
          </h3>
          {allUnassignedTasks.length === 0 ? (
            <p className="text-xs text-text-muted py-4">所有任务都已分配</p>
          ) : (
            <div className="space-y-1.5 max-h-[60vh] overflow-y-auto">
              {allUnassignedTasks.slice(0, 50).map(task => {
                const project = projectMap.get(task.projectId)
                return (
                  <Card key={task.id} className="p-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{task.title}</p>
                        <p className="text-xs text-text-muted">
                          {project && (
                            <span className="inline-flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: project.color }} />
                              {project.name}
                            </span>
                          )}
                        </p>
                      </div>
                      <PriorityBadge priority={task.priority} />
                    </div>
                    <button
                      className="mt-2 text-xs text-primary hover:underline cursor-pointer"
                      onClick={() => openAssignModal(task.id)}
                    >
                      立即分配
                    </button>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <Modal open={assignModalOpen} onClose={() => setAssignModalOpen(false)} title="分配任务">
        <div className="space-y-4">
          <FormField label="选择任务" required>
            <select className={selectClass} value={selectedTaskId} onChange={e => setSelectedTaskId(e.target.value)}>
              <option value="">请选择任务</option>
              {allUnassignedTasks.map(t => {
                const project = projectMap.get(t.projectId)
                return <option key={t.id} value={t.id}>{project ? `[${project.name}] ` : ''}{t.title}</option>
              })}
            </select>
          </FormField>
          <FormField label="分配给" required>
            <select className={selectClass} value={selectedPersonId} onChange={e => setSelectedPersonId(e.target.value)}>
              <option value="">请选择人员</option>
              {activePeople.map(p => (
                <option key={p.id} value={p.id}>{p.name} - {p.role}</option>
              ))}
            </select>
          </FormField>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setAssignModalOpen(false)}>取消</Button>
            <Button onClick={handleAssign} disabled={!selectedTaskId || !selectedPersonId}>确认分配</Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        open={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        onConfirm={async () => { if (removeTarget) { await deleteAssignment(removeTarget); setRemoveTarget(null) } }}
        title="取消分配"
        message="确定要取消这项分配吗？"
        confirmText="取消分配"
        danger
      />
    </>
  )
}

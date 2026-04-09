import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import type { DateClickArg } from '@fullcalendar/interaction'
import type { EventClickArg, EventInput } from '@fullcalendar/core'
import { db } from '../db/database'
import { useAssignments } from '../hooks/useAssignments'
import { usePeople } from '../hooks/usePeople'
import { useSettings } from '../hooks/useSettings'
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
import { formatDateCN, formatDateFull } from '../utils/date'
import { ASSIGNMENT_STATUS_LABELS, MILESTONE_TYPE_LABELS } from '../constants'
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

  const allProjects = useLiveQuery(() => db.projects.orderBy('deadline').toArray(), []) ?? []
  const allMilestones = useLiveQuery(() => db.milestones.orderBy('date').toArray(), []) ?? []

  const dayTasks = useLiveQuery(async () => {
    const tasksByDue = await db.tasks.where('dueDate').equals(currentDate).toArray()
    const assignedTaskIds = assignments.map(assignment => assignment.taskId)
    const assignedTasks = assignedTaskIds.length > 0
      ? await db.tasks.where('id').anyOf(assignedTaskIds).toArray()
      : []

    const allTaskMap = new Map([...tasksByDue, ...assignedTasks].map(task => [task.id, task]))
    return Array.from(allTaskMap.values()).sort(compareTaskUrgency)
  }, [currentDate, assignments.length]) ?? []

  const allUnassignedTasks = useLiveQuery(async () => {
    const allTasks = await db.tasks.filter(task => task.status !== 'completed').toArray()
    const assignedTaskIdsForDate = new Set(assignments.map(assignment => assignment.taskId))

    return allTasks
      .filter(task => !assignedTaskIdsForDate.has(task.id))
      .sort(compareTaskUrgency)
  }, [assignments.length]) ?? []

  const projectMap = new Map(allProjects.map(project => [project.id, project]))
  const taskMap = new Map(dayTasks.map(task => [task.id, task]))
  const dayMilestones = allMilestones.filter(milestone => milestone.date === currentDate)
  const dayProjectDeadlines = allProjects.filter(project => project.deadline === currentDate && project.status !== 'completed')

  const calendarEvents: EventInput[] = [
    ...allProjects
      .filter(project => project.deadline && project.status !== 'completed')
      .map(project => ({
        id: `ddl-${project.id}`,
        title: `DDL: ${project.name}`,
        date: project.deadline,
        backgroundColor: project.color || '#4166F5',
        borderColor: project.color || '#4166F5',
        textColor: '#ffffff',
        extendedProps: { type: 'deadline', projectId: project.id },
      })),
    ...allMilestones.map(milestone => ({
      id: `ms-${milestone.id}`,
      title: milestone.title,
      date: milestone.date,
      backgroundColor: 'transparent',
      borderColor: '#39C5BB',
      textColor: '#39C5BB',
      extendedProps: { type: 'milestone' },
    })),
  ]

  const weeklyItems = [
    ...allProjects
      .filter(project => project.deadline >= currentDate && project.deadline <= dayjs(currentDate).add(7, 'day').format('YYYY-MM-DD') && project.status !== 'completed')
      .map(project => ({
        id: `project-${project.id}`,
        type: 'deadline' as const,
        title: project.name,
        date: project.deadline,
        color: project.color,
        targetPath: `/projects/${project.id}`,
      })),
    ...allMilestones
      .filter(milestone => milestone.date >= currentDate && milestone.date <= dayjs(currentDate).add(7, 'day').format('YYYY-MM-DD'))
      .map(milestone => ({
        id: `milestone-${milestone.id}`,
        type: 'milestone' as const,
        title: milestone.title,
        date: milestone.date,
        color: '#39C5BB',
        targetPath: `/planner/${milestone.date}`,
      })),
  ]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 8)

  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState('')
  const [selectedPersonId, setSelectedPersonId] = useState('')
  const [removeTarget, setRemoveTarget] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (!setting || setting.lastOpenedDate === currentDate) return
    void updateSetting({ lastOpenedDate: currentDate })
  }, [currentDate, setting, updateSetting])

  useEffect(() => {
    if (!message) return
    const timer = window.setTimeout(() => setMessage(null), 3000)
    return () => window.clearTimeout(timer)
  }, [message])

  const openAssignModal = (taskId = '') => {
    setSelectedTaskId(taskId)
    setAssignModalOpen(true)
  }

  const handleAssign = async () => {
    if (!selectedTaskId || !selectedPersonId) return

    try {
      const task = dayTasks.find(item => item.id === selectedTaskId) || allUnassignedTasks.find(item => item.id === selectedTaskId)
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

  const handleDateClick = (info: DateClickArg) => {
    navigate(`/planner/${info.dateStr}`)
  }

  const handleEventClick = (info: EventClickArg) => {
    const eventType = info.event.extendedProps.type
    const projectId = info.event.extendedProps.projectId as string | undefined

    if (eventType === 'deadline' && projectId) {
      navigate(`/projects/${projectId}`)
      return
    }

    navigate(`/planner/${info.event.startStr.slice(0, 10)}`)
  }

  const prevDay = dayjs(currentDate).subtract(1, 'day').format('YYYY-MM-DD')
  const nextDay = dayjs(currentDate).add(1, 'day').format('YYYY-MM-DD')

  const personAssignments = (personId: string) =>
    assignments
      .filter(assignment => assignment.personId === personId)
      .sort((a, b) => {
        const taskA = taskMap.get(a.taskId)
        const taskB = taskMap.get(b.taskId)
        if (!taskA || !taskB) return 0
        return compareTaskUrgency(taskA, taskB)
      })

  const statCards = [
    { label: '已分配任务', value: assignments.length, helper: '当天已进入执行的任务' },
    { label: '待分配任务', value: allUnassignedTasks.length, helper: '仍可派发给成员' },
    { label: '到期事项', value: dayProjectDeadlines.length + dayMilestones.length, helper: 'DDL 与里程碑' },
    { label: '关联任务', value: dayTasks.length, helper: '今天需要关注的任务' },
  ]

  return (
    <>
      <PageHeader
        title="日程"
        subtitle={`${formatDateFull(currentDate)} · 执行安排、月历节点与待分配任务合并视图`}
        actions={
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <Button variant="secondary" size="sm" onClick={() => navigate(`/planner/${prevDay}`)}>前一天</Button>
            <Button variant="secondary" size="sm" onClick={() => navigate(`/planner/${dayjs().format('YYYY-MM-DD')}`)}>今天</Button>
            <Button variant="secondary" size="sm" onClick={() => navigate(`/planner/${nextDay}`)}>后一天</Button>
            <Button onClick={() => openAssignModal()}>+ 分配任务</Button>
          </div>
        }
      />

      {message && (
        <div className={`mb-4 rounded-xl border px-4 py-3 text-sm shadow-[var(--shadow-xs)] ${message.type === 'success' ? 'border-accent-teal/20 bg-accent-teal/8 text-accent-teal' : 'border-danger/20 bg-danger/8 text-danger'}`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {statCards.map(card => (
          <Card key={card.label} className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-text-muted">{card.label}</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-text-primary">{card.value}</p>
            <p className="mt-1 text-xs text-text-secondary">{card.helper}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.7fr)_minmax(360px,0.95fr)] gap-6">
        <div className="space-y-6">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-text-primary">今日焦点</h3>
                <p className="text-sm text-text-secondary mt-1">把截止项目、里程碑和相关任务放在同一层查看</p>
              </div>
              <Badge className="bg-primary/8 text-primary">{dayjs(currentDate).format('M月D日')}</Badge>
            </div>

            {dayProjectDeadlines.length === 0 && dayMilestones.length === 0 && dayTasks.length === 0 ? (
              <p className="text-sm text-text-muted py-4">这一天没有截止事项和已挂钩任务，适合安排新工作。</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-xl bg-danger/6 border border-danger/10 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-danger mb-3">项目 DDL</p>
                  <div className="space-y-2">
                    {dayProjectDeadlines.length === 0 ? (
                      <p className="text-xs text-text-muted">没有项目在这天截止</p>
                    ) : (
                      dayProjectDeadlines.map(project => (
                        <button
                          key={project.id}
                          className="w-full text-left rounded-lg bg-white px-3 py-2 shadow-[var(--shadow-xs)] hover:shadow-[var(--shadow-sm)] cursor-pointer"
                          onClick={() => navigate(`/projects/${project.id}`)}
                        >
                          <p className="text-sm font-medium text-text-primary">{project.name}</p>
                          <p className="text-xs text-text-secondary mt-1">{project.clientOrSource || project.type || '项目详情'}</p>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-xl bg-accent-teal/7 border border-accent-teal/12 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-accent-teal mb-3">里程碑</p>
                  <div className="space-y-2">
                    {dayMilestones.length === 0 ? (
                      <p className="text-xs text-text-muted">没有里程碑安排</p>
                    ) : (
                      dayMilestones.map(milestone => (
                        <div key={milestone.id} className="rounded-lg bg-white px-3 py-2 shadow-[var(--shadow-xs)]">
                          <p className="text-sm font-medium text-text-primary">{milestone.title}</p>
                          <p className="text-xs text-text-secondary mt-1">{MILESTONE_TYPE_LABELS[milestone.type]}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-xl bg-primary/6 border border-primary/10 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-primary mb-3">相关任务</p>
                  <div className="space-y-2">
                    {dayTasks.length === 0 ? (
                      <p className="text-xs text-text-muted">暂无关联任务</p>
                    ) : (
                      dayTasks.slice(0, 5).map(task => {
                        const project = projectMap.get(task.projectId)
                        return (
                          <div key={task.id} className="rounded-lg bg-white px-3 py-2 shadow-[var(--shadow-xs)]">
                            <p className="text-sm font-medium text-text-primary">{task.title}</p>
                            <p className="text-xs text-text-secondary mt-1">{project?.name || '未归属项目'}</p>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              </div>
            )}
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-text-primary">人员分配</h3>
                <p className="text-sm text-text-secondary mt-1">按成员查看当天任务和执行状态，减少来回切换</p>
              </div>
              <Button size="sm" variant="secondary" onClick={() => openAssignModal()}>新增分配</Button>
            </div>

            {activePeople.length === 0 ? (
              <EmptyState title="暂无人员" description="先到人员页面添加工作室成员" />
            ) : (
              <div className="space-y-4">
                {activePeople.map(person => {
                  const relatedAssignments = personAssignments(person.id)
                  return (
                    <div key={person.id} className="rounded-2xl border border-border bg-bg-main/55 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="text-sm font-semibold text-text-primary">{person.name}</h4>
                          <p className="text-xs text-text-secondary">{person.role || '未设置角色'}</p>
                        </div>
                        <Badge>{relatedAssignments.length} 项任务</Badge>
                      </div>

                      {relatedAssignments.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-border px-4 py-5 text-center">
                          <p className="text-xs text-text-muted">当天暂无分配，可以从右侧任务池快速安排</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {relatedAssignments.map(assignment => {
                            const task = taskMap.get(assignment.taskId)
                            const project = task ? projectMap.get(task.projectId) : undefined
                            return (
                              <div key={assignment.id} className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-3 shadow-[var(--shadow-xs)]">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  {task && <TaskStatusBadge status={task.status} />}
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium text-text-primary truncate">{task?.title ?? '未知任务'}</p>
                                    <p className="text-xs text-text-secondary mt-1 truncate">
                                      {project?.name || '未归属项目'}
                                      {task?.dueDate ? ` · ${task.dueDate}` : ''}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <select
                                    className="text-xs border border-border rounded-lg px-2 py-1 bg-white"
                                    value={assignment.assignmentStatus}
                                    onChange={e => handleStatusChange(assignment.id, e.target.value as AssignmentStatus)}
                                  >
                                    {Object.entries(ASSIGNMENT_STATUS_LABELS).map(([key, label]) => (
                                      <option key={key} value={key}>{label}</option>
                                    ))}
                                  </select>
                                  <button
                                    className="text-xs text-danger hover:underline cursor-pointer"
                                    onClick={() => setRemoveTarget(assignment.id)}
                                  >
                                    移除
                                  </button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6 xl:sticky xl:top-6 self-start">
          <Card className="p-5">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h3 className="text-base font-semibold text-text-primary">月历总览</h3>
                <p className="text-sm text-text-secondary mt-1">在同一页切换日期，查看 DDL 与里程碑</p>
              </div>
              <div className="space-y-1 text-right">
                <div className="flex items-center justify-end gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-primary inline-block" />
                  <span className="text-[11px] text-text-secondary">项目 DDL</span>
                </div>
                <div className="flex items-center justify-end gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm border-2 border-accent-teal inline-block" />
                  <span className="text-[11px] text-text-secondary">里程碑</span>
                </div>
              </div>
            </div>

            <div className="calendar-container schedule-calendar rounded-2xl border border-border-light bg-bg-main/45 p-3">
              <FullCalendar
                key={currentDate}
                plugins={[dayGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                initialDate={currentDate}
                locale="zh-cn"
                events={calendarEvents}
                dateClick={handleDateClick}
                eventClick={handleEventClick}
                headerToolbar={{
                  left: 'prev,next',
                  center: 'title',
                  right: 'today',
                }}
                buttonText={{
                  today: '回到今天',
                }}
                height="auto"
                dayMaxEvents={2}
                fixedWeekCount={false}
              />
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-text-primary">未来 7 天关键节点</h3>
                <p className="text-sm text-text-secondary mt-1">把近期项目压力和关键节点先排出来</p>
              </div>
              <Badge className="bg-warning/10 text-warning">{weeklyItems.length} 条</Badge>
            </div>

            {weeklyItems.length === 0 ? (
              <p className="text-sm text-text-muted py-3">未来一周没有新的关键节点。</p>
            ) : (
              <div className="space-y-2">
                {weeklyItems.map(item => (
                  <button
                    key={item.id}
                    className="w-full rounded-xl border border-border px-3 py-3 text-left hover:border-primary/20 hover:shadow-[var(--shadow-xs)] cursor-pointer"
                    onClick={() => navigate(item.targetPath)}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">{item.title}</p>
                        <p className="text-xs text-text-secondary mt-1">{formatDateCN(item.date)}</p>
                      </div>
                      <Badge className={item.type === 'deadline' ? 'bg-primary/8 text-primary' : 'bg-accent-teal/10 text-accent-teal'}>
                        {item.type === 'deadline' ? '项目 DDL' : '里程碑'}
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-text-primary">待分配任务池</h3>
                <p className="text-sm text-text-secondary mt-1">按优先级和紧急程度自动排序</p>
              </div>
              <Badge>{allUnassignedTasks.length}</Badge>
            </div>

            {allUnassignedTasks.length === 0 ? (
              <p className="text-sm text-text-muted py-2">当前可执行任务都已经安排完了。</p>
            ) : (
              <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
                {allUnassignedTasks.slice(0, 24).map(task => {
                  const project = projectMap.get(task.projectId)
                  return (
                    <div key={task.id} className="rounded-xl border border-border px-3 py-3 hover:border-primary/20 hover:shadow-[var(--shadow-xs)]">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-text-primary truncate">{task.title}</p>
                          <p className="text-xs text-text-secondary mt-1">
                            {project?.name || '未归属项目'}
                            {task.dueDate ? ` · 截止 ${task.dueDate}` : ''}
                          </p>
                        </div>
                        <PriorityBadge priority={task.priority} />
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <p className="text-xs text-text-muted truncate">{task.stage || '未设置阶段'}</p>
                        <button
                          className="text-xs text-primary hover:underline cursor-pointer"
                          onClick={() => openAssignModal(task.id)}
                        >
                          立即分配
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </div>
      </div>

      <Modal open={assignModalOpen} onClose={() => setAssignModalOpen(false)} title="分配任务">
        <div className="space-y-4">
          <FormField label="选择任务" required>
            <select className={selectClass} value={selectedTaskId} onChange={e => setSelectedTaskId(e.target.value)}>
              <option value="">请选择任务</option>
              {allUnassignedTasks.map(task => {
                const project = projectMap.get(task.projectId)
                return <option key={task.id} value={task.id}>{project ? `[${project.name}] ` : ''}{task.title}</option>
              })}
            </select>
          </FormField>
          <FormField label="分配给" required>
            <select className={selectClass} value={selectedPersonId} onChange={e => setSelectedPersonId(e.target.value)}>
              <option value="">请选择人员</option>
              {activePeople.map(person => (
                <option key={person.id} value={person.id}>{person.name} - {person.role || '未设置角色'}</option>
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
        onConfirm={async () => {
          if (!removeTarget) return
          await deleteAssignment(removeTarget)
          setRemoveTarget(null)
          setMessage({ type: 'success', text: '分配已移除' })
        }}
        title="取消分配"
        message="确定要取消这项分配吗？"
        confirmText="取消分配"
        danger
      />
    </>
  )
}

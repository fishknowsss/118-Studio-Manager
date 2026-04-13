import { useEffect, useMemo, useState, type DragEvent } from 'react'
import { DashboardHeader } from '../features/dashboard/DashboardHeader'
import { DashboardMiniCalendar } from '../features/dashboard/DashboardMiniCalendar'
import { FocusPrimaryCard } from '../features/dashboard/FocusPrimaryCard'
import { FocusSecondaryCards } from '../features/dashboard/FocusSecondaryCards'
import { PeopleAssignmentPanel } from '../features/dashboard/PeopleAssignmentPanel'
import { PersonDetailPanel } from '../features/dashboard/PersonDetailPanel'
import { ProjectDetailPanel } from '../features/dashboard/ProjectDetailPanel'
import { TaskPoolPanel } from '../features/dashboard/TaskPoolPanel'
import { ExpandPanel } from '../components/ui/ExpandPanel'
import { usePlanner } from '../features/planner/PlannerProvider'
import { assignTaskToPerson } from '../legacy/actions'
import {
  buildDashboardHeaderModel,
  buildDashboardFocusCards,
  buildDashboardMiniCalendarModel,
  buildPersonCardModels,
  buildEntityMaps,
  buildProjectEventSummaryMap,
  getActivePeople,
  getDashboardFocusData,
  getTaskPool,
  getTopProjects,
} from '../legacy/selectors'
import { type LegacyProject, getTaskAssigneeIds } from '../legacy/store'
import { useLegacyStoreSnapshot } from '../legacy/useLegacyStore'
import { formatLocalDateKey } from '../legacy/utils'
import { Tasks } from './Tasks'
import { People } from './People'
import { Calendar } from './Calendar'

type Origin = { ox: number; oy: number }
type ExpandedPanel =
  | ({ type: 'tasks' }    & Origin)
  | ({ type: 'people' }   & Origin)
  | ({ type: 'calendar' } & Origin)
  | ({ type: 'project'; projectId: string } & Origin)
  | ({ type: 'person'; personId: string } & Origin)
  | null

function getPanelTitle(panel: NonNullable<ExpandedPanel>, projects: LegacyProject[], people: { id: string; name?: string }[]): string {
  if (panel.type === 'tasks') return '全部任务'
  if (panel.type === 'people') return '团队成员'
  if (panel.type === 'calendar') return '项目日历'
  if (panel.type === 'person') {
    const person = people.find((p) => p.id === panel.personId)
    return person?.name || '成员详情'
  }
  const proj = projects.find((p) => p.id === panel.projectId)
  return proj?.name || '项目详情'
}

export function Dashboard() {
  const store = useLegacyStoreSnapshot()
  const { projects, tasks, people } = store
  const { openPlanner } = usePlanner()

  const [calDate, setCalDate] = useState(() => new Date())
  const [draggingPersonId, setDraggingPersonId] = useState<string | null>(null)
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null)
  const [dropOverPersonId, setDropOverPersonId] = useState<string | null>(null)
  const [dropOverTaskId, setDropOverTaskId] = useState<string | null>(null)
  const [expandedPanel, setExpandedPanel] = useState<ExpandedPanel>(null)
  const [dateObj, setDateObj] = useState(() => new Date())
  const todayStr = useMemo(() => formatLocalDateKey(dateObj), [dateObj])

  useEffect(() => {
    const now = new Date()
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0)
    const id = setTimeout(() => setDateObj(new Date()), midnight.getTime() - now.getTime())
    return () => clearTimeout(id)
  }, [dateObj])

  const entityMaps = useMemo(() => buildEntityMaps(projects, tasks, people), [people, projects, tasks])
  const topProjects = useMemo(() => getTopProjects(projects, 8, todayStr), [projects, todayStr])
  const focusCards = useMemo(() => buildDashboardFocusCards(projects, tasks, todayStr), [projects, tasks, todayStr])
  const taskPool = useMemo(() => getTaskPool(tasks), [tasks])
  const activePeople = useMemo(() => getActivePeople(people), [people])
  const activePersonCards = useMemo(() => buildPersonCardModels(activePeople, tasks), [activePeople, tasks])
  const poolRows = useMemo(() => taskPool.map((task) => ({
    ...task,
    people: getTaskAssigneeIds(task).map((id) => entityMaps.peopleById[id]).filter(Boolean),
    project: task.projectId ? entityMaps.projectsById[task.projectId] : null,
  })), [entityMaps.peopleById, entityMaps.projectsById, taskPool])
  const eventMap = useMemo(() => buildProjectEventSummaryMap(projects), [projects])
  const headerModel = useMemo(() => buildDashboardHeaderModel(dateObj), [dateObj])
  const calendarModel = useMemo(() => buildDashboardMiniCalendarModel(calDate, eventMap, todayStr), [calDate, eventMap, todayStr])

  const focusProj = topProjects[0] as LegacyProject | undefined
  const focusData = useMemo(() => getDashboardFocusData(focusProj, tasks, todayStr), [focusProj, tasks, todayStr])
  const primaryFocusTone = focusCards[0]?.urgencyKey || 'focus-neutral'

  const clearDragState = () => {
    setDraggingPersonId(null)
    setDraggingTaskId(null)
    setDropOverPersonId(null)
    setDropOverTaskId(null)
  }

  const readTransferData = (event: DragEvent<HTMLDivElement>, type: string) => {
    return event.dataTransfer.getData(type)
  }

  const handleTaskDragStart = (event: DragEvent<HTMLDivElement>, taskId: string) => {
    setDraggingTaskId(taskId)
    setDraggingPersonId(null)
    setDropOverTaskId(null)
    event.dataTransfer.setData('text/task-id', taskId)
    event.dataTransfer.setData('application/x-118studio-task-id', taskId)
    event.dataTransfer.effectAllowed = 'move'
  }

  const handlePersonDragStart = (event: DragEvent<HTMLDivElement>, personId: string) => {
    setDraggingPersonId(personId)
    setDraggingTaskId(null)
    setDropOverPersonId(null)
    event.dataTransfer.setData('application/x-118studio-person-id', personId)
    event.dataTransfer.effectAllowed = 'move'
  }

  const handleDropToPerson = (event: DragEvent<HTMLDivElement>, personId: string) => {
    event.preventDefault()
    setDropOverPersonId(null)
    const taskId = draggingTaskId
      || readTransferData(event, 'application/x-118studio-task-id')
      || readTransferData(event, 'text/task-id')
    if (!taskId) { clearDragState(); return }
    void assignTaskToPerson(taskId, personId)
    clearDragState()
  }

  const handleDragOverPerson = (event: DragEvent<HTMLDivElement>, personId: string) => {
    const taskId = draggingTaskId
      || readTransferData(event, 'application/x-118studio-task-id')
      || readTransferData(event, 'text/task-id')
    if (!taskId) return
    event.preventDefault()
    setDropOverPersonId(personId)
  }

  const handleDropToTask = (event: DragEvent<HTMLDivElement>, taskId: string) => {
    event.preventDefault()
    setDropOverTaskId(null)
    const personId = draggingPersonId || readTransferData(event, 'application/x-118studio-person-id')
    if (!personId) { clearDragState(); return }
    void assignTaskToPerson(taskId, personId)
    clearDragState()
  }

  const handleDragOverTask = (event: DragEvent<HTMLDivElement>, taskId: string) => {
    const personId = draggingPersonId || readTransferData(event, 'application/x-118studio-person-id')
    if (!personId) return
    event.preventDefault()
    setDropOverTaskId(taskId)
  }

  const closePanel = () => setExpandedPanel(null)

  return (
    <div className="dashboard fade-in">
      <DashboardHeader model={headerModel} />

      <div className="today-focus">
        <div className="focus-label">今日焦点</div>
        <div className="focus-cards">
          {!focusProj ? (
            <div className="focus-empty">暂无活跃项目 — 新建一个开始吧</div>
          ) : (
            <>
              <FocusPrimaryCard
                focusData={focusData}
                project={focusProj}
                toneKey={primaryFocusTone}
                onExpandProject={(ox, oy) => setExpandedPanel({ type: 'project', projectId: focusProj.id, ox, oy })}
              />
              <FocusSecondaryCards
                cards={focusCards.slice(1)}
                onExpandProject={(id, ox, oy) => setExpandedPanel({ type: 'project', projectId: id, ox, oy })}
                showSingleProjectEmpty={topProjects.length === 1}
              />
            </>
          )}
        </div>
      </div>

      <div className="dash-bottom">
        <TaskPoolPanel
          dragOverTaskId={dropOverTaskId}
          draggingPersonId={draggingPersonId}
          onDragLeaveTask={() => setDropOverTaskId(null)}
          onDragOverTask={handleDragOverTask}
          onDropToTask={handleDropToTask}
          onExpand={(ox, oy) => setExpandedPanel({ type: 'tasks', ox, oy })}
          onTaskDragEnd={clearDragState}
          onTaskDragStart={handleTaskDragStart}
          tasks={poolRows}
        />
        <PeopleAssignmentPanel
          dragOverPersonId={dropOverPersonId}
          draggingTaskId={draggingTaskId}
          onDragLeavePerson={() => setDropOverPersonId(null)}
          onDragOverPerson={handleDragOverPerson}
          onExpand={(ox, oy) => setExpandedPanel({ type: 'people', ox, oy })}
          onDropToPerson={handleDropToPerson}
          onPersonDragEnd={clearDragState}
          onPersonDragStart={handlePersonDragStart}
          onPersonClick={(personId, ox, oy) => setExpandedPanel({ type: 'person', personId, ox, oy })}
          people={activePersonCards}
        />
        <DashboardMiniCalendar
          model={calendarModel}
          onExpand={(ox, oy) => setExpandedPanel({ type: 'calendar', ox, oy })}
          onNextMonth={() => setCalDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
          onOpenDate={(dateKey, ox, oy) => openPlanner(dateKey, ox, oy)}
          onPrevMonth={() => setCalDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
        />
      </div>

      {expandedPanel ? (
        <ExpandPanel
          title={getPanelTitle(expandedPanel, projects, people)}
          originX={expandedPanel.ox}
          originY={expandedPanel.oy}
          onClose={closePanel}
        >
          {expandedPanel.type === 'tasks' && <Tasks />}
          {expandedPanel.type === 'people' && <People />}
          {expandedPanel.type === 'calendar' && <Calendar />}
          {expandedPanel.type === 'project' && (
            <ProjectDetailPanel projectId={expandedPanel.projectId} />
          )}
          {expandedPanel.type === 'person' && (
            <PersonDetailPanel personId={expandedPanel.personId} />
          )}
        </ExpandPanel>
      ) : null}
    </div>
  )
}

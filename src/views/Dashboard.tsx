import { useMemo, useState, type DragEvent } from 'react'
import { DashboardHeader } from '../features/dashboard/DashboardHeader'
import { DashboardMiniCalendar } from '../features/dashboard/DashboardMiniCalendar'
import { FocusPrimaryCard } from '../features/dashboard/FocusPrimaryCard'
import { FocusSecondaryCards } from '../features/dashboard/FocusSecondaryCards'
import { PeopleAssignmentPanel } from '../features/dashboard/PeopleAssignmentPanel'
import { TaskPoolPanel } from '../features/dashboard/TaskPoolPanel'
import { usePlanner } from '../features/planner/PlannerProvider'
import { getRandMotivation, getRandQuote } from '../content/quotes'
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
import { type LegacyProject } from '../legacy/store'
import { useLegacyStoreSnapshot } from '../legacy/useLegacyStore'
import { today } from '../legacy/utils'

export function Dashboard() {
  const store = useLegacyStoreSnapshot()
  const { projects, tasks, people } = store
  const { openPlanner } = usePlanner()

  const [calDate, setCalDate] = useState(() => new Date())
  const [draggingPersonId, setDraggingPersonId] = useState<string | null>(null)
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null)
  const [dropOverPersonId, setDropOverPersonId] = useState<string | null>(null)
  const [dropOverTaskId, setDropOverTaskId] = useState<string | null>(null)
  const quote = useMemo(() => getRandQuote(), [])
  const motivation = useMemo(() => getRandMotivation(), [])
  const dateObj = useMemo(() => new Date(), [])
  const todayStr = today()

  const entityMaps = useMemo(() => buildEntityMaps(projects, tasks, people), [people, projects, tasks])
  const topProjects = useMemo(() => getTopProjects(projects), [projects])
  const focusCards = useMemo(() => buildDashboardFocusCards(projects, tasks, todayStr), [projects, tasks, todayStr])
  const taskPool = useMemo(() => getTaskPool(tasks), [tasks])
  const activePeople = useMemo(() => getActivePeople(people), [people])
  const activePersonCards = useMemo(() => buildPersonCardModels(activePeople, tasks), [activePeople, tasks])
  const poolRows = useMemo(() => taskPool.map((task) => ({
    ...task,
    person: task.assigneeId ? entityMaps.peopleById[task.assigneeId] : null,
    project: task.projectId ? entityMaps.projectsById[task.projectId] : null,
  })), [entityMaps.peopleById, entityMaps.projectsById, taskPool])
  const eventMap = useMemo(() => buildProjectEventSummaryMap(projects), [projects])
  const headerModel = useMemo(() => buildDashboardHeaderModel(dateObj, quote, motivation), [dateObj, motivation, quote])
  const calendarModel = useMemo(() => buildDashboardMiniCalendarModel(calDate, eventMap, todayStr), [calDate, eventMap, todayStr])

  const navigate = (view: string) => {
    window.location.hash = `#${view}`
  }

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
    if (!taskId) {
      clearDragState()
      return
    }
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
    if (!personId) {
      clearDragState()
      return
    }
    void assignTaskToPerson(taskId, personId)
    clearDragState()
  }

  const handleDragOverTask = (event: DragEvent<HTMLDivElement>, taskId: string) => {
    const personId = draggingPersonId || readTransferData(event, 'application/x-118studio-person-id')
    if (!personId) return
    event.preventDefault()
    setDropOverTaskId(taskId)
  }

  const focusProj = topProjects[0] as LegacyProject | undefined
  const focusData = useMemo(() => getDashboardFocusData(focusProj, tasks, todayStr), [focusProj, tasks, todayStr])

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
                onOpenProjects={() => navigate('projects')}
              />
              <FocusSecondaryCards
                cards={focusCards.slice(1)}
                onOpenProjects={() => navigate('projects')}
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
          onNavigateTasks={() => navigate('tasks')}
          onTaskDragEnd={clearDragState}
          onTaskDragStart={handleTaskDragStart}
          tasks={poolRows}
        />
        <PeopleAssignmentPanel
          dragOverPersonId={dropOverPersonId}
          draggingTaskId={draggingTaskId}
          onDragLeavePerson={() => setDropOverPersonId(null)}
          onDragOverPerson={handleDragOverPerson}
          onNavigatePeople={() => navigate('people')}
          onDropToPerson={handleDropToPerson}
          onPersonDragEnd={clearDragState}
          onPersonDragStart={handlePersonDragStart}
          people={activePersonCards}
        />

        <DashboardMiniCalendar
          model={calendarModel}
          onNextMonth={() => setCalDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
          onOpenDate={openPlanner}
          onPrevMonth={() => setCalDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
        />
      </div>
    </div>
  )
}

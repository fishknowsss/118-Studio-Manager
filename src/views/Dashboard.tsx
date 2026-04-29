import { useEffect, useMemo, useState, useSyncExternalStore, type DragEvent } from 'react'
import { DashboardHeader } from '../features/dashboard/DashboardHeader'
import { DashboardMiniCalendar } from '../features/dashboard/DashboardMiniCalendar'
import { FocusPrimaryCard } from '../features/dashboard/FocusPrimaryCard'
import { FocusSecondaryCards } from '../features/dashboard/FocusSecondaryCards'
import { LeaveDialog } from '../features/dashboard/LeaveDialog'
import { PeopleAssignmentPanel } from '../features/dashboard/PeopleAssignmentPanel'
import {
  readDashboardPersonPanelState,
  subscribeDashboardPersonPanelState,
  writeDashboardPersonOrder,
  writeDashboardPersonPresence,
  type DashboardPersonStatusAction,
} from '../features/dashboard/personPanelState'
import { PersonDetailPanel } from '../features/dashboard/PersonDetailPanel'
import { ProjectDetailPanel } from '../features/dashboard/ProjectDetailPanel'
import { TaskPoolPanel } from '../features/dashboard/TaskPoolPanel'
import { ExpandPanel } from '../components/ui/ExpandPanel'
import { usePlanner } from '../features/planner/PlannerProvider'
import { TaskDialog } from '../features/tasks/TaskDialog'
import { assignTaskToPerson } from '../legacy/actions'
import {
  buildDashboardHeaderModel,
  buildDashboardFocusCards,
  buildDashboardMiniCalendarModel,
  buildQuickJumpSearchItems,
  buildPersonCardModels,
  buildEntityMaps,
  buildProjectEventSummaryMap,
  getActivePeople,
  getDashboardFocusData,
  getTaskPool,
  getTopProjects,
} from '../legacy/selectors'
import { type LegacyProject, type LegacyTask, getTaskAssigneeIds } from '../legacy/store'
import { useLegacyStoreSnapshot } from '../legacy/useLegacyStore'
import { formatLocalDateKey } from '../legacy/utils'
import { useTodayDate } from '../legacy/useTodayDate'
import { Tasks } from './Tasks'
import { People } from './People'
import { Calendar } from './Calendar'
import { Projects } from './Projects'
type Origin = { ox: number; oy: number }
type ExpandedPanel =
  | ({ type: 'tasks' }    & Origin)
  | ({ type: 'people' }   & Origin)
  | ({ type: 'calendar' } & Origin)
  | ({ type: 'projects' } & Origin)
  | ({ type: 'project'; projectId: string } & Origin)
  | ({ type: 'person'; personId: string } & Origin)
  | null

function getPanelTitle(panel: NonNullable<ExpandedPanel>, projects: LegacyProject[], people: { id: string; name?: string }[]): string {
  if (panel.type === 'tasks') return '全部任务'
  if (panel.type === 'people') return '团队成员'
  if (panel.type === 'calendar') return '项目日历'
  if (panel.type === 'projects') return '所有项目'
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
  const dashboardPersonPanelState = useSyncExternalStore(
    subscribeDashboardPersonPanelState,
    readDashboardPersonPanelState,
  )

  const [calDate, setCalDate] = useState(() => new Date())
  const [draggingPersonId, setDraggingPersonId] = useState<string | null>(null)
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null)
  const [dropOverPersonId, setDropOverPersonId] = useState<string | null>(null)
  const [dropOverTaskId, setDropOverTaskId] = useState<string | null>(null)
  const [expandedPanel, setExpandedPanel] = useState<ExpandedPanel>(null)
  const [editingTask, setEditingTask] = useState<LegacyTask | null | undefined>(undefined)
  const [searchQuery, setSearchQuery] = useState('')
  const dateObj = useTodayDate()
  const [leaveDialogDate, setLeaveDialogDate] = useState<string | null>(null)
  const todayStr = useMemo(() => formatLocalDateKey(dateObj), [dateObj])

  const entityMaps = useMemo(() => buildEntityMaps(projects, tasks, people), [people, projects, tasks])
  const topProjects = useMemo(() => getTopProjects(projects, 8, todayStr), [projects, todayStr])
  const focusCards = useMemo(() => buildDashboardFocusCards(projects, tasks, todayStr), [projects, tasks, todayStr])
  const taskPool = useMemo(() => getTaskPool(tasks), [tasks])
  const activePeople = useMemo(() => getActivePeople(people), [people])
  const leaveDates = useMemo(
    () => new Set(store.leaveRecords.map((r) => r.date)),
    [store.leaveRecords],
  )
  const leavePersonIdsToday = useMemo(
    () => new Set(store.leaveRecords.filter((r) => r.date === todayStr).map((r) => r.personId)),
    [store.leaveRecords, todayStr],
  )
  const activePersonCards = useMemo(
    () => buildPersonCardModels(activePeople, tasks, leavePersonIdsToday, dashboardPersonPanelState),
    [activePeople, tasks, leavePersonIdsToday, dashboardPersonPanelState],
  )
  const poolRows = useMemo(() => taskPool.map((task) => ({
    ...task,
    people: getTaskAssigneeIds(task).map((id) => entityMaps.peopleById[id]).filter(Boolean),
    project: task.projectId ? entityMaps.projectsById[task.projectId] : null,
  })), [entityMaps.peopleById, entityMaps.projectsById, taskPool])
  const eventMap = useMemo(() => buildProjectEventSummaryMap(projects, todayStr), [projects, todayStr])
  const headerModel = useMemo(() => buildDashboardHeaderModel(dateObj), [dateObj])
  const calendarModel = useMemo(
    () => buildDashboardMiniCalendarModel(calDate, eventMap, todayStr, leaveDates),
    [calDate, eventMap, todayStr, leaveDates],
  )

  const focusProj = topProjects[0] as LegacyProject | undefined
  const focusData = useMemo(() => getDashboardFocusData(focusProj, tasks, todayStr), [focusProj, tasks, todayStr])
  const primaryFocusTone = focusCards[0]?.urgencyKey || 'focus-neutral'
  const searchResults = useMemo(
    () => buildQuickJumpSearchItems(projects, tasks, people, searchQuery),
    [people, projects, searchQuery, tasks],
  )
  const expandedPanelType = expandedPanel?.type

  useEffect(() => {
    if (expandedPanelType) {
      document.body.dataset.easterPanel = expandedPanelType
      return () => {
        delete document.body.dataset.easterPanel
      }
    }

    delete document.body.dataset.easterPanel
    return undefined
  }, [expandedPanelType])

  const clearDragState = () => {
    setDraggingPersonId(null)
    setDraggingTaskId(null)
    setDropOverPersonId(null)
    setDropOverTaskId(null)
  }

  const readTransferData = (event: DragEvent<HTMLDivElement>, type: string) => {
    return event.dataTransfer?.getData(type) || ''
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

  const handleDropPersonToDate = (personId: string, dateKey: string) => {
    // 检查该人员当天是否已有请假记录，避免重复
    const exists = store.leaveRecords.some(
      (r) => r.personId === personId && r.date === dateKey,
    )
    if (!exists) {
      void store.saveLeaveRecord({ id: crypto.randomUUID(), personId, date: dateKey, reason: '' })
    }
    // 拖入时打开请假弹窗
    setLeaveDialogDate(dateKey)
    clearDragState()
  }

  const deleteTodayLeaveRecords = async (personId: string) => {
    const records = store.leaveRecords.filter((record) => record.personId === personId && record.date === todayStr)
    await Promise.all(records.map((record) => store.deleteLeaveRecord(record.id)))
  }

  const handlePersonStateChange = async (personId: string, nextState: DashboardPersonStatusAction) => {
    if (nextState === 'leave') {
      writeDashboardPersonPresence(personId, 'default')
      const hasLeaveToday = store.leaveRecords.some((record) => record.personId === personId && record.date === todayStr)
      if (!hasLeaveToday) {
        await store.saveLeaveRecord({ id: crypto.randomUUID(), personId, date: todayStr, reason: '' })
      }
      return
    }

    await deleteTodayLeaveRecords(personId)
    writeDashboardPersonPresence(personId, nextState === 'present' ? 'present' : 'default')
  }

  const handleOpenDate = (dateKey: string, ox: number, oy: number) => {
    openPlanner(dateKey, ox, oy)
  }

  const handleSearchSelect = (item: (typeof searchResults)[number]) => {
    const ox = window.innerWidth / 2
    const oy = window.innerHeight / 2

    if (item.kind === 'project') {
      setExpandedPanel({ type: 'project', projectId: item.id, ox, oy })
    } else if (item.kind === 'person') {
      setExpandedPanel({ type: 'person', personId: item.id, ox, oy })
    } else {
      const selectedTask = store.getTask(item.id) || null
      if (selectedTask) {
        setEditingTask(selectedTask)
      } else {
        setExpandedPanel({ type: 'tasks', ox, oy })
      }
    }

    setSearchQuery('')
  }

  const closePanel = () => setExpandedPanel(null)

  return (
    <div className="dashboard fade-in">
      <DashboardHeader
        model={headerModel}
        searchQuery={searchQuery}
        searchResults={searchResults}
        onSearchQueryChange={setSearchQuery}
        onSearchSelect={handleSearchSelect}
      />

      <div className="today-focus">
        <div
          className="focus-section-header"
          onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); setExpandedPanel({ type: 'projects', ox: r.left + r.width / 2, oy: r.top + r.height / 2 }) }}
        >
          <span className="focus-label">项目焦点</span>
          <span className="panel-action">展开全部</span>
        </div>
        <div className={`focus-cards${focusCards.length > 5 ? ' focus-cards--wide' : ''}`}>
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
                cards={focusCards.slice(1, 7)}
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
          draggingPersonId={draggingPersonId}
          dragOverPersonId={dropOverPersonId}
          draggingTaskId={draggingTaskId}
          onDragLeavePerson={() => setDropOverPersonId(null)}
          onDragOverPerson={handleDragOverPerson}
          onExpand={(ox, oy) => setExpandedPanel({ type: 'people', ox, oy })}
          onDropToPerson={handleDropToPerson}
          onPersonStateChange={(personId, nextState) => { void handlePersonStateChange(personId, nextState) }}
          onPersonDragEnd={clearDragState}
          onPersonDragStart={handlePersonDragStart}
          onPersonClick={(personId, ox, oy) => setExpandedPanel({ type: 'person', personId, ox, oy })}
          onReorderPeople={writeDashboardPersonOrder}
          people={activePersonCards}
        />
        <DashboardMiniCalendar
          draggingPersonId={draggingPersonId}
          model={calendarModel}
          onDropPersonToDate={handleDropPersonToDate}
          onExpand={(ox, oy) => setExpandedPanel({ type: 'calendar', ox, oy })}
          onNextMonth={() => setCalDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
          onOpenDate={handleOpenDate}
          onPrevMonth={() => setCalDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
        />
      </div>

      {expandedPanel ? (
        <ExpandPanel
          title={getPanelTitle(expandedPanel, projects, people)}
          originX={expandedPanel.ox}
          originY={expandedPanel.oy}
          onClose={closePanel}
          variant={expandedPanel.type === 'calendar' ? 'wide' : 'default'}
          overlayClassName="expand-panel-overlay--easter-lite"
          boxClassName="expand-panel-box--easter-lite"
        >
          {expandedPanel.type === 'tasks' && <Tasks />}
          {expandedPanel.type === 'people' && <People />}
          {expandedPanel.type === 'calendar' && <Calendar />}
          {expandedPanel.type === 'projects' && <Projects />}
          {expandedPanel.type === 'project' && (
            <ProjectDetailPanel projectId={expandedPanel.projectId} />
          )}
          {expandedPanel.type === 'person' && (
            <PersonDetailPanel
              personId={expandedPanel.personId}
              personPanelState={dashboardPersonPanelState}
              onPersonStateChange={(personId, nextState) => { void handlePersonStateChange(personId, nextState) }}
            />
          )}
        </ExpandPanel>
      ) : null}

      {editingTask !== undefined ? (
        <TaskDialog
          task={editingTask}
          people={people}
          projects={projects}
          onClose={() => setEditingTask(undefined)}
        />
      ) : null}

      {leaveDialogDate ? (() => {
        const dialogRecords = store.leaveRecords.filter((r) => r.date === leaveDialogDate)
        const leavedPersonIds = new Set(dialogRecords.map((r) => r.personId))
        const available = activePeople
          .filter((p) => !leavedPersonIds.has(p.id))
          .map((p) => ({ id: p.id, name: p.name || '未命名成员' }))
        return (
          <LeaveDialog
            date={leaveDialogDate}
            leaveRecords={dialogRecords}
            peopleById={entityMaps.peopleById}
            availablePeople={available}
            onClose={() => setLeaveDialogDate(null)}
            onSave={(id, reason) => {
              const record = store.leaveRecords.find((r) => r.id === id)
              if (record) void store.saveLeaveRecord({ ...record, reason })
            }}
            onDelete={(id) => {
              void store.deleteLeaveRecord(id)
            }}
            onAdd={(personId) => {
              const exists = store.leaveRecords.some(
                (r) => r.personId === personId && r.date === leaveDialogDate,
              )
              if (!exists) {
                void store.saveLeaveRecord({ id: crypto.randomUUID(), personId, date: leaveDialogDate, reason: '' })
              }
            }}
          />
        )
      })() : null}
    </div>
  )
}

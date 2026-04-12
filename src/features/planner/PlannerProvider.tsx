/* eslint-disable react-refresh/only-export-components */

import { createContext, useContext, useMemo, useState, type DragEvent, type ReactNode } from 'react'
import { buildProjectEventSummaryMap, getActivePeople, getProjectEventsForDate } from '../../legacy/selectors'
import { store, type LegacyTask } from '../../legacy/store'
import { formatDateFull, today } from '../../legacy/utils'
import { useLegacyStoreSnapshot } from '../../legacy/useLegacyStore'
import { PlannerAssignedList } from './PlannerAssignedList'
import { PlannerBacklogList } from './PlannerBacklogList'
import { getAssignableTasks } from './plannerUtils'

type PlannerContextValue = {
  closePlanner: () => void
  openPlanner: (dateStr: string) => void
}

const PlannerContext = createContext<PlannerContextValue | null>(null)

export function PlannerProvider({ children }: { children: ReactNode }) {
  const [dateStr, setDateStr] = useState<string | null>(null)

  const value = useMemo<PlannerContextValue>(() => ({
    openPlanner(nextDateStr) {
      setDateStr(nextDateStr)
    },
    closePlanner() {
      setDateStr(null)
    },
  }), [])

  return (
    <PlannerContext.Provider value={value}>
      {children}
      <PlannerDrawer dateStr={dateStr} onClose={() => setDateStr(null)} />
    </PlannerContext.Provider>
  )
}

export function usePlanner() {
  const context = useContext(PlannerContext)
  if (!context) {
    throw new Error('usePlanner must be used inside PlannerProvider')
  }
  return context
}

function PlannerDrawer({ dateStr, onClose }: { dateStr: string | null; onClose: () => void }) {
  const storeSnapshot = useLegacyStoreSnapshot()
  const [dragOverPersonId, setDragOverPersonId] = useState<string | null>(null)

  if (!dateStr) return null

  const todayStr = today()
  const dateLabel = formatDateFull(dateStr)
  const activePeople = getActivePeople(storeSnapshot.people)
  const eventMap = buildProjectEventSummaryMap(storeSnapshot.projects)
  const backlogTasks = getAssignableTasks(storeSnapshot.tasks).map((task) => ({
    ...task,
    project: task.projectId ? storeSnapshot.getProject(task.projectId) : null,
  }))
  const events = getProjectEventsForDate(eventMap, dateStr)

  const handleAssignTask = (taskId: string, personId: string, targetDate: string) => {
    void assignTask(taskId, personId, targetDate)
  }

  const handleDropToPerson = (event: DragEvent<HTMLDivElement>, personId: string, targetDate: string) => {
    event.preventDefault()
    setDragOverPersonId(null)
    const taskId = event.dataTransfer.getData('text/task-id')
    if (!taskId) return
    void assignTask(taskId, personId, targetDate)
  }

  const handleDragOverPerson = (event: DragEvent<HTMLDivElement>, personId: string) => {
    event.preventDefault()
    setDragOverPersonId(personId)
  }

  const handleUnassignTask = (taskId: string) => {
    void unassignTask(taskId)
  }

  return (
    <div className="planner-panel is-open">
      <div className="planner-overlay" onClick={onClose} role="presentation" />
      <div className="planner-content" role="dialog" aria-modal="true" aria-label={dateLabel}>
        <div className="planner-header">
          <div>
            <div className="planner-date-big">{dateLabel}</div>
            <div className="planner-date-sub">{dateStr === todayStr ? '今天' : dateStr}</div>
          </div>
          <button className="btn btn-ghost btn-icon" type="button" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="planner-body">
          {events.length ? (
            <div className="planner-section">
              <div className="planner-section-title">关键节点</div>
              {events.map((event) => (
                <div key={`${event.type}-${event.label}`} className={`planner-event-row ${event.type}`}>
                  {event.label}
                </div>
              ))}
            </div>
          ) : null}

          <div className="planner-section">
            <div className="planner-section-title">当天人员安排</div>
            <PlannerAssignedList
              dateStr={dateStr}
              dragOverPersonId={dragOverPersonId}
              onDropToPerson={handleDropToPerson}
              onLeavePerson={() => setDragOverPersonId(null)}
              onOverPerson={handleDragOverPerson}
              onUnassignTask={handleUnassignTask}
              people={activePeople}
              tasks={storeSnapshot.tasks}
            />
          </div>

          <div className="planner-section">
            <div className="planner-section-title">可分配任务</div>
            <PlannerBacklogList
              activePeople={activePeople}
              dateStr={dateStr}
              onAssignTask={handleAssignTask}
              tasks={backlogTasks}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

async function assignTask(taskId: string, personId: string, dateStr: string) {
  const task = store.getTask(taskId)
  const person = store.getPerson(personId)
  if (!task || !person) return

  const updatedTask: LegacyTask = {
    ...task,
    assigneeId: personId,
    scheduledDate: dateStr,
    updatedAt: new Date().toISOString(),
  }

  await store.saveTask(updatedTask)
  await store.addLog(`安排任务「${task.title}」给 ${person.name} · ${dateStr}`)
}

async function unassignTask(taskId: string) {
  const task = store.getTask(taskId)
  if (!task) return

  const updatedTask: LegacyTask = {
    ...task,
    scheduledDate: null,
    updatedAt: new Date().toISOString(),
  }

  await store.saveTask(updatedTask)
  await store.addLog(`取消当天排期「${task.title}」`)
}

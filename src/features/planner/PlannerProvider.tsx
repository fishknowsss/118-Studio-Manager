/* eslint-disable react-refresh/only-export-components */

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { ExpandPanel } from '../../components/ui/ExpandPanel'
import { buildDatePlannerModel, buildProjectDeadlineToneMap, buildProjectEventSummaryMap, getActivePeople, getProjectEventsForDate, sortProjectsByDeadlineTone, type DatePlannerTaskModel } from '../../legacy/selectors'
import { type LegacyProject } from '../../legacy/store'
import { ddlLabel, formatDate, shiftLocalDateKey, parseLocalDateKey, weekdayLabel } from '../../legacy/utils'
import { useLegacyStoreSnapshot } from '../../legacy/useLegacyStore'
import { useTodayKey } from '../../legacy/useTodayDate'
import { LeaveDialog } from '../dashboard/LeaveDialog'

type PlannerContextValue = {
  closePlanner: () => void
  openPlanner: (dateStr: string, ox: number, oy: number) => void
}

type PlannerState = { dateStr: string; ox: number; oy: number }

const PlannerContext = createContext<PlannerContextValue | null>(null)

export function PlannerProvider({ children }: { children: ReactNode }) {
  const [plannerState, setPlannerState] = useState<PlannerState | null>(null)

  const value = useMemo<PlannerContextValue>(() => ({
    openPlanner(dateStr, ox, oy) {
      setPlannerState({ dateStr, ox, oy })
    },
    closePlanner() {
      setPlannerState(null)
    },
  }), [])

  return (
    <PlannerContext.Provider value={value}>
      {children}
      {plannerState ? (
        <PlannerDrawer
          dateStr={plannerState.dateStr}
          originX={plannerState.ox}
          originY={plannerState.oy}
          onClose={() => setPlannerState(null)}
        />
      ) : null}
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

function PlannerDrawer({
  dateStr,
  originX,
  originY,
  onClose,
}: {
  dateStr: string
  originX: number
  originY: number
  onClose: () => void
}) {
  const storeSnapshot = useLegacyStoreSnapshot()
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false)
  const todayStr = useTodayKey()

  const dateLabel = `${formatDate(dateStr)} ${weekdayLabel(dateStr)}`
  const activePeople = getActivePeople(storeSnapshot.people)
  const eventMap = buildProjectEventSummaryMap(storeSnapshot.projects, todayStr)
  const events = getProjectEventsForDate(eventMap, dateStr)

  const plannerModel = useMemo(
    () => buildDatePlannerModel(
      dateStr,
      storeSnapshot.projects,
      storeSnapshot.tasks,
      storeSnapshot.people,
      storeSnapshot.leaveRecords,
      dateStr,
    ),
    [dateStr, storeSnapshot],
  )

  // Upcoming DDL projects within 14 days from selected date
  const upcomingDdlProjects = useMemo(() => {
    const windowEnd = shiftLocalDateKey(parseLocalDateKey(dateStr) ?? new Date(), 14)
    const filteredProjects = storeSnapshot.projects
      .filter((p): p is LegacyProject & { ddl: string } =>
        p.status !== 'completed' &&
        p.status !== 'cancelled' &&
        !!p.ddl &&
        p.ddl >= dateStr &&
        p.ddl <= windowEnd,
      )
    return sortProjectsByDeadlineTone(filteredProjects, dateStr)
      .slice(0, 6)
  }, [storeSnapshot.projects, dateStr])
  const upcomingProjectToneMap = useMemo(
    () => buildProjectDeadlineToneMap(upcomingDdlProjects, dateStr),
    [dateStr, upcomingDdlProjects],
  )

  return (
    <ExpandPanel
      variant="slim"
      title={dateLabel}
      originX={originX}
      originY={originY}
      onClose={onClose}
    >
      <div className="planner-body">
        <div className="planner-date-sub-row">
          {dateStr === todayStr ? '今天 · ' : ''}{dateStr}
        </div>

        {/* 当日摘要 */}
        <div className="planner-stats-row">
          <div className="planner-stat">
            <span className="planner-stat-num">{plannerModel.summary.taskCount}</span>
            <span className="planner-stat-label">当天任务</span>
          </div>
          <div className="planner-stat">
            <span className={`planner-stat-num${plannerModel.summary.dueCount > 0 ? ' warn' : ''}`}>{plannerModel.summary.dueCount}</span>
            <span className="planner-stat-label">今日截止</span>
          </div>
          <div className="planner-stat">
            <span className="planner-stat-num">{plannerModel.summary.totalHours}</span>
            <span className="planner-stat-label">预计工时</span>
          </div>
          <div className="planner-stat">
            <span className="planner-stat-num">{plannerModel.availablePeopleCount}</span>
            <span className="planner-stat-label">可用成员</span>
          </div>
        </div>

        {plannerModel.urgentTasks.length > 0 ? (
          <div className="planner-section">
            <div className="planner-section-title">最紧迫</div>
            {plannerModel.urgentTasks.map((task) => <PlannerTaskRow key={task.id} task={task} strong />)}
          </div>
        ) : null}

        {/* 关键节点 */}
        {events.length ? (
          <div className="planner-section">
            <div className="planner-section-title">关键节点</div>
            {events.map((event) => (
              <div key={`${event.type}-${event.label}`} className={`planner-event-row ${event.type} ${event.toneKey || ''}`}>
                {event.label}
              </div>
            ))}
          </div>
        ) : null}

        {/* 即将截止项目 */}
        {upcomingDdlProjects.length > 0 ? (
          <div className="planner-section">
            <div className="planner-section-title">即将截止（14天内）</div>
            {upcomingDdlProjects.map((proj) => (
              <div key={proj.id} className={`planner-ddl-card ${upcomingProjectToneMap[proj.id] || 'focus-neutral'}`}>
                <span className="planner-ddl-name">{proj.name}</span>
                <div className="planner-ddl-meta">
                  <span className="planner-ddl-date">{formatDate(proj.ddl)}</span>
                  <span>{ddlLabel(proj.ddl ?? null, proj.status || 'active')}</span>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {/* 今日任务 */}
        <div className="planner-section">
          <div className="planner-section-title">当天任务</div>
          {plannerModel.tasks.length === 0 ? (
            <div className="planner-empty-note">把任务拖到这天，或新建任务</div>
          ) : (
            plannerModel.tasks.map((task) => <PlannerTaskRow key={task.id} task={task} />)
          )}
        </div>

        {/* 请假信息 */}
        {(() => {
          const leaveRecords = storeSnapshot.leaveRecords.filter((r) => r.date === dateStr)
          if (leaveRecords.length === 0) return null
          const peopleById = Object.fromEntries(storeSnapshot.people.map((p) => [p.id, p]))
          return (
            <div className="planner-section">
              <div className="planner-section-title planner-leave-title">
                <span className="planner-leave-badge-inline">假</span>
                请假成员
                <button
                  className="planner-leave-edit-btn"
                  onClick={() => setLeaveDialogOpen(true)}
                  title="编辑请假记录"
                >
                  编辑
                </button>
              </div>
              {leaveRecords.map((r) => (
                <div key={r.id} className="planner-leave-row">
                  <span className="planner-leave-name">{peopleById[r.personId]?.name ?? '未知成员'}</span>
                  {r.reason ? <span className="planner-leave-reason">{r.reason}</span> : null}
                </div>
              ))}
              {leaveDialogOpen ? (() => {
                const leavedIds = new Set(leaveRecords.map((r) => r.personId))
                const available = activePeople
                  .filter((p) => !leavedIds.has(p.id))
                  .map((p) => ({ id: p.id, name: p.name || '未命名成员' }))
                return (
                  <LeaveDialog
                    date={dateStr}
                    leaveRecords={leaveRecords}
                    peopleById={peopleById}
                    availablePeople={available}
                    onClose={() => setLeaveDialogOpen(false)}
                    onSave={(id, reason) => {
                      const record = storeSnapshot.leaveRecords.find((r) => r.id === id)
                      if (record) void storeSnapshot.saveLeaveRecord({ ...record, reason })
                    }}
                    onDelete={(id) => {
                      void storeSnapshot.deleteLeaveRecord(id)
                    }}
                    onAdd={(personId) => {
                      const exists = storeSnapshot.leaveRecords.some(
                        (r) => r.personId === personId && r.date === dateStr,
                      )
                      if (!exists) {
                        void storeSnapshot.saveLeaveRecord({ id: crypto.randomUUID(), personId, date: dateStr, reason: '' })
                      }
                    }}
                  />
                )
              })() : null}
            </div>
          )
        })()}
      </div>
    </ExpandPanel>
  )
}

function PlannerTaskRow({ task, strong = false }: { task: DatePlannerTaskModel; strong?: boolean }) {
  const assigneeText = task.assigneeNames.length > 0 ? `@${task.assigneeNames.slice(0, 2).join('、')}` : '未分配'
  const deadlineText = task.isOverdue
    ? '已逾期'
    : task.isDueToday
      ? '今天截止'
      : task.dueInDays === null
        ? '未设截止'
        : `${task.dueInDays}天后截止`

  return (
    <div className={`planner-due-row ${strong ? 'is-urgent' : ''}`}>
      <div className={`task-check${task.statusKey === 'done' ? ' done' : task.statusKey === 'in-progress' ? ' in-progress' : ''}`} />
      <div className="planner-due-info">
        <span className="planner-due-title">{task.title}</span>
        <div className="planner-due-meta">
          <span className="planner-task-project">{task.projectName}</span>
          <span className={task.assigneeNames.length > 0 ? 'planner-due-assignee' : 'planner-due-unassigned'}>{assigneeText}</span>
          <span className="task-status-chip">{task.statusLabel}</span>
          <span className={`planner-date-chip ${task.isDueToday || task.isOverdue ? 'warn' : ''}`}>{deadlineText}</span>
          {task.estimatedHours ? <span className="planner-date-chip">{task.estimatedHours}h</span> : null}
          {task.dateText ? <span className="planner-date-chip">{task.dateText}</span> : null}
        </div>
      </div>
    </div>
  )
}

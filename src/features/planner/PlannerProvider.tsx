/* eslint-disable react-refresh/only-export-components */

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { ExpandPanel } from '../../components/ui/ExpandPanel'
import { buildProjectDeadlineToneMap, buildProjectEventSummaryMap, getActivePeople, getProjectEventsForDate, sortProjectsByDeadlineTone } from '../../legacy/selectors'
import { type LegacyProject, getTaskAssigneeIds } from '../../legacy/store'
import { ddlLabel, formatDateFull, formatDate, shiftLocalDateKey, parseLocalDateKey, today, STATUS_LABELS } from '../../legacy/utils'
import { useLegacyStoreSnapshot } from '../../legacy/useLegacyStore'
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

  const todayStr = today()
  const dateLabel = formatDateFull(dateStr)
  const activePeople = getActivePeople(storeSnapshot.people)
  const eventMap = buildProjectEventSummaryMap(storeSnapshot.projects)
  const events = getProjectEventsForDate(eventMap, dateStr)

  // Tasks scheduled for this day, enriched with project + assignee
  const todayTasks = useMemo(() =>
    storeSnapshot.tasks
      .filter((t) => t.scheduledDate === dateStr)
      .map((t) => ({
        ...t,
        project: t.projectId ? storeSnapshot.getProject(t.projectId) : null,
        assignee: getTaskAssigneeIds(t).length > 0 ? storeSnapshot.getPerson(getTaskAssigneeIds(t)[0]) : null,
      })),
    [storeSnapshot, dateStr],
  )

  // Tasks due on this day (endDate) that aren't done
  const dueTodayTasks = useMemo(() =>
    storeSnapshot.tasks
      .filter((t) => t.endDate === dateStr && t.status !== 'done')
      .map((t) => ({
        ...t,
        project: t.projectId ? storeSnapshot.getProject(t.projectId) : null,
        assignee: getTaskAssigneeIds(t).length > 0 ? storeSnapshot.getPerson(getTaskAssigneeIds(t)[0]) : null,
      })),
    [storeSnapshot, dateStr],
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
            <span className="planner-stat-num">{todayTasks.length}</span>
            <span className="planner-stat-label">已排任务</span>
          </div>
          <div className="planner-stat">
            <span className={`planner-stat-num${dueTodayTasks.length > 0 ? ' warn' : ''}`}>{dueTodayTasks.length}</span>
            <span className="planner-stat-label">今日截止</span>
          </div>
          <div className="planner-stat">
            <span className="planner-stat-num">{activePeople.length}</span>
            <span className="planner-stat-label">可用成员</span>
          </div>
          <div className="planner-stat">
            <span className="planner-stat-num">{upcomingDdlProjects.length}</span>
            <span className="planner-stat-label">临近截止</span>
          </div>
        </div>

        {/* 今日截止任务 */}
        {dueTodayTasks.length > 0 ? (
          <div className="planner-section">
            <div className="planner-section-title">今日截止</div>
            {dueTodayTasks.map((task) => (
              <div key={task.id} className="planner-due-row">
                <div className={`task-check${task.status === 'in-progress' ? ' in-progress' : ''}`} />
                <div className="planner-due-info">
                  <span className="planner-due-title">{task.title}</span>
                  <div className="planner-due-meta">
                    {task.project ? <span className="planner-task-project">{task.project.name}</span> : null}
                    {task.assignee
                      ? <span className="planner-due-assignee">@{task.assignee.name}</span>
                      : <span className="planner-due-unassigned">未分配</span>}
                    <span className="task-status-chip">{STATUS_LABELS[task.status || 'todo'] ?? task.status}</span>
                  </div>
                </div>
              </div>
            ))}
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
          <div className="planner-section-title">今日任务</div>
          {todayTasks.length === 0 ? (
            <div className="text-muted text-sm">当天暂无排期任务</div>
          ) : (
            todayTasks.map((task) => (
              <div key={task.id} className="planner-due-row">
                <div className={`task-check${task.status === 'done' ? ' done' : task.status === 'in-progress' ? ' in-progress' : ''}`} />
                <div className="planner-due-info">
                  <span className="planner-due-title">{task.title}</span>
                  <div className="planner-due-meta">
                    {task.project ? <span className="planner-task-project">{task.project.name}</span> : null}
                    {task.assignee
                      ? <span className="planner-due-assignee">@{task.assignee.name}</span>
                      : <span className="planner-due-unassigned">未分配</span>}
                    <span className="task-status-chip">{STATUS_LABELS[task.status || 'todo'] ?? task.status}</span>
                  </div>
                </div>
              </div>
            ))
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
              {leaveDialogOpen ? (
                <LeaveDialog
                  date={dateStr}
                  leaveRecords={leaveRecords}
                  peopleById={peopleById}
                  onClose={() => setLeaveDialogOpen(false)}
                  onSave={(id, reason) => {
                    const record = storeSnapshot.leaveRecords.find((r) => r.id === id)
                    if (record) void storeSnapshot.saveLeaveRecord({ ...record, reason })
                  }}
                  onDelete={(id) => {
                    void storeSnapshot.deleteLeaveRecord(id)
                    const remaining = storeSnapshot.leaveRecords.filter((r) => r.date === dateStr && r.id !== id)
                    if (remaining.length === 0) setLeaveDialogOpen(false)
                  }}
                />
              ) : null}
            </div>
          )
        })()}
      </div>
    </ExpandPanel>
  )
}

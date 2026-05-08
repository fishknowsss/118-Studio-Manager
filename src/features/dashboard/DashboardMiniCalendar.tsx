import { useState, type DragEvent, type MouseEvent } from 'react'
import type { DashboardMiniCalendarModel } from '../../legacy/selectors'

export function DashboardMiniCalendar({
  draggingPersonId,
  draggingTaskId,
  model,
  onDropPersonToDate,
  onDropTaskToDate,
  onExpand,
  onNextMonth,
  onOpenDate,
  onPrevMonth,
  onResetToToday,
}: {
  draggingPersonId: string | null
  draggingTaskId: string | null
  model: DashboardMiniCalendarModel
  onDropPersonToDate: (personId: string, dateKey: string) => void
  onDropTaskToDate: (taskId: string, dateKey: string) => void
  onExpand: (x: number, y: number) => void
  onNextMonth: () => void
  onOpenDate: (dateKey: string, ox: number, oy: number) => void
  onPrevMonth: () => void
  onResetToToday: () => void
}) {
  const [dragOverDate, setDragOverDate] = useState<{ dateKey: string; kind: 'leave' | 'task' } | null>(null)

  const handleDragOver = (e: DragEvent<HTMLDivElement>, dateKey: string) => {
    const hasPerson = Boolean(draggingPersonId) || e.dataTransfer.types.includes('application/x-118studio-person-id')
    const hasTask = Boolean(draggingTaskId) || e.dataTransfer.types.includes('application/x-118studio-task-id') || e.dataTransfer.types.includes('text/task-id')
    if (!hasPerson && !hasTask) return
    e.preventDefault()
    setDragOverDate({ dateKey, kind: hasTask ? 'task' : 'leave' })
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    // only clear if truly leaving the cell (not entering a child)
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverDate(null)
    }
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>, dateKey: string) => {
    e.preventDefault()
    setDragOverDate(null)
    const taskId = draggingTaskId || e.dataTransfer.getData('application/x-118studio-task-id') || e.dataTransfer.getData('text/task-id')
    if (taskId) {
      onDropTaskToDate(taskId, dateKey)
      return
    }
    const personId = draggingPersonId || e.dataTransfer.getData('application/x-118studio-person-id')
    if (!personId) return
    onDropPersonToDate(personId, dateKey)
  }

  const currentMonthKey = model.days.find((d) => !d.isOtherMonth)?.dateKey.slice(0, 7) ?? ''
  const formatRomanCount = (count: number) => {
    if (count <= 0) return ''
    if (count === 1) return 'Ⅰ'
    if (count === 2) return 'Ⅱ'
    if (count === 3) return 'Ⅲ'
    if (count === 4) return 'Ⅳ'
    if (count === 5) return 'Ⅴ'
    return 'Ⅵ+'
  }
  const getRomanToneClass = (count: number) => {
    if (count <= 1) return 'task-roman-1'
    if (count === 2) return 'task-roman-2'
    if (count === 3) return 'task-roman-3'
    if (count === 4) return 'task-roman-4'
    if (count === 5) return 'task-roman-5'
    return 'task-roman-6'
  }

  const handleDayClick = (day: (typeof model.days)[number], e: MouseEvent<HTMLDivElement>) => {
    if (day.isOtherMonth && currentMonthKey) {
      const clickedMonthKey = day.dateKey.slice(0, 7)
      if (clickedMonthKey < currentMonthKey) onPrevMonth()
      else onNextMonth()
      return
    }
    const r = e.currentTarget.getBoundingClientRect()
    onOpenDate(day.dateKey, r.left + r.width / 2, r.top + r.height / 2)
  }

  return (
    <div className="dash-right">
      <div
        className="panel-header panel-header--expandable"
        onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); onExpand(r.left + r.width / 2, r.top + r.height / 2) }}
      >
        <span className="panel-title">{model.title}</span>
        <span className="panel-action">展开全部</span>
      </div>
      <div className="mini-cal-grid-wrap">
      <div className="mini-cal-grid">
        {model.weekdays.map((day) => (
          <div key={day} className="mini-cal-dow">{day}</div>
        ))}
        {model.days.map((day) => {
          const classes = [
            'mini-cal-day',
            day.isToday ? 'today' : '',
            day.isOtherMonth ? 'other-month' : '',
            day.hasEvents ? 'has-events' : '',
            day.hasDeadline ? 'has-deadline' : '',
            day.deadlineKind ? `deadline-${day.deadlineKind}` : '',
            day.deadlineTone || '',
            !day.isOtherMonth && day.taskCount > 0 ? getRomanToneClass(day.taskCount) : '',
            dragOverDate?.dateKey === day.dateKey && dragOverDate.kind === 'leave' ? 'leave-drop-target' : '',
            dragOverDate?.dateKey === day.dateKey && dragOverDate.kind === 'task' ? 'task-drop-target' : '',
          ].filter(Boolean).join(' ')

          return (
            <div
              key={day.dateKey}
              className={classes}
              onClick={(e) => handleDayClick(day, e)}
              onDragOver={(e) => handleDragOver(e, day.dateKey)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, day.dateKey)}
            >
              {!day.isOtherMonth && (day.deadlineKind === 'task' || day.deadlineKind === 'both') ? <span className="mini-cal-task-deadline-mark" /> : null}
              <span className="mini-cal-num">{day.dayOfMonth}</span>
              {!day.isOtherMonth && day.taskCount > 0 && <span className="mini-cal-task-count">{formatRomanCount(day.taskCount)}</span>}
              {!day.isOtherMonth && day.hasLeave && <span className="mini-cal-leave-badge">假</span>}
            </div>
          )
        })}
      </div>
      </div>
      <div className="mini-cal-footer">
        <div className="cal-legend">
          <div className="cal-legend-item">
            <span className="cal-legend-roman">Ⅰ</span>
            任务数
          </div>
          <div className="cal-legend-item">
            <span className="cal-legend-frame" />
            截止
          </div>
          <div className="cal-legend-item">
            <span className="cal-legend-leave">假</span>
            请假
          </div>
        </div>
        <div className="mini-cal-nav" aria-label="切换月份">
          <button className="mini-cal-btn" title="回到今日" type="button" onClick={onResetToToday}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12a7 7 0 1 1-2.05-4.95" />
              <path d="M19 5v5h-5" />
            </svg>
          </button>
          <button className="mini-cal-btn" title="上月" type="button" onClick={onPrevMonth}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <button className="mini-cal-btn" title="下月" type="button" onClick={onNextMonth}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
          </button>
        </div>
      </div>
    </div>
  )
}

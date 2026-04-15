import { useState, type DragEvent } from 'react'
import type { DashboardMiniCalendarModel } from '../../legacy/selectors'

export function DashboardMiniCalendar({
  draggingPersonId,
  model,
  onDropPersonToDate,
  onExpand,
  onNextMonth,
  onOpenDate,
  onPrevMonth,
}: {
  draggingPersonId: string | null
  model: DashboardMiniCalendarModel
  onDropPersonToDate: (personId: string, dateKey: string) => void
  onExpand: (x: number, y: number) => void
  onNextMonth: () => void
  onOpenDate: (dateKey: string, ox: number, oy: number) => void
  onPrevMonth: () => void
}) {
  const [dragOverDate, setDragOverDate] = useState<string | null>(null)

  const handleDragOver = (e: DragEvent<HTMLDivElement>, dateKey: string) => {
    if (!draggingPersonId && !e.dataTransfer.types.includes('application/x-118studio-person-id')) return
    e.preventDefault()
    setDragOverDate(dateKey)
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
    const personId = draggingPersonId || e.dataTransfer.getData('application/x-118studio-person-id')
    if (!personId) return
    onDropPersonToDate(personId, dateKey)
  }

  return (
    <div className="dash-right">
      <div className="mini-cal-header">
        <span className="mini-cal-title" style={{ cursor: 'pointer' }} onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); onExpand(r.left + r.width / 2, r.top + r.height / 2) }}>{model.title}</span>
        <div className="mini-cal-nav">
          <button className="mini-cal-expand-btn" title="展开日历" type="button" onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); onExpand(r.left + r.width / 2, r.top + r.height / 2) }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
            </svg>
          </button>
          <button className="mini-cal-btn" title="上月" onClick={onPrevMonth}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <button className="mini-cal-btn" title="下月" onClick={onNextMonth}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
          </button>
        </div>
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
            day.markerKind === 'ddl' ? 'has-ddl' : '',
            day.markerKind === 'milestone' ? 'has-milestone' : '',
            day.markerTone || '',
            draggingPersonId && dragOverDate === day.dateKey ? 'leave-drop-target' : '',
          ].filter(Boolean).join(' ')

          return (
            <div
              key={day.dateKey}
              className={classes}
              onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); onOpenDate(day.dateKey, r.left + r.width / 2, r.top + r.height / 2) }}
              onDragOver={(e) => handleDragOver(e, day.dateKey)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, day.dateKey)}
            >
              {day.dayOfMonth}
              {day.hasLeave && <span className="mini-cal-leave-badge">假</span>}
            </div>
          )
        })}
      </div>
      </div>
      <div className="cal-legend">
        <div className="cal-legend-item">
          <div className="cal-legend-scale">
            <div className="cal-legend-dot focus-overdue"></div>
            <div className="cal-legend-dot focus-critical"></div>
            <div className="cal-legend-dot focus-strong"></div>
            <div className="cal-legend-dot focus-medium"></div>
            <div className="cal-legend-dot focus-calm"></div>
            <div className="cal-legend-dot focus-neutral"></div>
          </div>
          截止越近越暖
        </div>
        <div className="cal-legend-item">
          <div className="cal-legend-dot milestone"></div> 里程碑
        </div>
      </div>
    </div>
  )
}
